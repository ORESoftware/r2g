#!/usr/bin/env bash


all_export="yep";

if [[ ! "$SHELLOPTS" =~ "allexport" ]]; then
    all_export="nope";
    set -a;
fi


r2g_get_latest(){
  . "$BASH_SOURCE";  # source this file
}

r2g_get_home_dir(){
  echo "$HOME/.r2g"
}

r2g_get_temp_dir(){
  echo "$HOME/.r2g/temp"
}

r2g_get_project_dir(){
  echo "$HOME/.r2g/temp/project"
}

r2g_open_project_dir(){
  subl "$(r2g_get_project_dir)"
}

r2g_open_temp_dir(){
  subl "$(r2g_get_temp_dir)"
}

r2g_open_home_dir(){
  subl "$(r2g_get_home_dir)"
}

r2g_view_log(){
 open "$HOME/.r2g/logs/r2g.log"
}


r2g(){

  if ! type -f r2g &> /dev/null || ! which r2g &> /dev/null; then

    echo -e "Installing the 'r2g' NPM package globally..." >&2;

    npm i -s -g 'r2g' || {

      echo -e "Could not install the 'r2g' NPM package globally." >&2;
      echo -e "Check your user permissions to install global NPM packages." >&2;
      return 1;

    }

 fi

 command r2g "$@";

}


if [ "$all_export" == "nope" ]; then
  set +a;
fi


