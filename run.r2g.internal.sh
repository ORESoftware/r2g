#!/usr/bin/env bash

r2g_type=`type r2g`;

if [[ -z "r2g_type" ]]; then
   . "$HOME/.r2g/r2g.sh"
fi

'r2g' "$@"
