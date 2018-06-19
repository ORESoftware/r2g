#!/usr/bin/env bash

r2g_gray='\033[1;30m'
r2g_magenta='\033[1;35m'
r2g_cyan='\033[1;36m'
r2g_orange='\033[1;33m'
r2g_yellow='\033[1;33m'
r2g_green='\033[1;32m'
r2g_no_color='\033[0m'

if [ "$0" == "/bin/sh" ] || [ "$0" == "sh" ]; then
    echo "sh is stealing bash sunshine.";
    exit 1;
fi


cmd="$1";
shift 1;

if [ "$cmd" == "run" ]; then

  (
    set -e;
    r2g_run "$@"  \
        2> >( while read line; do echo -e "${r2g_magenta}r2g:${r2g_no_color} $line"; done ) \
        1> >( while read line; do echo -e "${r2g_gray}r2g:${r2g_no_color} $line"; done )
   )

elif [ "$cmd" == "init" ]; then

  if [ -z "$(which dkr2g)" ]; then
    npm install -g "@oresoftware/docker.r2g" || {
      echo "Could not install docker.r2g, exiting.";
      exit 1;
    }
  fi

  dkr2g exec "$@"

elif [ "$cmd" == "docker" ]; then

  if [ -z "$(which dkr2g)" ]; then
    npm install -g "@oresoftware/docker.r2g" || {
      echo "Could not install docker.r2g, exiting.";
      exit 1;
    }
  fi

  dkr2g exec "$@"

else

  echo "no subcommand was recognized."
  exit 1;

fi

exit_code="$?"
if [[ "$exit_code" != "0" ]]; then
    echo -e "${r2g_magenta}r2g experienced an error, to see log, run: r2g_view_log${r2g_no_color}";
    exit 1;
fi
