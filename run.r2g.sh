#!/usr/bin/env bash

### if the user has reached this file
### it means the bash function is not sourced,
### because bash functions take precedence
#### so we source it:

#r2g_type=`type -t r2g`;

if [[ "$0" != *"bash"* ]]; then
  echo "$0 tried to source the run.r2g shell script." >&2
fi

. "$(npm root -g)/r2g/r2g.sh" || . "$(npm root -g)/@oresoftware/r2g/r2g.sh" || . "$HOME/.oresoftware/bash/r2g.sh" || {
  echo "Could not source the r2g.sh shell script."  >&2;
  exit 1;
}

type="$(type -t r2g)"

if [ "$type" == "function" ]; then
      r2g "$@";
else
      echo "Could not source the r2g.sh shell script."  >&2;
fi


