#!/usr/bin/env bash

set -e;

gmx_gray='\033[1;30m'
gmx_magenta='\033[1;35m'
gmx_cyan='\033[1;36m'
gmx_orange='\033[1;33m'
gmx_green='\033[1;32m'
gmx_no_color='\033[0m'



mkdir -p "$HOME/.r2g/node"
mkdir -p "$HOME/.r2g/temp/project"

cat r2g.sh > "$HOME/.r2g/r2g.sh"
cat dist/axxel.js > "$HOME/.r2g/node/axxel.js"
cat dist/find-root.js > "$HOME/.r2g/node/find-root.js"
cat dist/smoke-tester.js > "$HOME/.r2g/node/smoke-tester.js"


r2g_bin="/usr/local/bin/r2g"
rm -rf "$r2g_bin" || { echo "could not remove '$r2g_bin'"; }

npm_bin="$(npm bin -g)/r2g"
rm -rf "$npm_bin" || { echo "could not remove '$npm_bin'"; }

cat run.r2g.sh > "$r2g_bin" &&  { chmod u+x "$r2g_bin"; } || {
    echo "could not write to '$r2g_bin'";
}

cat run.r2g.sh > "$npm_bin" && { chmod u+x "$npm_bin"; } || {
   echo "could not write to npm global bin dir";
}


#if [[ -z "$(which prepend)" ]]; then
#  npm install -g prepend;
#fi

echo -e "${gmx_green}r2g was installed successfully.${gmx_no_color}";
echo -e "Add the following line to your .bashrc/.bash_profile files:";
echo -e "${gmx_cyan}. \"\$HOME/.r2g/r2g.sh\"${gmx_no_color}";
echo " ";



