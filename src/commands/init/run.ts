'use strict';

import cp = require('child_process');
import path = require("path");
import fs = require('fs');
import async = require('async');
import {getCleanTrace} from 'clean-trace';

// project
const contents = path.resolve(__dirname + '/../../../assets/contents');
const Dockerfile = path.resolve(__dirname + '/../../../assets/contents/Dockerfile.r2g.original');
const docker_r2g = '.docker.r2g';
import log from '../../logger';
import chalk from "chalk";
import * as util from "util";

///////////////////////////////////////////////

export const run = function (cwd: string, projectRoot: string, opts: any) {

  const dockerfileDest = path.resolve(projectRoot + '/Dockerfile.r2g');

  async.autoInject({

      mkdir: function (cb: any) {
        const k = cp.spawn('bash');
        k.stdin.end(`mkdir ./${docker_r2g}`);
        k.once('exit', function (code) {
          cb(null, code);
        });
      },

      copyContents: function (mkdir: any, cb: any) {

        if (mkdir) {
          log.info(chalk.yellow('Could not create .docker.r2g folder (already exists?).'));
          return process.nextTick(cb);
        }

        const k = cp.spawn('bash');
        k.stdin.end(`cp -R ${contents}/* ${cwd}/${docker_r2g}`);
        k.once('exit', cb);
      },

      checkIfDockerfileExists: function (cb: any) {
        fs.lstat(dockerfileDest, function (err, stats) {
          cb(null, stats);
        });
      },

      createDockerfile: function (checkIfDockerfileExists: any, cb: any) {

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
        log.warn(chalk.blueBright('docker.r2g may have been initialized with some problems.'));
        log.warn(util.inspect(err));
      }
      else if (err) {
        throw getCleanTrace(err);
      }
      else {
        log.info(chalk.green('Successfully initialized docker.r2g'))
      }

    });

};

