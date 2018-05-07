#!/usr/bin/env bash

r2g_get_latest_source(){
  . "$HOME/.r2g/r2g.sh"
}

r2g(){


    local gmx_gray='\033[1;30m'
    local gmx_magenta='\033[1;35m'
    local gmx_cyan='\033[1;36m'
    local gmx_orange='\033[1;33m'
    local gmx_yellow='\033[1;33m'
    local gmx_green='\033[1;32m'
    local gmx_no_color='\033[0m'

    if [[ -z "$(which prepend)" ]]; then
      npm install -g prepend;
    fi


    mkdir -p "$HOME/.r2g/temp"
    rm -rf "$HOME/.r2g/temp/project";

    local my_cwd="$PWD";

    if [[ ! -f package.json ]]; then
       echo "Could not find a package.json file in your current working directory.";
       my_cwd="$(node "$HOME/.r2g/node/find-root.js")"
       if [[ -z "$my_cwd" ]]; then
         echo -e "${gmx_magenta}You are not within an NPM project.${gmx_no_color}";
         return 1;
       fi
    fi

    cd "$my_cwd";

    local result="$(npm pack)"
    if [[ -z "$result" ]]; then
        echo -e "${gmx_magenta}NPM pack command did not appear to yield a .tgz file.${gmx_no_color}";
        return 1;
    fi

    local tgz_path="$my_cwd/$result";
    local dest="$HOME/.r2g/temp/project"

    echo "r2g will install this package: '$tgz_path' to this project: '$dest'..."
    mkdir -p "$dest"

    local copy_test="$(node "$HOME/.r2g/node/axxel.js" package.json 'r2g.copy-tests')"
    if [[ -z "$copy_test" ]]; then
        echo -e "${gmx_yellow}No NPM script at 'r2g.copy-tests' in your package.json file.${gmx_no_color}";
#        return 1;
    fi

    local run_test="$(node "$HOME/.r2g/node/axxel.js" package.json 'r2g.run-tests')";
    if [[ -z "$run_test" ]]; then
        echo -e "${gmx_yellow}No NPM script at 'r2g.run-tests' in your package.json file.${gmx_no_color}";
#        return 1;
    fi

    (
#      set -e;
      cd "$dest";
      ( npm init --yes ) &> /dev/null || { echo "warning: package.json file already existed in \$HOME/.r2g/temp/project"; }
      cat "$HOME/.r2g/node/smoke-tester.js" > smoke-tester.js;
      echo "running npm install...in the following dir: $dest";
      mkdir node_modules;
      npm install "$tgz_path";

      if [[ ! -d node_modules ]]; then
          echo "warning: node_modules dir does not exist in path: $dest";
      fi
    )

    # run the user's copy command
    (
      set -o pipefail

#      echo "$copy_test" | bash 2>&1 | prepend "r2g-copy: " "yellow";
#      echo "$copy_test" | bash > >(prepend 'r2g-copying: ' 'yellow') 2> >(prepend 'r2g-copying: ' 'red'  >&2);

      if [[ ! -z "$copy_test" ]]; then
         echo "Copying r2g smoke test fixtures to '\$HOME/.r2g/temp/project'...";
         exec 3>&2; {  echo "$copy_test" | bash | prepend 'r2g-copying: ' 'cyan'; } 2>&1 1>&3 | prepend 'r2g-copying: ' 'magenta'
      fi

    )


   ### see 1: https://unix.stackexchange.com/questions/442240/send-stderr-to-a-different-receiver-in-pipe
   ### see 2: https://unix.stackexchange.com/questions/442250/stderr-is-being-sent-down-pipeline-but-i-dont-want-that
    (
        # run the tests
        cd "$dest";
        set -o pipefail
#        echo "$run_test" | bash > >(prepend 'r2g-test: ' 'yellow') 2> >(prepend 'r2g-test: ' 'red'  >&2);

        if [[ ! -z "$run_test" ]]; then
            exec 3>&2; {  echo "$run_test" | bash | prepend 'r2g-test: ' 'cyan'; } 2>&1 1>&3 | prepend 'r2g-test: ' 'magenta'
        else
            exec 3>&2; {   node smoke-tester.js | prepend 'r2g-test: ' 'cyan'; } 2>&1 1>&3 | prepend 'r2g-test: ' 'magenta'
        fi

        local exit_code="$?"

        if [[ "$exit_code" == "0" ]]; then
           echo -e "${gmx_green}r2g tests passed.${gmx_no_color}"
           return 0;
        fi

         echo -e "${gmx_magenta}===============================${gmx_no_color}"
         echo -e "${gmx_magenta} => Your r2g test(s) have failed.${gmx_no_color}"
         echo -e "${gmx_magenta}===============================${gmx_no_color}"
         return 1;
    )

}

