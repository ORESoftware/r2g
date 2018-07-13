#!/usr/bin/env node
'use strict';

import log from "../../logger";

process.once('exit', code => {
  log.info('r2g is exiting with code =>', code);
});

import {opts, projectRoot, cwd} from './parse-cli-options';
import * as m from './run';
m.run(cwd, projectRoot, opts);
