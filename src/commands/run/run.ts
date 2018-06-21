'use strict';

import cp = require('child_process');
import path = require("path");
import fs = require('fs');
import async = require('async');
import {getCleanTrace} from 'clean-trace';
import * as util from "util";

// project
import log from '../../logger';
import chalk from "chalk";
import {EVCallback} from "../../index";

///////////////////////////////////////////////

const r2gProject = path.resolve(process.env.HOME + '/.r2g/temp/project');
const r2gProjectCopy = path.resolve(process.env.HOME + '/.r2g/temp/copy');
const smokeTester = require.resolve('../../smoke-tester.js');

export const run = function (cwd: string, projectRoot: string, opts: any) {

  async.autoInject({

      removeExistingProject (cb: EVCallback) {

        if (opts.keep || opts.multi) {
          log.info("We are keeping the previously installed modules because '--keep' / '--multi' was used.");
          return process.nextTick(cb);
        }

        const k = cp.spawn('bash');
        k.stdin.end(`rm -rf "$HOME/.r2g/temp"`);
        k.once('exit', cb);

      },

      mkdirpProject (removeExistingProject: any, cb: EVCallback) {

        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
        k.stdin.end(`mkdir -p "${r2gProject}"`);
        k.once('exit', function (code) {
          if (code > 0) log.error("Could not create temp/project directory.");
          cb(code);
        });

      },

      copyProject (mkdirpProject: any, cb: EVCallback) {

        if(process.env.is_r2g_docker){
          log.info('We are not copying the project since we are using r2g.docker');
          return process.nextTick(cb, null, projectRoot);
        }

        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
        k.stdin.end(`rm -rf ${r2gProjectCopy}; rsync -r --exclude="node_modules" "${projectRoot}" "${r2gProjectCopy}";`);
        k.once('exit', function(code){
          if(code > 0) log.error('Could not rimraf project copy path or could not copy to it using rsync.');
          cb(code, r2gProjectCopy);
        });

      },

      runNpmPack (copyProject: string, cb: EVCallback) {

        const k = cp.spawn('bash');
        k.stdin.end(`npm pack --loglevel=warn;`);
        let stdout = '';
        k.stdout.on('data', d => {
           stdout += String(d || '').trim();
        });
        k.stderr.pipe(process.stderr);
        k.once('exit', function(code){
          if(code > 0) log.error(`Could not run "npm pack" for this project => ${copyProject}.`);
          cb(code, path.resolve(copyProject + '/' + stdout));
        });
      },

      copySmokeTester(mkdirpProject: any, cb: EVCallback){

        fs.createReadStream(smokeTester)
        .pipe(fs.createWriteStream(path.resolve(r2gProject + '/smoke-tester.js')))
        .once('error',cb)
        .once('end',cb);
      },

      runNpmInstall(runNpmPack: string, cb: EVCallback){
        // runNpmPack is the path to .tgz file
         const k = cp.spawn('bash', [], {
           cwd: r2gProject
         });
         k.stdin.end(`npm install --loglevel=warn --cache-min 9999999 --production "${runNpmPack}";`);
         k.stderr.pipe(process.stderr);
         k.once('exit', cb);
      },

       r2gSmokeTest(){
         const k = cp.spawn('bash', [], {
           cwd: r2gProject
         });
         k.stderr.pipe(process.stderr);
         k.stdin.end(`node smoke-tester.js;`);
       }

    },

    function (err: any, results) {

      if (err && err.OK) {
        log.warn(chalk.blueBright('r2g/docker.r2g may have been initialized with some problems.'));
        log.warn(util.inspect(err));
      }
      else if (err) {
        throw getCleanTrace(err);
      }
      else {
        log.info(chalk.green('Successfully initialized r2g/docker.r2g'))
      }

    });

};

