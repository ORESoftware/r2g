

## User defined test files

You may be here because you saw this error in your console:

`=> Your r2g test(s) have failed.`

 or

`the file here failed to exit with code 0: /home/oleg/.r2g/temp/project/user_defined_smoke_test`


# How to fix the error / more details

r2g will copy the file from here:

`"$HOME/.r2g/temp/project/node_modules/X/.r2g/smoke-test.js"`

to here:

`"$HOME/.r2g/temp/project/user-defined-smoke-test"`


and then execute it directly - (it must have a hashbang/shebang).

To fix the error, you may need to modify the file in your package/project X here:

`.r2g/smoke-test.js`

or it could be a problem with your package itself - is it missing a dependency?
is your package missing a file?



