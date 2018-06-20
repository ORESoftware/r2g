#!/usr/bin/env bash


#exec 3<>/dev/stdout  # persistent file descriptor



#!/bin/bash
foo(){
  my_args_array=("$@")
  export my_args="${my_args_array[@]}"
   node test/x.js # "${my_args[@]}"
#  bar "${my_args[@]}"
}

bar(){
  echo "number of args: $#";
  echo "args: $@"
  node test/x.js "$@"
}


foo a b 'c d e'


