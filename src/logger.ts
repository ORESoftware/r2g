'use strict';

import chalk from "chalk";

const isDebug = process.env.r2g_is_debug === 'yes';

export const log = {
  info: console.log.bind(console),
  warning: console.error.bind(console, chalk.bold.yellow.bold('r2g warn:')),
  warn: console.error.bind(console, chalk.bold.magenta.bold('r2g warn:')),
  error: console.error.bind(console, chalk.redBright.bold('r2g error:')),
  debug: function (...args: any[]) {
    isDebug && console.log(chalk.yellowBright('r2g debug:'), ...arguments);
  }
};

export default log;
