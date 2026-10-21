import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function inside(root, file) {
  return file === root || file.startsWith(root + path.sep);
}

function send(req, res, file) {
  try {
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        notFound(res);
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = fs.createReadStream(file);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Read error');
        } else {
          res.destroy();
        }
      });
      stream.pipe(res);
    });
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
  }
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

// Serve a static root, with a fallback to <root>/public for source-tree serving.
// Vite copies public/ into the dist root, so the fallback is only used for src.
export function serveStatic(root, req, res, pathname) {
  let pathName = pathname;
  if (pathName.endsWith('/')) pathName += 'index.html';
  if (pathName.includes('\0')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }
  const file = path.resolve(root, '.' + pathName);
  if (!inside(root, file)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  fs.stat(file, (err, stat) => {
    if (!err && stat.isFile()) {
      send(req, res, file);
      return;
    }
    const publicFile = path.resolve(root, 'public', '.' + pathName);
    if (!inside(root, publicFile)) {
      notFound(res);
      return;
    }
    send(req, res, publicFile);
  });
}
