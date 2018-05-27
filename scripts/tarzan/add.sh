#!/usr/bin/env bash

set -e;
v=`npm pack`;

tarzan use "oresoftware/tarballs"
tarzan add "$v" "tgz/oresoftware/r2g.tgz"
