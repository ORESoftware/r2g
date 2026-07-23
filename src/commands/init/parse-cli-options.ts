'use strict';

import {getCliContext} from '../../cli/flags';

const {opts, cwd, projectRoot} = getCliContext('init');

export {opts, cwd, projectRoot};
