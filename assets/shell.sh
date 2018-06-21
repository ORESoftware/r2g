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

 local loc="$(command -v r2g)";

 if [ -z "$loc" ]; then
    npm install -g "@oresoftware/r2g@latest" || {
      return 1;
    }
 fi

 command r2g "$@";
}

r2g_init(){

 local loc="$(command -v r2g_init)";

 if [ -z "$loc" ]; then
    npm install -g "@oresoftware/r2g@latest" || {
      return 1;
    }
 fi

 command r2g_init "$@";
}

r2g_run(){

 local loc="$(command -v r2g_run)";

 if [ -z "$loc" ]; then
    npm install -g "@oresoftware/r2g@latest" || {
      return 1;
    }
 fi

 command r2g_run "$@";
}


r2g_copy_package_json(){

  local dest="$1"
  local keep="$2"

  (
      set -e;
      cd "$dest";
      if [  -f "package.json" ] && [ -z "$keep" ]; then
         exit 0;
      fi


      curl -H 'Cache-Control: no-cache' \
              "https://raw.githubusercontent.com/oresoftware/shell/master/assets/package.json?$(date +%s)" \
                --output "$dest/package.json" 2>&1 || {
                echo "curl command failed to read package.json, now we should try wget..." >&2
      }
  )
}

r2g_copy_user_defined_test(){

    local dest="$1";

    (
        set -e;
        cd "$dest";
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

}



export -f r2g;
export -f r2g_run;
export -f r2g_init;
export -f r2g_get_latest;
export -f r2g_open;
export -f r2g_home;
export -f r2g_project_root;
export -f r2g_view_log;
export -f r2g_uninstall;



