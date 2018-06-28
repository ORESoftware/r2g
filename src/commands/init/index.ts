#!/usr/bin/env node
'use strict';


import {opts, projectRoot, cwd} from './parse-cli-options';
import * as m from './run';
m.run(cwd, projectRoot, opts);
