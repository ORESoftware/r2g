'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [
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
        names: ['init',],
        type: 'bool',
        help: 'Initialize docker.r2g in your project',
        helpArg: 'FILE'
    },
    {
        names: ['run',],
        type: 'bool',
        help: 'Run docker.r2g against your project',
        helpArg: 'FILE'
    },
    {
        names: ['exec',],
        type: 'bool',
        help: 'Run docker.r2g against your project',
        helpArg: 'FILE'
    },
    {
        names: ['file', 'f'],
        type: 'string',
        help: 'File to process',
        helpArg: 'FILE'
    }
];
