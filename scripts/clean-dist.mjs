import {existsSync, readdirSync, rmdirSync, statSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

function clean(directory, isRoot = false) {
  if (!existsSync(directory)) return;
  for (const name of readdirSync(directory)) {
    const file = join(directory, name);
    if (statSync(file).isDirectory()) {
      clean(file);
    } else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
      unlinkSync(file);
    }
  }
  if (!isRoot && readdirSync(directory).length === 0) {
    rmdirSync(directory);
  }
}

clean(fileURLToPath(new URL('../dist', import.meta.url)), true);
