#!/usr/bin/env bash

set -e;

git fetch origin;
git reset --soft "remotes/origin/dev";
git commit -am "reset to integration"
git push
