import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const version = String(process.argv[2] || '').replace(/^v/, '');
const sha256 = String(process.argv[3] || '').trim().toLowerCase();
const commit = String(process.argv[4] || '').trim().toLowerCase();

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('usage: generate-release-set.mjs VERSION SHA256 SOURCE_COMMIT');
}
if (!/^[a-f0-9]{64}$/.test(sha256)) {
  throw new Error('SHA256 must be a 64-character hexadecimal digest');
}
if (!/^[a-f0-9]{40,64}$/.test(commit)) {
  throw new Error('SOURCE_COMMIT must be a 40- to 64-character hexadecimal Git commit');
}

const repo = process.env.R2G_GITHUB_REPOSITORY || 'ORESoftware/r2g';
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
  throw new Error('R2G_GITHUB_REPOSITORY must use owner/repository syntax');
}

const root = resolve(
  process.env.R2G_RELEASE_ROOT || fileURLToPath(new URL('../..', import.meta.url))
);
const tag = `v${version}`;
const releaseBase = `https://github.com/${repo}/releases/download/${tag}`;
const artifactName = `r2g-${version}.tgz`;
const artifactUrl = `${releaseBase}/${artifactName}`;

const releaseSet = {
  schemaVersion: 1,
  package: {
    ecosystem: 'npm',
    name: 'r2g',
    version
  },
  source: {
    forge: 'github',
    repository: `https://github.com/${repo}`,
    commit,
    tag
  },
  artifact: {
    name: artifactName,
    mediaType: 'application/gzip',
    sha256,
    url: artifactUrl,
    checksumUrl: `${artifactUrl}.sha256`
  },
  routes: [
    {
      kind: 'native-registry',
      manager: 'npm',
      coordinate: `r2g@${version}`,
      publication: 'trusted-publishing-with-provenance',
      url: `https://registry.npmjs.org/r2g/${version}`
    },
    {
      kind: 'forge-release',
      manager: 'github',
      coordinate: `${repo}@${tag}`,
      url: `https://github.com/${repo}/releases/tag/${tag}`
    },
    {
      kind: 'installer',
      manager: 'homebrew',
      definition: 'Formula/r2g.rb',
      url: `${releaseBase}/r2g.rb`
    },
    {
      kind: 'installer',
      manager: 'scoop',
      definition: 'packaging/scoop/r2g.json',
      url: `${releaseBase}/r2g.json`
    },
    {
      kind: 'installer',
      manager: 'chocolatey',
      definition: 'packaging/chocolatey/r2g.nuspec',
      publication: 'conditional-on-CHOCO_API_KEY',
      url: `${releaseBase}/r2g.${version}.nupkg`
    },
    {
      kind: 'installer',
      manager: 'shell',
      definition: 'install.sh',
      url: `${releaseBase}/install.sh`
    }
  ]
};

const releaseDir = resolve(root, 'release');
const output = resolve(releaseDir, `r2g-${version}.release-set.json`);
mkdirSync(releaseDir, {recursive: true});
writeFileSync(output, `${JSON.stringify(releaseSet, null, 2)}\n`);
process.stdout.write(`generated ${output}\n`);
