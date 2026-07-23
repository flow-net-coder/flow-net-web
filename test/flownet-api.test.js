const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const { test, after, before } = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
let child;

function waitForServer(url, attempts = 50) {
  return new Promise((resolve, reject) => {
    const tryRequest = (remaining) => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (remaining <= 0) {
            reject(new Error(`Server did not become ready at ${url}`));
            return;
          }
          setTimeout(() => tryRequest(remaining - 1), 200);
        });
    };

    tryRequest(attempts);
  });
}

before(async () => {
  child = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: '3100' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[flow-net-test] ${chunk}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[flow-net-test] ${chunk}`);
  });

  await waitForServer('http://127.0.0.1:3100/api/health');
});

after(() => {
  if (child) {
    child.kill('SIGTERM');
  }
});

test('exposes health and connected-app endpoints', async () => {
  const healthResponse = await fetch('http://127.0.0.1:3100/api/health');
  assert.equal(healthResponse.status, 200);
  const healthPayload = await healthResponse.json();
  assert.equal(healthPayload.ok, true);

  const actionsResponse = await fetch('http://127.0.0.1:3100/api/flow-net/actions?botAppId=demo');
  assert.equal(actionsResponse.status, 200);
  const actionsPayload = await actionsResponse.json();
  assert.ok(Array.isArray(actionsPayload.actions));
  assert.ok(actionsPayload.actions.length > 0);

  const webhookResponse = await fetch('http://127.0.0.1:3100/api/flow-net/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'execute_app_action', appId: 'demo' }),
  });

  assert.equal(webhookResponse.status, 200);
  const webhookPayload = await webhookResponse.json();
  assert.equal(webhookPayload.ok, true);
});
