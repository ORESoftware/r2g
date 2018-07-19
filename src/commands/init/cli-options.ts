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
    names: ['docker'],
    type: 'bool',
    help: 'Include docker-related files during init.',
  },
  {
    names: ['search-root', 'search'],
    type: 'string',
    help: 'Search root path on your fs, to look for local dependencies.',
  },
  {
    names: ['allow-unknown'],
    type: 'bool',
    help: 'Allow unknown arguments to the command line.',
  }

]
