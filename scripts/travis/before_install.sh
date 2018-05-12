#!/usr/bin/env bash


set -e;

echo "this is the travis 'before install'."

npm install -g typescript;

tsc;
