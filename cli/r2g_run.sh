#!/usr/bin/env bash

my_args=( "$@" );

r2g_match_arg(){
    # checks to see if the first arg, is among the remaining args
    # for example  ql_match_arg --json --json # yes
    first_item="$1"; shift;
    for var in "$@"; do
        if [[ "$var" == "$first_item" ]]; then
          echo "yes";
          return 0;
        fi
    done
    return 1;
}

r2g_keep_temp=$(r2g_match_arg "--keep" "${my_args[@]}");
r2g_multi_temp=$(r2g_match_arg "--multi" "${my_args[@]}");

r2g_multi="";

if [[ "$r2g_multi_temp" || "$r2g_keep_temp" ]]; then
   r2g_multi="yes"
fi

exit_code="";

r2g_gray='\033[1;30m'
r2g_magenta='\033[1;35m'
r2g_cyan='\033[1;36m'
r2g_orange='\033[1;33m'
r2g_yellow='\033[1;33m'
r2g_green='\033[1;32m'
r2g_no_color='\033[0m'

rm -rf "$HOME/.r2g/logs";
mkdir -p "$HOME/.r2g/logs"
mkdir -p "$HOME/.r2g/temp/project"

if [[ -z "$r2g_multi" ]]; then
    rm -rf "$HOME/.r2g/temp/project";
else
   echo "We are keeping the previously installed modules because '--keep' / '--multi' was used.";
fi

my_cwd="$PWD";

if [[ ! -f package.json ]]; then
   echo "Could not find a package.json file in your current working directory.";
   my_cwd="$(r2g_find_root)"
   if [[ -z "$my_cwd" ]]; then
     echo -e "${r2g_magenta}You are not within an NPM project.${r2g_no_color}";
     exit 1;
   fi
fi

cd "$my_cwd";

result="$(npm pack)"
if [[ -z "$result" ]]; then
    echo -e "${r2g_magenta}NPM pack command did not appear to yield a .tgz file.${r2g_no_color}";
    exit 1;
fi

tgz_path="$my_cwd/$result";
dest="$HOME/.r2g/temp/project"

echo "r2g will install this package: '$tgz_path'"
echo "to this project: '$dest'..."
mkdir -p "$dest"

copy_test="$(r2g_axxel package.json 'r2g.copy-tests')"
if [[ -z "$copy_test" ]]; then
    echo -e "${r2g_yellow}No NPM script at 'r2g.copy-tests' in your package.json file.${r2g_no_color}";
fi


run_test="$(r2g_axxel package.json 'r2g.run-tests')";

if [[ -z "$run_test" ]]; then
    echo -e "${r2g_yellow}No NPM script at 'r2g.run-tests' in your package.json file.${r2g_no_color}";
fi


(
  set -e;
  cd "$dest";
   [ ! -f "package.json" ]  && {
        curl -H 'Cache-Control: no-cache' \
          "https://raw.githubusercontent.com/oresoftware/shell/master/assets/package.json?$(date +%s)" \
            --output "$dest/package.json" 2>&1 || {
            echo "curl command failed to read package.json, now we should try wget..." >&2
      }
    } || {
    echo "warning: package.json file may have already existed in \$HOME/.r2g/temp/project";
  }


  r2g_copy_smoke_tester=yes r2g_smoke_tester  > smoke-tester.js

  echo "now running: 'npm install --production "${tgz_path}"'...";
  npm install --production "$tgz_path" # --silent >> "$HOME/.r2g/logs/r2g.log" 2>&1;
)

exit_code="$?"

if [[ "$exit_code" != "0" ]]; then
  echo "warning: npm install command failed, to see log, run: r2g_view_log";
  exit 1;
fi

(
  # run the user's copy command
  set -eo pipefail;
  if [[ ! -z "$copy_test" ]]; then
     echo "Copying r2g smoke test fixtures to '\$HOME/.r2g/temp/project'...";
     echo "$copy_test" | bash
  fi
)

exit_code="$?"

if [[ "$exit_code" != "0" ]]; then
  echo "warning: your copy command failed, to see log, run: r2g_view_log";
  exit 1;
fi



### see 1: https://unix.stackexchange.com/questions/442240/send-stderr-to-a-different-receiver-in-pipe
### see 2: https://unix.stackexchange.com/questions/442250/stderr-is-being-sent-down-pipeline-but-i-dont-want-that

(
    # run the tests
    cd "$dest";
    set -eo pipefail

    if [[ ! -z "$run_test" ]]; then
         echo "Running the following test command: '$run_test'...";
         echo "$run_test" | bash
    fi

    echo "now running smoke test (the r2gSmokeTest function in your index file)."
    node smoke-tester.js

    exit_code="$?"

    if [[ "$exit_code" == "0" ]]; then
       echo -e "${r2g_green}r2g tests passed.${r2g_no_color}"
       exit 0;
    fi

     echo -e "${r2g_magenta}===============================${r2g_no_color}"
     echo -e "${r2g_magenta} => Your r2g test(s) have failed.${r2g_no_color}"
     echo -e "${r2g_magenta}===============================${r2g_no_color}"
     exit 1;
)

exit_code="$?"

if [[ "$exit_code" != "0" ]]; then
  echo "warning: your test command failed, to see log, run: r2g_view_log";
  exit 1;
fi
