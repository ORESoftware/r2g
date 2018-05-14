#!/usr/bin/env bash

set -e;

if [[ "$r2g_skip_postinstall" == "yes" ]]; then
  echo "skipping r2g postinstall routine.";
  exit 0;
fi

export r2g_skip_postinstall="yes";

gmx_gray='\033[1;30m'
gmx_magenta='\033[1;35m'
gmx_cyan='\033[1;36m'
gmx_orange='\033[1;33m'
gmx_green='\033[1;32m'
gmx_no_color='\033[0m'

mkdir -p "$HOME/.r2g/temp/project" || {
  echo "could not create directory => '$HOME/.r2g/temp/project'...";
}


mkdir -p "$HOME/.oresoftware" && {

  (
    curl -H 'Cache-Control: no-cache' \
    "https://raw.githubusercontent.com/oresoftware/shell/master/shell.sh?$(date +%s)" \
    --output "$HOME/.oresoftware/shell.sh" 2> /dev/null || {
           echo "curl command failed to read shell.sh, now we should try wget..."
    }
  ) &

} || {

  echo "could not create '$HOME/.oresoftware'";
  exit 1;

}

mkdir -p "$HOME/.oresoftware/bash" && {
    cat r2g.sh > "$HOME/.oresoftware/bash/r2g.sh" || {
      echo "could not copy r2g shell file to user home.";
    }
}


mkdir -p "$HOME/.oresoftware/nodejs/node_modules" && {

  (

    [ ! -f "$HOME/.oresoftware/nodejs/package.json" ]  && {
        curl -H 'Cache-Control: no-cache' \
          "https://raw.githubusercontent.com/oresoftware/shell/master/assets/package.json?$(date +%s)" \
            --output "$HOME/.oresoftware/nodejs/package.json" 2> /dev/null || {
            echo "curl command failed to read package.json, now we should try wget..."
      }
    }

    (
      cd "$HOME/.oresoftware/nodejs" && npm install --silent r2g 2> /dev/null || {

        echo "could not install r2g in user home, trying again.";
        mkdir -p "$HOME/.oresoftware/nodejs/node_modules/r2g/dist" && {

        cat dist/axxel.js > "$HOME/.oresoftware/nodejs/node_modules/r2g/dist/axxel.js"
        cat dist/find-root.js > "$HOME/.oresoftware/nodejs/node_modules/r2g/dist/find-root.js"
        cat dist/smoke-tester.js > "$HOME/.oresoftware/nodejs/node_modules/r2g/dist/smoke-tester.js"
        }
      }
    )
  ) &

} || {

   echo "could not create a 'nodejs' dir in $HOME/oresoftware directory."
}

# wait for background processes to finish
wait;

if [[ -z "$(which r2g)" ]]; then
   npm install -g r2g
fi


echo -e "${gmx_green}r2g was installed successfully.${gmx_no_color}";
echo -e "Add the following line to your .bashrc/.bash_profile files:";
echo -e "${gmx_cyan} source \"\$HOME/.r2g/r2g.sh\"${gmx_no_color}";
echo " ";



