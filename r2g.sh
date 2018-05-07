#!/usr/bin/env bash

r2g(){

    set -e;

    local gmx_gray='\033[1;30m'
    local gmx_magenta='\033[1;35m'
    local gmx_cyan='\033[1;36m'
    local gmx_orange='\033[1;33m'
    local gmx_green='\033[1;32m'
    local gmx_no_color='\033[0m'


    mkdir -p "$HOME/.r2g/node"
    mkdir -p "$HOME/.r2g/temp"

    local my_cwd="$PWD";

    if [[ ! -f package.json ]]; then
       my_cwd="$(node "$HOME/.r2g/node/find-root.js")"
       if [[ -z "$my_cwd" ]]; then
         echo -e "${gmx_magenta}You are not within an NPM project.${gmx_no_color}";
         exit 1;
       fi

    fi

    cd "$my_cwd";

    local result="$(npm pack)"
    if [[ -z "$result" ]]; then
        echo -e "${gmx_magenta}NPM pack command did not appear to yield a .tgz file.${gmx_no_color}";
        exit 1;
    fi

    local tgz_path="$my_cwd/$result";
    mkdir -p "$HOME/.r2g/temp/project"
    local dest="$HOME/.r2g/temp/project"

    local copy_test="$(node "$HOME/.r2g/node/axxel.js" package.json 'scripts.r2g-copy-tests')"

    if [[ -z "$copy_test" ]]; then
        echo -e "${gmx_magenta}No NPM script named 'r2g-copy-tests' in your package.json file.${gmx_no_color}";
        exit 1;
    fi

    local run_test="$(node "$HOME/.r2g/node/axxel.js" package.json 'scripts.r2g-run-tests')";

    if [[ -z "$copy_test" ]]; then
        echo -e "${gmx_magenta}No NPM script named 'r2g-run-tests' in your package.json file.${gmx_no_color}";
        exit 1;
    fi

    (
      set -e;
      cd "$dest";
      ( npm init -f ) &> /dev/null;
      npm install --silent "$tgz_path";
    )

    # run the user's copy command
    echo "$copy_test" | bash;

    # run the tests
    cd "$dest";
    echo "$run_test" | bash && echo -e "${gmx_green}r2g tests passed.${gmx_no_color}" || {
      echo -e "${gmx_magenta}===============================${gmx_no_color}"
      echo -e "${gmx_magenta} => Your r2g test(s) have failed.${gmx_no_color}"
      echo -e "${gmx_magenta}===============================${gmx_no_color}"
    }
}

