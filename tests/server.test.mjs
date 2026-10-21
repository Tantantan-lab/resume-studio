import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import test from 'node:test';

async function freePort() {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function start(script, args = [], env = {}) {
  const child = spawn(process.execPath, [script, ...args], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Server startup timed out'));
    }, 5000);
    const done = (error) => {
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };
    child.stdout.once('data', () => done());
    child.once('error', done);
    child.once('exit', (code) => {
      if (code !== null) done(new Error(`Server exited with ${code}`));
    });
  });
  return child;
}

function request(port, path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

async function stop(child) {
  if (child.exitCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

test('static server accepts --port and survives malformed requests', async () => {
  const port = await freePort();
  const child = await start('scripts/serve.mjs', ['src', '--port', String(port)]);
  try {
    assert.equal((await request(port, '/')).status, 200);
    assert.equal((await request(port, '/favicon.svg')).status, 200);
    assert.equal((await request(port, '/vendor/docx.js')).status, 200);
    assert.equal((await request(port, '/%', 'GET')).status, 400);
    assert.equal((await request(port, '/%00', 'GET')).status, 400);
    assert.equal((await request(port, '/')).status, 200);
    const head = await request(port, '/', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body, '');
    assert.equal((await request(port, '/missing-file.js')).status, 404);
  } finally {
    await stop(child);
  }
});

test('Agent API rejects malformed URLs without exiting', async () => {
  const port = await freePort();
  const child = await start('scripts/agent-server.mjs', [], { AGENT_PORT: String(port) });
  try {
    assert.equal((await request(port, '/%')).status, 400);
    assert.equal((await request(port, '/%00')).status, 400);
    const health = await request(port, '/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(JSON.parse(health.body), { ok: true });
    assert.equal((await request(port, '/favicon.svg')).status, 200);
    assert.equal((await request(port, '/vendor/pdf-lib.js')).status, 200);
    const badOrigin = await request(
      port,
      '/api/resume',
      'POST',
      { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      '{}',
    );
    assert.equal(badOrigin.status, 403);
    const wrongType = await request(
      port,
      '/api/resume',
      'POST',
      { 'Content-Type': 'text/plain' },
      '{}',
    );
    assert.equal(wrongType.status, 415);
    assert.equal((await request(port, '/favicon.svg')).status, 200);
    assert.equal((await request(port, '/vendor/pdf-lib.js')).status, 200);
  } finally {
    await stop(child);
  }
});
