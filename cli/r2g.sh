#!/usr/bin/env bash


if [[ "$r2g_is_running" == "yes" ]]; then
   echo "Looks like r2g somehow launched an r2g child process. That is not allowed, exiting with 0.";
   exit 0;
fi

export r2g_is_running="yes";

export r2g_gray='\033[1;30m'
export r2g_magenta='\033[1;35m'
export r2g_cyan='\033[1;36m'
export r2g_orange='\033[1;33m'
export r2g_yellow='\033[1;33m'
export r2g_green='\033[1;32m'
export r2g_no_color='\033[0m'

my_args=("$@");
cmd="$1";
shift 1;

project_root="";

if [[ "$(uname -s)" == "Darwin" ]]; then
    project_root="$(dirname $(dirname $("$HOME/.oresoftware/bin/realpath" $0)))";

else
    project_root="$(dirname $(dirname $(realpath $0)))";
fi

commands="$project_root/dist/commands"

r2g_match_arg(){
    # checks to see if the first arg, is among the remaining args
    # for example  ql_match_arg --json --json # yes
    first_item="$1"; shift;
    for var in "$@"; do
        if [[ "$var" == "$first_item" ]]; then
          return 0;
        fi
    done
    return 1;
}

export -f r2g_match_arg;
export FORCE_COLOR=1;


r2g_stdout() {
    # REPLY is a build-in, see:
    while read; do echo -e "${r2g_gray}r2g:${r2g_no_color} $REPLY"; done
}

r2g_stdout() {
    # REPLY is a build-in, see:
    while read; do echo -e "${r2g_gray}r2g:${r2g_no_color} $REPLY"; done
}

r2g_stderr() {
    while read; do echo -e "${r2g_magenta}r2g:${r2g_no_color} $REPLY"; done
}

export -f r2g_stdout;
export -f r2g_stderr;

if [[ "$cmd" == "run" ]] || [[ "$cmd" == "test" ]]; then

    if [[ -z "$(which rsync)" ]]; then
        echo >&2 "You need to install 'rsync' for r2g to work its magic.";
        exit 1;
    fi

    if [[ -z "$(which curl)" ]]; then
        echo >&2 "You need to install 'curl' for r2g to work its magic.";
        exit 1;
    fi

    . "$HOME/.oresoftware/bash/r2g.sh" || {
        echo >&2 "Could not source r2g bash functions from .oresoftware/bash/r2g.sh.";
        exit 1;
    }

    node "$commands/run" "$@" 2> >(r2g_stderr) 1> >(r2g_stdout) # |& r2g_zmx_all

elif [[ "$cmd" == "init" ]]; then

  node "$commands/init" "$@" 2> >(r2g_stderr) 1> >(r2g_stdout)

elif [[ "$cmd" == "symlink" ]] || [[ "$cmd" == "link" ]]; then

  r2g_symlink "$@" 2> >(r2g_stderr) 1> >(r2g_stdout)

elif [[ "$cmd" == "docker" ]]; then

  if ! which dkr2g; then
    npm install -g 'r2g.docker' || {
      echo "Could not install r2g.docker, exiting.";
      exit 1;
    }
  fi

  dkr2g exec --allow-unknown "$@"

elif [[ "$cmd" == "publish" ]]; then

  node "$commands/publish" "$@" 2> >(r2g_stderr) 1> >(r2g_stdout)

elif [[ "$cmd" == "inspect" ]]; then

  node "$commands/inspect" "$@" 2> >(r2g_stderr) 1> >(r2g_stdout)

elif [[ "$cmd" == "clean" ]]; then

  node "$commands/clean" "$@" 2> >(r2g_stderr) 1> >(r2g_stdout)

else

  echo "r2g info: no subcommand was recognized, available commands: (r2g run, r2g init, r2g docker)."
  node "$commands/basic" "${my_args[@]}" 2> >(r2g_stderr) 1> >(r2g_stdout)

fi

exit_code="$?"

if [[ "$exit_code" != "0" ]]; then
    echo -e "${r2g_magenta}Your r2g process is exiting with code $exit_code.${r2g_no_color}";
    exit "$exit_code";
fi

