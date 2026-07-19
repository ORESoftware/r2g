import {readFileSync} from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const tag = process.env.GITHUB_REF_NAME || process.argv[2] || '';
const expected = `v${pkg.version}`;

if (tag !== expected) {
  process.stderr.write(`release tag ${tag || '(missing)'} does not match package.json ${expected}\n`);
  process.exit(1);
}
process.stdout.write(`release tag matches package.json: ${expected}\n`);
