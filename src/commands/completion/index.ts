#!/usr/bin/env node
'use strict';

// No exit-hook logging here: stdout must stay a clean shell script so it
// can be sourced directly or written to a completions directory.
import {completionScript, parseCommand} from '../../cli/flags';

const opts = parseCommand('completion');
const shell = String(opts._args[0] || 'bash').toLowerCase();

if (shell !== 'bash' && shell !== 'zsh') {
  process.stderr.write(`r2g completion supports bash and zsh, not "${shell}".\n`);
  process.exit(1);
}

process.stdout.write(completionScript(shell) + '\n');
