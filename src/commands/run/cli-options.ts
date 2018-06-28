'use strict';

export default [

  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print this help and exit.'
  },
  {
    names: ['verbosity', 'v'],
    type: 'integer',
    help: 'Verbosity level, 1-3 inclusive.'
  },
  {
    names: ['search-root','search'],
    type: 'string',
    help: 'Search root path on your fs, to look for local dependencies.',
  },
  {
    names: ['pack'],
    type: 'bool',
    help: 'Pack dependencies (with npm pack) before installing them; this option is only active if --full is used.',
  },
  {
    names: ['allow-unknown'],
    type: 'bool',
    help: 'Allow unknown arguments to the command line.',
  },
  {
    names: ['full'],
    type: 'bool',
    help: 'Install local copies of select dependencies, instead of using NPM.',
    default: false
  },
  {
    names: ['keep', 'multi'],
    type: 'bool',
    help: 'Do not remove previous installations before installing the new/next one.',
  }

]
