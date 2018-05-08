#!/usr/bin/env bash


#exec 3<>/dev/stdout  # persistent file descriptor

rm -rf foo
mkfifo foo

exec 3<>foo

(
    cat <&3 | while read line; do
       if [[ -n "$line" ]]; then
        echo " [prepend] $line";
       fi
    done &
 )

echo ""  >&3;
echo ""  >&3;
echo "foo" >&3
echo "bar" >&3
echo "baz" >&3


pkill -P $$
