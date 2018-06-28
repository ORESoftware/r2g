

## Exporting the r2gSmokeTest() function from main

You might be here, because you saw the following error in your console:
`r2g smoke test failed => one of your exported r2gSmokeTest function calls failed to resolve to true`

Your project has an index file, which is designated by

```json
{
  "name":"X",
  "main": "lib/index.js"
}
```

in package.json. If "main" is omitted, require() defaults to index.js (not lib/index.js).


Some packages might do this in their main:

```js
module.exports = function(){
  // ...
};
```

or they might do this:

```js
module.exports = {};
```

a quick a dirty solution, would just do this:

```js
module.exports.r2gSmokeTest = () => {
   return true;
}
```

however you may wish to refactor your main file if you
want a more generic library design.


## The purpose of r2gSmokeTest function:


1. In your r2gSmokeTest implementation, you can require() your project's dependencies. (But *not* devDependencies or optionalDependencies).
2. You write a simple inline test that imports your library and does something basic.


For example:

```js
exports.r2gSmokeTest = () => {
  const main = require(__filename);  // load your main file, this file of course
  const v = main.boogle();
  return v.then(oogle => {
     return oogle === false;  // your must return `true` to pass.
  });
};
```


So as you can see, r2g executes your r2gSmokeTest function as:

```js
 Promise.resolve(r2gSmokeTest());
```


Your `r2gSmokeTest` function can look like:

```js
export const r2gSmokeTest = async () => {  // this function can be async
  return true;
};
```

or just like:

```js
export const r2gSmokeTest = () => {
  return true;
};
```
