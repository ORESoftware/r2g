#!/usr/bin/env bash

set -e;
echo "this is the travis 'install'.";
npm install --silent;
tsc || echo "tsc command compiled with errors.";
