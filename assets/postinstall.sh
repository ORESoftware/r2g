#!/usr/bin/env bash

set -e;

if [[ "$r2g_skip_postinstall" == "yes" ]]; then
  echo "skipping r2g postinstall routine.";
  exit 0;
fi


export r2g_skip_postinstall="yes";
r2g_exec="r2g";

if [[ "$oresoftware_local_dev" == "yes" ]]; then
    echo "Running the r2g postinstall script in oresoftware local development env."
fi

r2g_gray='\033[1;30m'
r2g_magenta='\033[1;35m'
r2g_cyan='\033[1;36m'
r2g_orange='\033[1;33m'
r2g_green='\033[1;32m'
r2g_no_color='\033[0m'


mkdir -p "$HOME/.r2g/temp/project" || {
  echo "could not create directory => '$HOME/.r2g/temp/project'...";
}


mkdir -p "$HOME/.oresoftware/bash" && {
  cat assets/r2g.sh > "$HOME/.oresoftware/bash/r2g.sh"
}

cat "node_modules/@oresoftware/shell/assets/shell.sh" > "$HOME/.oresoftware/shell.sh" && {
  echo "Successfully copied @oresoftware/shell/assets/shell.sh to $HOME/.oresoftware/shell.sh";
} || {
  echo 'Could not copy @oresoftware/shell/assets/shell.sh to $HOME/.oresoftware/shell.sh';
}

echo -e "${r2g_green}r2g was installed successfully.${r2g_no_color}";
echo -e "Add the following line to your .bashrc/.bash_profile files:";
echo -e "${r2g_cyan} . \"\$HOME/.oresoftware/shell.sh\"${r2g_no_color}";
echo " ";



