#!/usr/bin/env bash



handle_json(){
  while read line; do

cat <<EOF
{"@json-stdio":true,"value":{"mark":"$1","v":"$line"}}
EOF

    done;
}

echo;

( echo; echo; echo 'du results'; ) |  handle_json 'foo';

