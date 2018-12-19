'use strict';

import cp = require('child_process');
import path = require("path");
import fs = require('fs');
import async = require('async');
import {getCleanTrace} from 'clean-trace';

// project
const execSh = path.resolve(__dirname + '/../../../assets/exec.sh');
const contents = path.resolve(__dirname + '/../../../assets/contents');
const Dockerfile = path.resolve(__dirname + '/../../../assets/Dockerfile.r2g.original');
const docker_r2g = '.r2g';
import log from '../../logger';
import chalk from "chalk";
import * as util from "util";
import shortid = require("shortid");
import pt from 'prepend-transform';

///////////////////////////////////////////////

export const run = function (cwd: string, projectRoot: string, opts: any) {
  
  const id = shortid.generate();
  const publishDir = path.resolve(process.env.HOME + `/.r2g/temp/publish/${id}`);
  
  async.autoInject({
      
      mkdir(cb: any) {
        
        const k = cp.spawn('bash');
        k.stdin.end(`mkdir -p "${publishDir}"`);
        k.stderr.pipe(pt('mkdir: ')).pipe(process.stderr);
        k.once('exit', code => {
          if (code > 0) {
            log.error('Could not create dir at path:', publishDir);
          }
          cb(code);
        });
        
      },
      
      copyProject(mkdir: any, cb: any) {
        
        const k = cp.spawn('bash');
        const cmd = `rsync --copy-links -r --exclude=".r2g" --exclude="node_modules" --exclude=".git" "${projectRoot}/" "${publishDir}/";`;
        k.stdin.end(cmd);
        k.stderr.pipe(pt('rsync: ')).pipe(process.stderr);
        k.once('exit', code => {
          if (code > 0) {
            log.error('Could not run the following command:');
            log.error(cmd);
          }
          cb(code);
        });
      },
      
      packAndPublish(copyProject: any, cb: any) {
        
        const k = cp.spawn('bash');
        const cmd = `
          set -e;
          cd "${publishDir}";
          npm publish --loglevel=warn;
         `;
        
        k.stdout.pipe(pt('npm publish:')).pipe(process.stdout);
        k.stderr.pipe(pt('npm publish: ')).pipe(process.stderr);
        k.stdin.end(cmd);
        
        k.once('exit', code => {
          if (code > 0) {
            log.error('Could not publish tarball.');
            log.error('Could not run the following command:');
            log.error(cmd);
          }
          cb(null, code);
        });
      },
      
      rimraf(packAndPublish: number, cb: any) {
        
        const k = cp.spawn('bash');
        k.stdin.end(`rm -rf "${publishDir}"`);
        k.once('exit', code => {
          
          if (code > 0) {
            log.error('Could not rimraf dir at path:', publishDir);
          }
          
          cb(packAndPublish);
        });
      }
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
        log.info(chalk.green('Successfully published your package.'))
      }
      
    });
  
};

