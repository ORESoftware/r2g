#!/usr/bin/env bash


if [[ "$0" != *"bash"* ]]; then
  echo "$0 tried to source the r2g shell script."
fi

export r2g_source_home="$HOME/.oresoftware/nodejs/node_modules/r2g";

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

 local r2g_location="`command -v r2g`"

 if [ -z "$r2g_location" ]; then
    npm install -g r2g || {
      return 1;
    }
 fi

 command r2g "$@";

}


export -f r2g;
export -f r2g_get_latest;
export -f r2g_open;
export -f r2g_home;
export -f r2g_project_root;
export -f r2g_view_log;
export -f r2g_uninstall;



