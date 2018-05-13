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


mkdir -p "$HOME/.oresoftware/nodejs/node_modules" && {

    if [[ ! -f "$HOME/.oresoftware/nodejs/package.json" ]]; then
       cat "node_modules/@oresoftware/oresoftware.package.json/package.json" > "$HOME/.oresoftware/nodejs/package.json";
    fi

} || {

   echo "could not create a 'nodejs' dir in $HOME/oresoftware directory."
}


if [[ -z "$(which r2g)" ]]; then
   npm install -g r2g
fi

mkdir -p "$HOME/.r2g/temp/project"

cat r2g.sh > "$HOME/.r2g/r2g.sh"
cat dist/axxel.js > "$HOME/.r2g/node/axxel.js"
cat dist/find-root.js > "$HOME/.r2g/node/find-root.js"
cat dist/smoke-tester.js > "$HOME/.r2g/node/smoke-tester.js"


#if [[ -z "$(which prepend)" ]]; then
#  npm install -g prepend;
#fi

echo -e "${gmx_green}r2g was installed successfully.${gmx_no_color}";
echo -e "Add the following line to your .bashrc/.bash_profile files:";
echo -e "${gmx_cyan} source \"\$HOME/.r2g/r2g.sh\"${gmx_no_color}";
echo " ";



