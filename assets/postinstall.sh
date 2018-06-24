#!/usr/bin/env bash

set -e;

if [[ "$r2g_skip_postinstall" == "yes" ]]; then
  echo "skipping r2g postinstall routine.";
  exit 0;
fi

export r2g_skip_postinstall="yes";

if [[ "$oresoftware_local_dev" == "yes" ]]; then
    echo "Running the r2g postinstall script in oresoftware local development env."
fi


mkdir -p "$HOME/.r2g/temp/project" || {
  echo "could not create directory => '$HOME/.r2g/temp/project'...";
}


mkdir -p "$HOME/.oresoftware/bash" || {
  echo "could not create oresoftware/bash dir."
  exit 1;
}


cat assets/shell.sh > "$HOME/.oresoftware/bash/r2g.sh" || {
  echo "could not create oresoftware/bash/r2g.sh file."
  exit 1;
}


(

    shell_file="node_modules/@oresoftware/shell/assets/shell.sh";
    [ -f "$shell_file" ] && cat "$shell_file" > "$HOME/.oresoftware/shell.sh" && {
        echo "Successfully copied @oresoftware/shell/assets/shell.sh to $HOME/.oresoftware/shell.sh";
        exit 0;
    }

    shell_file="../shell/assets/shell.sh";
    [ -f "$shell_file" ] &&  cat "../shell/assets/shell.sh" > "$HOME/.oresoftware/shell.sh" && {
        echo "Successfully copied @oresoftware/shell/assets/shell.sh to $HOME/.oresoftware/shell.sh";
        exit 0;
    }

    curl -H 'Cache-Control: no-cache' \
         "https://raw.githubusercontent.com/oresoftware/shell/master/assets/shell.sh?$(date +%s)" \
          --output "$HOME/.oresoftware/shell.sh" 2> /dev/null || {
           echo "curl command failed to read shell.sh";
           exit 1;
    }
)



echo; echo -e "${r2g_green}r2g was installed successfully.${r2g_no_color}";
echo -e "Add the following line to your .bashrc/.bash_profile files:";
echo -e "${r2g_cyan} . \"\$HOME/.oresoftware/shell.sh\"${r2g_no_color}"; echo;



