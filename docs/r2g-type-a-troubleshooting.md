

## Exported r2gSmokeTest troubleshooting

So you have this function exported from X-main

```
exports.r2gSmokeTest = () => {
  return true;
};
```

but when it runs it fails. If you can't require a dependency -
it's likely because you are trying to load a dependency that is not
available after installing your package with the --production flag.

In your r2gSmokeTest implementation, you should only require dependencies that are in "dependencies",
not "devDependencies" or "optionalDependencies".
