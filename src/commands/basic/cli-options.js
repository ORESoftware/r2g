'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [
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
        names: ['json'],
        type: 'bool',
        help: 'Write stdout info as JSON (use json-stdio to parse it).',
        default: false,
        hidden: true,
        env: 'nlu_setting_json'
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
        env: 'r2g_allow_unknown'
    }
];
