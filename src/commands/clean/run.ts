'use strict';

import cp = require('child_process');
import path = require("path");
import fs = require('fs');
import async = require('async');
import {getCleanTrace} from 'clean-trace';

// project
import log from '../../logger';
import chalk from "chalk";
import * as util from "util";
import shortid = require("shortid");
import pt from 'prepend-transform';

///////////////////////////////////////////////

export const run = function (cwd: string, projectRoot: string, opts: any) {
  
  const dir = path.resolve(process.env.HOME + `/.r2g/temp`);
  
  async.autoInject({
      
      clean(cb: any) {
        
        const k = cp.spawn('bash');
        k.stdin.end(`set -e; mkdir -p "${dir}"; rm -rf "${dir}"; mkdir -p "${dir}"`);
        k.stderr.pipe(pt('clean: ')).pipe(process.stderr);
        k.once('exit', code => {
          if (code > 0) {
            log.error('Could not clean dir at path:', dir);
          }
          cb(code);
        });
        
      },
    
    },
    
    (err: any, results) => {
      
      if (err && err.OK) {
        log.warn(chalk.blueBright('Your package may have been published with some problems:'));
        log.warn(util.inspect(err));
      }
      else if (err) {
        throw getCleanTrace(err);
      }
      else {
        log.info(chalk.green('Successfully cleaned all contents in dir:', chalk.bold(dir)))
      }
      
    });
  
};

