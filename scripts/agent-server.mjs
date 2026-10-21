#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { normalizeState } from './lib/resume-schema.mjs';
import { serveStatic } from './lib/static.mjs';

const ROOT = process.cwd();
const PORT = Number(process.env.AGENT_PORT || 4178);
const STATIC_ROOT = path.resolve(fs.existsSync(path.join(ROOT, 'dist')) ? 'dist' : 'src');
const PRIVATE = path.join(ROOT, 'private');
const MASTER = path.join(PRIVATE, 'resume.json');
const IMPORT_FILE = path.join(PRIVATE, 'agent', 'resume-import.json');
const TOKEN = process.env.AGENT_TOKEN || '';
const ALLOWED_HOST = /^(127\.0\.0\.1|localhost)(:\d+)?$/;
const ALLOWED_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
const MAX_BACKUPS = 50;

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

function writeAtomic(file, value) {
  ensure(file);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

function pruneBackups() {
  const dir = path.join(PRIVATE, 'backups');
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  for (const name of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) {
    try {
      fs.unlinkSync(path.join(dir, name));
    } catch {}
  }
}

function backup() {
  if (!fs.existsSync(MASTER)) return null;
  const dest = path.join(
    PRIVATE,
    'backups',
    `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}.json`,
  );
  ensure(dest);
  fs.copyFileSync(MASTER, dest);
  pruneBackups();
  return dest;
}

const server = http.createServer((req, res) => {
  const host = req.headers.host || '';
  if (!ALLOWED_HOST.test(host)) {
    json(res, 403, { ok: false, error: 'forbidden host' });
    return;
  }
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGIN.test(origin)) {
    json(res, 403, { ok: false, error: 'forbidden origin' });
    return;
  }
  if (TOKEN && req.headers['x-agent-token'] !== TOKEN) {
    json(res, 403, { ok: false, error: 'invalid agent token' });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    json(res, 400, { ok: false, error: 'Invalid request URL' });
    return;
  }

  if (pathname === '/api/health') {
    json(res, 200, { ok: true });
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
    const stream = fs.createReadStream(MASTER);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Could not read resume');
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
    return;
  }
  if (pathname === '/api/resume' && req.method === 'POST') {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
      json(res, 415, { ok: false, error: 'Content-Type must be application/json' });
      return;
    }
    let body = '';
    let responded = false;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (!responded && body.length > 3 * 1024 * 1024) {
        responded = true;
        json(res, 413, { ok: false, error: 'body too large' });
        req.destroy();
      }
    });
    req.on('end', () => {
      if (responded) return;
      try {
        if (!body.trim()) throw new Error('empty body');
        const raw = JSON.parse(body);
        const warnings = [];
        const state = normalizeState(raw.state || raw, warnings);
        const previous = backup();
        writeAtomic(MASTER, state);
        writeAtomic(IMPORT_FILE, state);
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
  serveStatic(STATIC_ROOT, req, res, pathname);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Resume Studio + Agent API: http://127.0.0.1:${PORT}`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/resume`);
  console.log(`  POST /api/resume  (application/json; optional x-agent-token)`);
  console.log(`  static: ${STATIC_ROOT}`);
});
