$ErrorActionPreference = 'Stop'
& npm uninstall --global r2g
if ($LASTEXITCODE -ne 0) { throw "npm failed to uninstall r2g ($LASTEXITCODE)" }
