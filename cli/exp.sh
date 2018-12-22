#!/usr/bin/env bash

pack="foo"

cat <<END
{"@json-stdio":true,"value":"$pack"}
END
