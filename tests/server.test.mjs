import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const port = 19580 + (process.pid % 500);
let server;
const origin = `http://127.0.0.1:${port}`;

before(async () => {
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const output = [];
  server.stdout.setEncoding('utf8').on('data', chunk => output.push(chunk));
  let last;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(`Web server exited before startup: ${output.join('')}`);
    try { if ((await fetch(origin)).ok) return; }
    catch (error) { last = error; }
    await delay(100);
  }
  throw new Error(`Web server did not start: ${last?.message}; ${output.join('')}`);
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([once(server, 'exit'), delay(2000)]);
});

test('serves the complete runnable Chinese website and its image assets', async () => {
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  const html = await page.text();
  assert.match(html, /zh-CN/);
  assert.match(html, /人生有迹/);
  assert.match(html, /src="\.\/src\/main\.js"/);
  assert.equal((await fetch(`${origin}/src/questions.js`)).status, 200);
  assert.equal((await fetch(`${origin}/src/engine.js`)).status, 200);
  assert.equal((await fetch(`${origin}/assets/poetry.svg`)).headers.get('content-type'), 'image/svg+xml');
});

test('blocks unsupported methods, path traversal and hidden project files', async () => {
  assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${origin}/.git/config`)).status, 403);
  assert.equal((await fetch(`${origin}/does-not-exist.html`)).status, 404);
  assert.equal((await fetch(`${origin}/src/../.git/config`)).status, 403);
  assert.equal((await fetch(`${origin}/src/questions.js`, { method: 'HEAD' })).status, 200);
});
