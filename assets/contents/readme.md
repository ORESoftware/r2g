
### Welcome to using r2g!

## Creating multiple test scripts in the "tests" dir

These test scripts run as PhaseT of r2g.

* The "tests" folder contains executable test files
* Only files will be run, r2g will not look into subfolders
* Only executable test files should exist in the "tests" dir, make sure they are executable (use `chmod`).
* The tests dir and the fixtures dir will both be copied from `T/node_modules/X/.r2g/{fixtures,tests} => T/{fixtures,tests}`
* r2g will not look into any folders in "tests", just files.
* The only other files you should require are in the fixtures directory
* Your scripts must have a hashbang/shebang like so:

```
#!/usr/bin/env node

```

or

```
#!/usr/bin/env bash

```


That way you can run scripts in pretty much any language, including bash etc.

<br>

An example of requiring a file from the adjacent fixtures directory:


```js
const f = require('../fixtures/file.json');
```

<br>

You can also see the readme.md file in fixtures dir for more info.

