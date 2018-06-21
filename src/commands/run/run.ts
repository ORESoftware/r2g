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


///////////////////////////////////////////////

export const run = function (cwd: string, projectRoot: string, opts: any) {

  const dockerfileDest = path.resolve(projectRoot + '/Dockerfile.r2g');

  async.autoInject({

      mkdir: function (cb: any) {


      },

      copyContents: function (mkdir: any, cb: any) {


      },

      checkIfDockerfileExists: function (cb: any) {

      },

      createDockerfile: function (checkIfDockerfileExists: any, cb: any) {


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

