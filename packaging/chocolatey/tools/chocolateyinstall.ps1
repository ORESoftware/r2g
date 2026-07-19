$ErrorActionPreference = 'Stop'
$version = '0.3.0'
$url = "https://github.com/ORESoftware/r2g/releases/download/v0.3.0/r2g-0.3.0.tgz"
$packageFile = Join-Path $env:TEMP "r2g-$version.tgz"
Get-ChocolateyWebFile -PackageName 'r2g' -FileFullPath $packageFile -Url64bit $url -Checksum 'aa1d9c8301c4f59635930166324ee933a7b7437929a0f64ef01a47f1e436a76e' -ChecksumType64 'sha256'
& npm install --global $packageFile
if ($LASTEXITCODE -ne 0) { throw "npm failed to install r2g ($LASTEXITCODE)" }
