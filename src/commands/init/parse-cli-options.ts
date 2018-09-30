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
  log.error(chalk.magenta('r2g init: cli parsing error:'), chalk.magentaBright.bold(e.message));
  process.exit(1);
}

if (opts.help) {
  let help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: r2g init [OPTIONS]\n' + help);
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




