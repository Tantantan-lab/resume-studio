import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'vendor') return [];
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.(?:m?js)$/.test(entry.name) ? [file] : [];
  });
}

const files = ['src', 'scripts', 'tests']
  .flatMap(sourceFiles)
  .concat(['eslint.config.js', 'vite.config.js'])
  .sort();
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`PASS: syntax checked ${files.length} first-party JavaScript files`);
