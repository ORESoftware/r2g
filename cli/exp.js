


const cp = require('child_process');

const k = cp.spawn('bash');

k.stdin.end(`
  
  ( cd . && find . -type f ) | xargs du --threshold=5KB

`);

k.stdout.pipe(process.stdout);
