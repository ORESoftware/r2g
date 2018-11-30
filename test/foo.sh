#!/usr/bin/env bash

#if shopt -qo errexit; then
#    echo enabled
#    # do something
#fi


exec > >( while read line; do echo " stdout: $line"; done )
exec 2> >( while read line; do echo " stderr: $line"; done )

#    echo "rolo"
echo "cholo" >&2
