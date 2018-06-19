'use strict';

import chalk from "chalk";
const isDebug = process.env.r2g_is_debug === 'yes';

export const log = {
  info: console.log.bind(console, chalk.gray('[r2g info]')),
  warn: console.error.bind(console, chalk.bold.magenta.bold('[r2g warn]')),
  error: console.error.bind(console, chalk.redBright.bold('[r2g error]')),
  debug: function (...args: any[]) {
    isDebug && console.log('[r2g]', ...arguments);
  }
};

export default log;
