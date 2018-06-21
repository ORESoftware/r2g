'use strict';

export default [

  {
    name: 'version',
    type: 'bool',
    help: 'Print tool version and exit.'
  },
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
    names: ['pack'],
    type: 'bool',
    help: 'Pack dependencies (with npm pack) before installing them.',
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
  },
  {
    names: ['keep', 'multi'],
    type: 'bool',
    help: 'Do not remove previous installations before installing the new/next one.',
  }

]
