#!/usr/bin/env bash

### if the user has reached this file
### it means the bash function is not sourced,
### because bash functions take precedence
#### so we source it:

r2g_type=`type -t r2g`;

if [[ "$r2g_type" != "function" ]]; then
    . "$HOME/.r2g/r2g.sh"
fi

### then run it
r2g "$@"
