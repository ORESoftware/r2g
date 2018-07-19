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

///////////////////////////////////////////////

export const run = function (cwd: string, projectRoot: string, opts: any) {

  const dockerfileDest = path.resolve(projectRoot + '/Dockerfile.r2g');
  const execShDest = path.resolve(projectRoot + '/.r2g/exec.sh');

  async.autoInject({

      mkdir: function (cb: any) {

        const k = cp.spawn('bash');
        k.stdin.end(`mkdir ${projectRoot}/${docker_r2g}`);
        k.once('exit', function (code) {
          cb(null, code);
        });

      },

      copyContents: function (mkdir: any, cb: any) {

        if (mkdir) {
          log.info(chalk.yellow('Could not create .r2g folder (already exists?).'));
          return process.nextTick(cb);
        }

        const k = cp.spawn('bash');
        k.stdin.end(`cp -R ${contents}/* ${cwd}/${docker_r2g}`);
        k.once('exit', cb);
      },

      checkIfExecShExists: function (cb: any) {

        if(!opts.docker){
          return process.nextTick(cb);
        }

        fs.lstat(execShDest, function (err, stats) {
          cb(null, stats);
        });
      },

      copyExecSh: function (mkdir: any, checkIfExecShExists: any, copyContents: any, cb: any) {

        if(!opts.docker){
          return process.nextTick(cb);
        }

        if (checkIfExecShExists) {
          log.info(chalk.yellow('Could not create .r2g/exec.sh file (already exists?).'));
          return process.nextTick(cb);
        }

        fs.createReadStream(execSh)
        .pipe(fs.createWriteStream(execShDest))
        .once('error', cb)
        .once('end', cb);

      },

      checkIfDockerfileExists: function (cb: any) {
        fs.lstat(dockerfileDest, function (err, stats) {
          cb(null, stats);
        });
      },

      createDockerfile: function (checkIfDockerfileExists: any, cb: any) {

        if(!opts.docker){
          return process.nextTick(cb);
        }

        if (checkIfDockerfileExists) {
          log.info(chalk.yellow('Could not create Dockerfile.r2g file (already exists?).'));
          return process.nextTick(cb);
        }

        fs.createReadStream(Dockerfile)
        .pipe(fs.createWriteStream(dockerfileDest))
        .once('error', cb)
        .once('end', cb);
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

