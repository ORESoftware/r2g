

# r2g

Allows you to test your package in the published format, without actually having to publish to NPM.
Everything happens locally. For packages that do some crazier things, might be useful to use a Docker container.
For now, testing happens in `"$HOME/.r2g/temp/project"`.

r2g uses the following NPM utilities to do it's thing:

1. For the project being tested: `npm pack`
2. In another project: `npm install /path/to/tarball.tgz`


To make it work:

1. Add the following scripts to your package.json file:

```json
 "scripts": {
    "r2g-copy-tests": "cp -r ./test $HOME/.r2g/temp/project",
    "r2g-run-tests": "npm test"
  },

```
In the above, we don't publish the test directory to NPM, but we want to test our tarballed contents,
so we have to copy the test directory over.

Note that you might actually publish the relevant tests when your run `npm publish` (gets tarballed).*
So you might need to copy any other files - 
in other words, you won't need to do anything in r2g-copy-tests, so just do this


```json
 "scripts": {
    "r2g-copy-tests": "echo 'copying test no-op'",
    "r2g-run-tests": "npm test"
 },

```
 
 
\*(I don't see a strong need to publish tests to NPM, unless perhaps you run tests during preinstall/postinstall?)
