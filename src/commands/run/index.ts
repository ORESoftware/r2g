#!/usr/bin/env node
'use strict';

import log from "../../logger";

process.once('exit', code => {
  log.info('r2g is exiting with code:', code);
});


import {opts, projectRoot, cwd} from './parse-cli-options';
import {resolveEcosystem} from '../../cli/flags';
import {runEcosystem} from './ecosystem-runner';
import * as m from './run';

const ecosystem = resolveEcosystem(projectRoot, opts.ecosystem);
if (ecosystem === 'npm') {
  m.run(cwd, projectRoot, opts);
}
else {
  runEcosystem(projectRoot, ecosystem, opts).catch(err => {
    log.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}
