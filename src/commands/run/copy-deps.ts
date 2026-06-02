'use strict';

import cp = require('child_process');
import path = require("path");
import async = require('async');
import log from "../../logger";
import chalk from "chalk";
import shortid = require("shortid");

/////////////////////////////////////////////////////////////////

const getNpmPackFileName = (stdout: string) => {
  return String(stdout || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean).pop() || '';
};

export const installDeps =  (createProjectMap: any, dependenciesToInstall: Array<string>, opts: any, cb: any) => {

  const finalMap = {} as any;

  if (dependenciesToInstall.length < 1) {
    return process.nextTick(cb, null, finalMap);
  }

  const c = opts.pack ? 4 : 4;

  async.eachLimit(dependenciesToInstall, c,  (dep, cb) => {

      if (!createProjectMap[dep]) {
        log.info('dependency is not in the local map:', dep);
        return process.nextTick(cb, null);
      }

      const d = createProjectMap[dep];
      const c = path.dirname(d);

      const k = cp.spawn('bash');
      const id = shortid.generate();
      const dest = path.resolve(process.env.HOME + `/.r2g/temp/deps/${id}`);
      const basename = path.basename(c);
      const depRoot = path.resolve(dest + '/' + basename);

      const pack = (depRoot: string, cb: any) => {

        if (!opts.pack) {
          // the map just points to the root of the project
          finalMap[dep] = depRoot;
          return process.nextTick(cb);
        }

        const cmd = `npm pack --loglevel=warn`;

        log.info(`Running the following command: '${chalk.cyan.bold(cmd)}', in this directory: "${depRoot}".`);

        const k = cp.spawn('npm', ['pack', '--loglevel=warn'], {
          cwd: depRoot
        });

        let stdout = '';

        k.stdout.on('data', d => stdout += String(d));
        k.stderr.pipe(process.stderr);
        k.once('exit', function (code) {

          if (code > 0) {
            return cb(new Error('"npm pack" command exited with code greater than 0.'));
          }

          // the map points to the .tgz file in the root of the project, where stdout should be the .tgz file name
          const tarballName = getNpmPackFileName(stdout);
          if (!tarballName) {
            return cb(new Error(`npm pack did not print a tarball filename. stdout: ${stdout}`));
          }
          finalMap[dep] = path.resolve(dest + '/' + basename + '/' + tarballName);
          cb(null);

        });
        k.once('error', cb);
      };

      const cmd = [
        `set -e`,
        `mkdir -p "${dest}"`,
        `rsync --perms --copy-links -r --exclude="node_modules" --exclude=".git" "${c}" "${dest}";`,
      ]
        .join('; ');

      log.info(`About to run the following command: '${chalk.cyan.bold(cmd)}'`);

      k.stdin.end(cmd);
      k.stderr.pipe(process.stderr);

      k.once('exit', code => {

        if (code < 1) {
          return pack(depRoot, cb);
        }

        log.error('The following command failed:');
        log.error(chalk.magentaBright.bold(cmd));
        cb(new Error(`The following command '${cmd}', exited with code: "${code}".`))

      });

    },

    function (err) {
      process.nextTick(cb, err, finalMap);
    });

};
