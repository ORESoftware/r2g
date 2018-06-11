#!/usr/bin/env bash

set -e;

echo "this is the travis 'install'.";

npm install --loglevel="warn" || {
  echo "could not run npm install successfully...";
}

tsc || echo "tsc command compiled with errors.";
