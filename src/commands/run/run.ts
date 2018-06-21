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

      removeExistingProject(cb: EVCallback) {

        if (opts.keep || opts.multi) {
          log.info("We are keeping the previously installed packages because '--keep' / '--multi' was used.");
          return process.nextTick(cb);
        }

        log.info('Removing existing files within "$HOME/.r2g.temp"...');
        const k = cp.spawn('bash');
        k.stdin.end(`rm -rf "$HOME/.r2g/temp"`);
        k.once('exit', cb);

      },

      mkdirpProject(removeExistingProject: any, cb: EVCallback) {

        log.info('Making sure the right folders exist using mkdir -p ...');
        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
        k.stdin.end(`mkdir -p "${r2gProject}"; mkdir -p "${r2gProjectCopy}";`);
        k.once('exit', function (code) {
          if (code > 0) log.error("Could not create temp/project or temp/copy directory.");
          cb(code);
        });

      },

      copyProject(mkdirpProject: any, cb: EVCallback) {

        if (process.env.r2g_is_docker) {
          log.info('We are not copying the project since we are using r2g.docker');
          return process.nextTick(cb, null, projectRoot);
        }

        log.info('Copying your project to "$HOME/.r2g/temp/copy" using rsync ...');

        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
        k.stdin.end(`rm -rf ${r2gProjectCopy}; rsync -r --exclude="node_modules" "${projectRoot}" "${r2gProjectCopy}";`);
        k.once('exit', function (code) {
          if (code > 0) log.error('Could not rimraf project copy path or could not copy to it using rsync.');
          cb(code, path.resolve(r2gProjectCopy + '/' + path.basename(projectRoot)));
        });

      },

      runNpmPack(copyProject: string, cb: EVCallback) {

        log.info('Running "npm pack" against your project ...');

        const k = cp.spawn('bash');
        k.stdin.end(`npm pack --loglevel=warn;`);
        let stdout = '';
        k.stdout.on('data', d => {
          stdout += String(d || '').trim();
        });
        k.stderr.pipe(process.stderr);
        k.once('exit', function (code) {
          if (code > 0) log.error(`Could not run "npm pack" for this project => ${copyProject}.`);
          cb(code, path.resolve(copyProject + '/' + stdout));
        });
      },

      copySmokeTester(mkdirpProject: any, cb: EVCallback) {

        log.info(`Copying the smoke-tester.js file to "${r2gProject}" ...`);

        fs.createReadStream(smokeTester)
        .pipe(fs.createWriteStream(path.resolve(r2gProject + '/smoke-tester.js')))
        .once('error', cb)
        .once('finish', cb);
      },

      copyPackageJSON(mkdirpProject: any, cb: EVCallback) {

        log.info(`Copying a "blank" package.json file to "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stderr.pipe(process.stderr);
        k.stdin.end(`r2g_copy_package_json "${r2gProject}" ${opts.keep || ''};`);
        k.once('exit', cb);
      },

      runNpmInstall(copyPackageJSON: any, runNpmPack: string, cb: EVCallback) {
        // runNpmPack is the path to .tgz file

        log.info(`Running npm install in "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stdin.end(`npm install --loglevel=warn --cache-min 9999999 --production "${runNpmPack}";`);
        k.stderr.pipe(process.stderr);
        k.once('exit', cb);
      },

      r2gSmokeTest(runNpmInstall: any, copySmokeTester: any, cb: EVCallback) {

        log.info(`Running your exported r2gSmokeTest function(s) in "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stderr.pipe(process.stderr);
        k.stdout.pipe(process.stdout);
        k.stdin.end(`node smoke-tester.js;`);
        k.once('exit', code => {
          if (code > 0) log.error('r2g smoke test failed.');
          cb(code);
        });
      },

      copyUserDefinedTests(copyProject: string, cb: EVCallback) {

        log.info(`Copying your user defined tests to: "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: copyProject
        });
        k.stdout.pipe(process.stdout);
        k.stderr.pipe(process.stderr);
        k.stdin.end(`r2g_copy_user_defined_tests "${r2gProject}";`);
        k.once('exit', cb);

      },

      runUserDefinedTests(copyUserDefinedTests: any, r2gSmokeTest: any, runNpmInstall: any, cb: EVCallback) {

        log.info(`Running user defined tests in "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stdout.pipe(process.stdout);
        k.stderr.pipe(process.stderr);
        k.stdin.end(`r2g_run_user_defined_tests;`);
        k.once('exit', cb);
      }

    },

    function (err: any, results) {

      if (err && err.OK) {
        log.warn(chalk.blueBright('r2g may have run with some problems.'));
        log.warn(util.inspect(err));
      }
      else if (err) {
        throw getCleanTrace(err);
      }
      else {
        log.info(chalk.green('Successfully ran r2g/docker.r2g'))
      }

      process.exit(0);

    });

};

