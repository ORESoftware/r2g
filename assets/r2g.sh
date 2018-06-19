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


export -f r2g;
export -f r2g_run;
export -f r2g_init;
export -f r2g_get_latest;
export -f r2g_open;
export -f r2g_home;
export -f r2g_project_root;
export -f r2g_view_log;
export -f r2g_uninstall;



