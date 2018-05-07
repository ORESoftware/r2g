

# r2g

#### Purpose 

Allows you to test your package in the published format, without actually having to publish to NPM.
Everything happens locally. For packages that do some crazier things, might be useful to use a Docker container.
For now, testing happens in `"$HOME/.r2g/temp/project"`.

What you do: Write some smoke tests that will run after (a) your library is in the published format, and (b) is
installed in another project as dependency. This serves the two obvious purposes, does it actually install
properly, and can it be loaded and run with at some basic functionality.

<p>

## How it works

r2g uses the following NPM utilities to do it's thing:

1. For the project being tested: `npm pack`
2. In another project: `npm install /path/to/tarball.tgz`


### Installation

## `npm install -g r2g`
#### then add the following to your ~/.bashrc and/or ~/.bash_profile files:
### `. "$HOME/.r2g/r2g.sh"`


## Usage

To make it work (fulfill the contract):

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
