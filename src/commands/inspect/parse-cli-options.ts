'use strict';

import {getCliContext} from '../../cli/flags';

const {opts, cwd, projectRoot} = getCliContext('inspect');

export {opts, cwd, projectRoot};
