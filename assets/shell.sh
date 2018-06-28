#!/usr/bin/env bash

echo "$0 is sourcing the r2g shell script."

r2g_get_latest(){
  . "$HOME/.oresoftware/bash/r2g.sh"
}

r2g_home(){
  echo "$HOME/.r2g"
}

r2g_project_root(){
  echo "$HOME/.r2g/temp/project"
}

r2g_uninstall(){
  npm uninstall -g r2g
  hash -d r2g
  rm -rf "$(which r2g)"
  hash -d r2g
  rm -rf "$(which r2g)"
  rm -rf "$(r2g_home)"
  rm -rf "$(type -P r2g)"
  hash -d r2g
}

r2g_delete(){
  hash -d "$(npm bin -g)/r2g"
  hash -d "/usr/local/bin/r2g"
  rm "$(npm bin -g)/r2g"
  rm "/usr/local/bin/r2g"
  hash -d r2g
}

r2g_open(){
  subl "$(r2g_project_root)"
}

r2g_view_log(){
 open "$HOME/.r2g/logs/r2g.log"
}


r2g(){

  if ! type -f r2g &> /dev/null || ! which r2g &> /dev/null; then

    echo -e "Installing the '@oresoftware/r2g' NPM package globally..." >&2;

    npm i -s -g '@oresoftware/r2g' || {

      echo -e "Could not install the '@oresoftware/r2g' NPM package globally." >&2;
      echo -e "Check your user permissions to install global NPM packages." >&2;
      return 1;

    }

 fi

 command r2g $@;

}



r2g_copy_package_json(){

  local dest="$1"
  local keep="$2"

  (
      set -e;

      if [  -f "package.json" ]; then
         echo >&2 "package.json file already exists here: $PWD";
         exit 0;
      fi


      echo >&2 "copying new package.json file to: $dest";

      curl -H 'Cache-Control: no-cache' \
              "https://raw.githubusercontent.com/oresoftware/shell/master/assets/package.json?$(date +%s)" \
                --output "$dest/package.json" 2>&1 || {
                echo "curl command failed to read package.json, now we should try wget..." >&2
      }
  )
}

r2g_copy_user_defined_tests(){

   local dest="$1"; # $HOME/.r2g/temp/project

    (
        set -e;

        if [ ! -f "$PWD/.r2g/smoke-test.js" ]; then
            echo "No user defined test at path .r2g/smoke-test.js.";
            exit 0;
        fi

        echo "Copying user defined smoke test"
        cat "$PWD/.r2g/smoke-test.js" > "$dest/user_defined_smoke_test" || {
          echo >&2  "could not copy user defined smoke test.";
          exit 1;
        }

        chmod u+x "$dest/user_defined_smoke_test";
    )

}


r2g_run_user_defined_tests(){

    (
        # run the tests
        set -o pipefail;

        if [ ! -f user_defined_smoke_test ]; then
             echo "No user defined smoke test";
             exit 0;
        fi

        echo "Now running the user defined smoke test...";
        ./user_defined_smoke_test

        if [[ "$?" == "0" ]]; then
           echo -e "${r2g_green}r2g user defined smoke test passed.${r2g_no_color}"
           exit 0;
        fi

         echo -e "${r2g_magenta}===============================${r2g_no_color}"
         echo -e "${r2g_magenta} => Your r2g test(s) have failed.${r2g_no_color}"
         echo -e "${r2g_magenta}===============================${r2g_no_color}"
         exit 1;
    )

}

export -f r2g;
export -f r2g_get_latest;
export -f r2g_open;
export -f r2g_home;
export -f r2g_project_root;
export -f r2g_view_log;
export -f r2g_uninstall;
export -f r2g_copy_package_json;
export -f r2g_copy_user_defined_tests;
export -f r2g_run_user_defined_tests;



