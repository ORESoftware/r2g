#!/usr/bin/env bash

### if the user has reached this file
### it means the bash function is not sourced,
### because bash functions take precedence
#### so we source it:

#r2g_type=`type -t r2g`;

if [[ "$0" != "/bin/bash" ]]; then
  echo "/bin/sh tried to source the run.r2g shell script foo." >&2
fi

echo "source \"$HOME/.r2g/r2g.sh\"; 'r2g' \"$@"\" | bash;
