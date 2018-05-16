#!/usr/bin/env bash


echo "this is the travis 'script' script."

### delete everything in bash hash
hash -r;

. "$HOME/.oresoftware/bash/r2g.sh"


r2g "$@"
