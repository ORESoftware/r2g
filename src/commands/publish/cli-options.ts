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
    names: ['force', 'f'],
    type: 'integer',
    help: 'Verbosity level, 1-3 inclusive.'
  },
  {
    names: ['access'],
    type: 'string',
    help: 'Allow public/restricted access to package.',
    default: 'restricted'
  },
  {
    names: ['allow-unknown'],
    type: 'bool',
    help: 'Allow unknown arguments to the command line.',
    env: 'r2g_allow_unknown'
  },
  {
    names: ['ignore-dirty-git-index', 'ignore-dirty-index'],
    type: 'bool',
    default: false,
    env: 'ignore_dirty_index'
  }

]


export interface R2GInitOpts {
  allow_unknown: boolean,
  force: boolean,
  help: boolean,
  verbosity: number
}
