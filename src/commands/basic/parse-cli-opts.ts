'use strict';

import options from './cli-options';
const dashdash = require('dashdash');
import residence = require('residence');
import chalk from "chalk";
const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
const parser = dashdash.createParser({options, allowUnknown});
const pkgJSON = require('../../../package.json');
import log from '../../logger';

let opts: any;

try {
  opts = parser.parse(process.argv);
} catch (e) {
  console.error(chalk.magenta('r2g: cli parsing error:'), chalk.magentaBright.bold(e.message));
  process.exit(1);
}

if (opts.help) {
  log.warning(chalk.bold.cyan('To see help for r2g run, using "r2g run --help".'));
  log.warning(chalk.bold.cyan('To see help for r2g init, using "r2g init --help".'));
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: r2g [OPTIONS]\n' + 'options:\n' + help);
  process.exit(0);
}

if (opts.version) {
  console.log('r2g version:', pkgJSON.version);
  process.exit(0);
}


const cwd = process.cwd();
const projectRoot = residence.findProjectRoot(cwd);

if(!projectRoot){
  throw chalk.magenta('Could not find a project root given your current working directory => ') + chalk.magenta.bold(cwd);
}


export {opts, cwd, projectRoot};




