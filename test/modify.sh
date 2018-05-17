#!/usr/bin/env bash

set -e;

file="/host_user_home/WebstormProjects/oresoftware/clean-trace";
#npm install "$file"

modify.json --disk -f package.json -x "dependencies.clean-trace" -z `cat <<EOF
   "file://$file"
EOF`


#r2g --keep;
