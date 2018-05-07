
If you are compiling from `src` to `dist`, put your files in here, and use this in `tsconfig.json`:

```js
{
  "compilerOptions": {
    "outDir": "dist",            // transpile *.ts files in the src dir to the dist dir
     // ...
  },
  // ...
  "include": [
    "src"                         // use src instead of lib
  ]
}
```


If you are not compiling from src to dist, just delete the src dir. If you want to compile from src to dist,
then keep the src dir, and delete the lib dir.
