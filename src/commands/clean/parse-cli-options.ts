'use strict';

import {getCliContext} from '../../cli/flags';

const {opts, cwd, projectRoot} = getCliContext('clean');

export {opts, cwd, projectRoot};
