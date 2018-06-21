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

if [[ -z "$r2g_multi" ]]; then
    rm -rf "$HOME/.r2g/temp/project";
else
   echo "We are keeping the previously installed modules because '--keep' / '--multi' was used.";
fi

dest="$HOME/.r2g/temp/project"
mkdir -p "$dest" || {
  echo "could not create temp/project directory.";
  exit 1;
}


(
    file="@oresoftware/read.json"
    file="https://raw.githubusercontent.com/oresoftware/tarballs/master/tgz/oresoftware/read.json.tgz?$(date +%s)";

    if [ -z "$(which read_json)" ]; then

      rm -rf "$(npm root -g)/@oresoftware/read.json";

      npm install -g "$file" || {
         echo "Could not install '$file'.";
         exit 1;
      }
    fi
) &


(
    file="residence"

    if [ -z "$(which residence_find_proj_root)" ]; then

      rm -rf "$(npm root -g)/residence";

      npm install -g "$file" || {
         echo "Could not install '$file'.";
         exit 1;
      }
    fi
) &


(
    file="@oresoftware/r2g"

    if [ -z "$(which r2g_copy_smoke_tester)" ]; then
      npm install -g "$file" || {
         echo "Could not install '$file'.";
         exit 1;
      }
    fi
) &


wait;


my_cwd="$PWD";

if [[ ! -f package.json ]]; then
   echo "Could not find a package.json file in your current working directory.";
   my_cwd="$(residence_find_proj_root)"
   if [[ -z "$my_cwd" ]]; then
     echo -e "${r2g_magenta}You are not within an NPM project.${r2g_no_color}";
     exit 1;
   fi
fi

cd "$my_cwd" || {
  echo "could not change directory to $my_cwd";
  exit 1;
}


(
    if [ ! -f ".r2g/smoke-test.js" ]; then
        echo "no user defined smoke-test.js in .r2g dir.";
        exit 0;
    fi

    echo "Copying user defined smoke test"
    cat ".r2g/smoke-test.js" > "$dest/user_defined_smoke_test" || {
      echo "could not copy user defined smoke test.";
      exit 1;
    }

    chmod u+x "$dest/user_defined_smoke_test";
)

exit_code="$?"
if [[ "$exit_code" != "0" ]]; then
  echo "warning: command failed.";
  exit 1;
fi


result="$(npm pack --loglevel=warn)"
if [[ -z "$result" ]]; then
    echo -e "${r2g_magenta}NPM pack command did not appear to yield a .tgz file.${r2g_no_color}";
    exit 1;
fi

tgz_path="$my_cwd/$result";
echo "r2g will install this package: '$tgz_path'"
echo "to this project: '$dest'..."
mkdir -p "$dest"

copy_test="$( read_json package.json 'r2g.copy-tests' --ignore-missing )"
if [[ -z "$copy_test" ]]; then
    echo -e "${r2g_yellow}No NPM script at 'r2g.copy-tests' in your package.json file.${r2g_no_color}";
fi


run_test="$( read_json package.json 'r2g.run-tests' --ignore-missing )";
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

  r2g_copy_smoke_tester  > smoke-tester.js

  cmd="npm install --loglevel=warn --cache-min 9999999 --production $tgz_path";
  echo "now running: '$cmd'...";
  echo "$cmd" | bash;

)

exit_code="$?"
if [[ "$exit_code" != "0" ]]; then
  echo "warning: npm install command failed, to see log, run: r2g_view_log";
  exit 1;
fi

(
  # run the user's copy command
  set -eo pipefail;
  if [[ -n "$copy_test" ]]; then
     echo "Copying r2g smoke test fixtures to '\$HOME/.r2g/temp/project'...";
     echo "$copy_test" | bash;
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
    cd "$dest";
    set -eo pipefail;

    if [[ -n "$run_test" ]]; then
         echo "Running the following test command: '$run_test'...";
         echo "$run_test" | bash
    fi
)

exit_code="$?"
if [[ "$exit_code" != "0" ]]; then
  echo "warning: your test command failed, to see log, run: r2g_view_log";
  exit 1;
fi


(
    # run the tests
    cd "$dest";
    set -eo pipefail

    echo "now running basic smoke test (smoke-tester.js)"
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




(
    # run the tests
    cd "$dest";
    set -eo pipefail;

    if [ ! -f user_defined_smoke_test ]; then
         echo "no user defined smoke test";
         exit 0;
    fi

    echo "now running the user defined smoke test...";
    ./user_defined_smoke_test
    exit_code="$?"

    if [[ "$exit_code" == "0" ]]; then
       echo -e "${r2g_green}r2g user defined smoke test passed.${r2g_no_color}"
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
