#!/usr/bin/env bash

echo "$0 is sourcing the r2g shell script."

r2g_get_latest(){
  . "$HOME/.oresoftware/bash/r2g.sh"
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

    echo -e "Installing the '@oresoftware/r2g' NPM package globally..." >&2;

    npm i -s -g 'r2g' || {

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

}

export -f r2g;
export -f r2g_get_latest;

export -f r2g_open_home_dir;
export -f r2g_open_temp_dir;
export -f r2g_open_project_dir;


export -f r2g_get_home_dir;
export -f r2g_get_project_dir;
export -f r2g_get_temp_dir;

export -f r2g_view_log;
export -f r2g_uninstall;
export -f r2g_copy_package_json;



