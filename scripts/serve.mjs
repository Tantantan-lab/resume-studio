import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { serveStatic } from './lib/static.mjs';

const args = process.argv.slice(2);
const root = path.resolve(args[0] || 'src');
const portFlag = args.indexOf('--port');
const port = Number(portFlag >= 0 ? args[portFlag + 1] : args[1] || process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(
    'Port must be an integer between 1 and 65535. Example: npm run preview -- --port 4180',
  );
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(
    `Missing ${path.join(root, 'index.html')}. Run npm run build before previewing dist.`,
  );
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  serveStatic(root, req, res, pathname);
});

server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Try npm run preview -- --port ${port + 1}`
      : `Could not start local server: ${error.message}`,
  );
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Resume Studio: ${root} -> http://127.0.0.1:${port}`);
});
