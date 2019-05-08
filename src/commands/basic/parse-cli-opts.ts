'use strict';

import basicOpts from './cli-options';
import initOpts from '../init/cli-options';
import runOpts from '../run/cli-options';

const dashdash = require('dashdash');
import residence = require('residence');
import chalk from "chalk";

const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
const parser = dashdash.createParser({options: basicOpts, allowUnknown});
const pkgJSON = require('../../../package.json');
import log from '../../logger';
import * as stdio from 'json-stdio';

let opts: any;

try {
  opts = parser.parse(process.argv);
}
catch (e) {
  console.error(chalk.magenta('r2g: cli parsing error:'), chalk.magentaBright.bold(e.message));
  process.exit(1);
}

if (opts.help) {
  log.warning(chalk.bold.cyan('To get help for r2g run, use:', chalk.bold.blueBright('r2g run --help')));
  log.warning(chalk.bold.cyan('To get help for r2g init, use:', chalk.bold.blueBright('r2g init --help')));
  let help = parser.help({includeEnv: true}).trimRight();
  console.log();
  console.log('usage: r2g [OPTIONS]\n' + help);
  process.exit(0);
}

if (opts.version) {
  if (opts.json) {
    stdio.log({versions: {r2g: pkgJSON.version}});
  }
  else {
    console.log('r2g version:', chalk.bold(pkgJSON.version));
  }
  process.exit(0);
}

const flattenDeep = function (arr1: Array<any>): Array<any> {
  return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};

if (opts.bash_completion) {
  
  const allOpts = flattenDeep([initOpts, runOpts, basicOpts]);
  
  let generatedBashCode = dashdash.bashCompletionFromOptions({
    name: 'r2g',
    options: allOpts,
    includeHidden: false
  });
  
  console.log(generatedBashCode);
  process.exit(0);
}

const cwd = process.cwd();
const projectRoot = residence.findProjectRoot(cwd);

if (!projectRoot) {
  throw chalk.magenta('Could not find a project root given your current working directory => ') + chalk.magenta.bold(cwd);
}

export {opts, cwd, projectRoot};




