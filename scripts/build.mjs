import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const src = path.resolve('src');
const dist = path.resolve('dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(src, dist, { recursive: true });
fs.writeFileSync(
  path.join(dist, 'build.json'),
  JSON.stringify(
    { name: pkg.name, version: pkg.version, builtAt: new Date().toISOString() },
    null,
    2,
  ) + '\n',
);
console.log(`Built ${pkg.name}@${pkg.version} -> dist/`);
