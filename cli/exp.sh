#!/usr/bin/env bash

export r2g_gray='\033[1;30m'
export r2g_magenta='\033[1;35m'
export r2g_cyan='\033[1;36m'
export r2g_orange='\033[1;33m'
export r2g_yellow='\033[1;33m'
export r2g_green='\033[1;32m'
export r2g_no_color='\033[0m'

r2g_stdout() {
    while read line; do echo -e "${r2g_gray}r2g:${r2g_no_color} $line"; done
}

r2g_stderr() {
    while read line; do echo -e "${r2g_magenta}r2g:${r2g_no_color} $line"; done
}



do_work(){
  echo 'foo bar';
  echo 'baz';
  echo "error" >&2;
}


do_work 2> >(r2g_stderr) 1> >(r2g_stdout)
