'use strict';

import {getCliContext} from '../../cli/flags';

const {opts, cwd, projectRoot} = getCliContext('publish');

export {opts, cwd, projectRoot};
