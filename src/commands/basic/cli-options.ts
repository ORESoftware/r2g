'use strict';

export default [

  {
    names: ['version', 'vn'],
    type: 'bool',
    help: 'Print tool version and exit.'
  },
  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print this help and exit.'
  },
  {
    names: ['bash-completion', 'completion'],
    type: 'bool',
    help: 'Generate bash completion code.'
  },
  {
    names: ['verbosity', 'v'],
    type: 'integer',
    help: 'Verbosity level, 1-3 inclusive.'
  },
  {
    names: ['allow-unknown'],
    type: 'bool',
    help: 'Allow unknown arguments to the command line.',
  }

]


export interface R2GBasicOpts {
  bash_completion: boolean,
  version: boolean,
  debug: boolean,
  allow_unknown: boolean,
  force: boolean,
  help: boolean,
  verbosity: number
}
