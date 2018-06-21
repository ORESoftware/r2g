#!/usr/bin/env bash


r2g_gray='\033[1;30m'
r2g_magenta='\033[1;35m'
r2g_cyan='\033[1;36m'
r2g_orange='\033[1;33m'
r2g_yellow='\033[1;33m'
r2g_green='\033[1;32m'
r2g_no_color='\033[0m'

dir_name="$(dirname "$0")"
read_link="$(readlink "$0")";
exec_dir="$(dirname $(dirname "$read_link"))";
my_path="$dir_name/$exec_dir";
basic_path="$(cd $(dirname ${my_path}) && pwd)/$(basename ${my_path})"
commands="$basic_path/dist/commands"

if [ -z "$(which rsync)" ]; then
  echo >&2 "You need to install 'rsync' for r2g to work its magic.";
  exit 1;
fi

if [ -z "$(which curl)" ]; then
  echo >&2 "You need to install 'curl' for r2g to work its magic.";
  exit 1;
fi

. "$HOME/.oresoftware/bash/r2g.sh" || {
  echo >&2 "Could not source r2g bash functions from .oresoftware/bash/r2g.sh.";
  exit 1;
}

node "$commands/run" $@
