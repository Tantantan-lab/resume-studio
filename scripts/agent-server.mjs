#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeState } from './lib/resume-schema.mjs';

const ROOT = process.cwd();
const PORT = Number(process.env.AGENT_PORT || 4178);
const STATIC_ROOT = path.resolve(fs.existsSync(path.join(ROOT, 'dist')) ? 'dist' : 'src');
const PRIVATE = path.join(ROOT, 'private');
const MASTER = path.join(PRIVATE, 'resume.json');
const IMPORT_FILE = path.join(PRIVATE, 'agent', 'resume-import.json');
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
  '.ico': 'image/x-icon',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body, null, 2));
}

function ensure(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function backup() {
  if (!fs.existsSync(MASTER)) return null;
  const dest = path.join(
    PRIVATE,
    'backups',
    `${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  ensure(dest);
  fs.copyFileSync(MASTER, dest);
  return dest;
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(STATIC_ROOT, '.' + pathname);
  if (file !== STATIC_ROOT && !file.startsWith(STATIC_ROOT + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    json(res, 400, { ok: false, error: 'Invalid request URL' });
    return;
  }

  if (pathname === '/api/health') {
    json(res, 200, { ok: true, master: MASTER, staticRoot: STATIC_ROOT });
    return;
  }
  if (pathname === '/api/resume' && req.method === 'GET') {
    if (!fs.existsSync(MASTER)) {
      json(res, 404, {
        ok: false,
        error: '还没有 private/resume.json；先用应用导出或运行 scripts/agent.mjs apply。',
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(MASTER).pipe(res);
    return;
  }
  if (pathname === '/api/resume' && req.method === 'POST') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 3 * 1024 * 1024) {
        json(res, 413, { ok: false, error: 'body too large' });
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        if (!body.trim()) throw new Error('empty body');
        const raw = JSON.parse(body);
        const warnings = [];
        const state = normalizeState(raw.state || raw, warnings);
        const previous = backup();
        ensure(MASTER);
        fs.writeFileSync(MASTER, JSON.stringify(state, null, 2) + '\n');
        ensure(IMPORT_FILE);
        fs.writeFileSync(IMPORT_FILE, JSON.stringify(state, null, 2) + '\n');
        json(res, 200, {
          ok: true,
          title: state.meta.title,
          importPath: IMPORT_FILE,
          backup: previous,
          warnings,
        });
      } catch (error) {
        json(res, 400, { ok: false, error: error.message || String(error) });
      }
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { ok: false, error: 'method not allowed' });
    return;
  }
  serveStatic(req, res, pathname);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Resume Studio + Agent API: http://127.0.0.1:${PORT}`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/resume`);
  console.log(`  POST /api/resume  (bare state or { state })`);
  console.log(`  static: ${STATIC_ROOT}`);
});
