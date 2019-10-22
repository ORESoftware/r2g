'use strict';

import basicOpts from './cli-options';
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




export {opts};




