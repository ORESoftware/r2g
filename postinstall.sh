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

cat run.r2g.internal.sh > /usr/local/bin/r2g
cat run.r2g.internal.sh > "$(npm bin -g)/r2g"


if [[ -z "$(which prepend-with)" ]]; then
  npm install -g prepend;
fi

echo -e "${gmx_green}r2g was installed successfully.${gmx_no_color}";
echo -e "Add the following line to your .bashrc/.bash_profile files:";
echo -e "${gmx_cyan}. \"\$HOME/.r2g/r2g.sh\"${gmx_no_color}";
echo " ";



