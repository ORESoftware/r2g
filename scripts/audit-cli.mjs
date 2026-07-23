import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';

const require = createRequire(import.meta.url);
const localRoot = process.env.R2G_FLAGS2ENV_PATH || join(homedir(), 'codes', 'ores', 'flags-2-env');
const localClient = join(localRoot, 'clients', 'nodejs', 'lib.cjs');
const localAddon = join(localRoot, 'clients', 'nodejs', 'build', 'Release', 'flags2env.node');

let f2e;
if (existsSync(localClient) && existsSync(localAddon)) {
  process.env.FLAGS2ENV_NODE_ADDON ||= localAddon;
  f2e = require(localClient);
} else {
  f2e = require('@oresoftware/f2e');
}

const configPath = resolve('.cli-flags.toml');
const report = f2e.auditConfig({configPath});
if (!report.ok) {
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(
  `flags-2-env audit passed (${report.errorCount} errors, ${report.warningCount} warnings)\n`,
);
