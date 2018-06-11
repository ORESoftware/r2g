#!/usr/bin/env bash


echo "this is the travis 'script' script."

#. "$HOME/.oresoftware/bash/r2g.sh"
#r2g run


npm link -f --loglevel="warn"
r2g run
