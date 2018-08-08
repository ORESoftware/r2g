#!/usr/bin/env bash


export FORCE_COLOR=1;

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

node "$commands/run" "$@"
