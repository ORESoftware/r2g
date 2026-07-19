import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const version = String(process.argv[2] || '').replace(/^v/, '');
const sha256 = String(process.argv[3] || '').trim();
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('usage: generate-installers.mjs VERSION SHA256');
}
if (!/^[a-fA-F0-9]{64}$/.test(sha256)) {
  throw new Error('SHA256 must be a 64-character hexadecimal digest');
}

const repo = process.env.R2G_GITHUB_REPOSITORY || 'ORESoftware/r2g';
const assetUrl = `https://github.com/${repo}/releases/download/v${version}/r2g-${version}.tgz`;
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const formula = `class R2g < Formula
  desc "Prove packages work as real downstream dependencies before release"
  homepage "https://github.com/${repo}"
  url "${assetUrl}"
  sha256 "${sha256}"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/r2g --version")
    assert_match "r2g", shell_output("#{bin}/r2g --help")
  end
end
`;

const scoop = {
  version,
  description: 'Prove packages work as real downstream dependencies before release',
  homepage: `https://github.com/${repo}`,
  license: 'MIT',
  depends: 'nodejs',
  url: assetUrl,
  hash: sha256,
  extract_dir: 'package',
  installer: {script: 'npm install --global $dir'},
  uninstaller: {script: 'npm uninstall --global r2g'},
  checkver: {github: `https://github.com/${repo}`},
  autoupdate: {url: `https://github.com/${repo}/releases/download/v$version/r2g-$version.tgz`}
};

const nuspec = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>r2g</id>
    <version>${version}</version>
    <title>r2g</title>
    <authors>ORESoftware</authors>
    <projectUrl>https://github.com/${repo}</projectUrl>
    <licenseUrl>https://github.com/${repo}/blob/dev/license.md</licenseUrl>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <description>Prove packages work as real downstream dependencies before release.</description>
    <tags>r2g package testing npm rust python go gleam cli</tags>
    <dependencies><dependency id="nodejs" version="[18.0.0,)" /></dependencies>
  </metadata>
  <files><file src="tools\\**" target="tools" /></files>
</package>
`;

const chocolateyInstall = `$ErrorActionPreference = 'Stop'
$version = '${version}'
$url = "${assetUrl}"
$packageFile = Join-Path $env:TEMP "r2g-$version.tgz"
Get-ChocolateyWebFile -PackageName 'r2g' -FileFullPath $packageFile -Url64bit $url -Checksum '${sha256}' -ChecksumType64 'sha256'
& npm install --global $packageFile
if ($LASTEXITCODE -ne 0) { throw "npm failed to install r2g ($LASTEXITCODE)" }
`;

mkdirSync(resolve(root, 'Formula'), {recursive: true});
mkdirSync(resolve(root, 'packaging/scoop'), {recursive: true});
mkdirSync(resolve(root, 'packaging/chocolatey/tools'), {recursive: true});
writeFileSync(resolve(root, 'Formula/r2g.rb'), formula);
writeFileSync(resolve(root, 'packaging/scoop/r2g.json'), `${JSON.stringify(scoop, null, 2)}\n`);
writeFileSync(resolve(root, 'packaging/chocolatey/r2g.nuspec'), nuspec);
writeFileSync(resolve(root, 'packaging/chocolatey/tools/chocolateyinstall.ps1'), chocolateyInstall);
process.stdout.write(`generated installers for r2g v${version}\n`);
