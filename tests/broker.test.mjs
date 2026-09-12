import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { syncBuiltinESMExports } from 'node:module';

const brokerModule = await import('../packages/cli/dist/broker/server.js').catch(() => ({}));
const actionModule = await import('../packages/cli/dist/broker/actions.js').catch(() => ({}));
const clientModule = await import('../packages/cli/dist/broker/client.js').catch(() => ({}));
const configModule = await import('../packages/cli/dist/broker/config.js');
const github = { id: 'work', provider: 'github', repository: 'example/project' };
const cloudflare = { id: 'edge', provider: 'cloudflare', accountId: 'a'.repeat(32), worker: 'example-worker' };
const fixtureSecret = 'synthetic-token-DO-NOT-RETURN';

test('provider actions pin destination and only return approved schema fields', async () => {
  assert.equal(typeof actionModule.executeAction, 'function');
  const calls = [];
  const transport = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: 42, status: 'completed', conclusion: 'success', name: fixtureSecret, token: fixtureSecret, html_url: 'https://evil.test/' }));
  };
  const result = await actionModule.executeAction(github, { connection: 'work', action: 'github.run-status', runId: 42 }, fixtureSecret, transport);
  assert.deepEqual(result, { action: 'github.run-status', runId: 42, status: 'completed', conclusion: 'success' });
  assert.equal(calls[0].url, 'https://api.github.com/repos/example/project/actions/runs/42');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${fixtureSecret}`);
  assert.doesNotMatch(JSON.stringify(result), /synthetic|evil/);
  await assert.rejects(() => actionModule.executeAction(github, { connection: 'work', action: 'github.run-status', runId: '../secrets' }, fixtureSecret, transport));
  assert.equal(calls.length, 1);
});

test('provider redirects, oversized responses and sensitive errors fail closed', async () => {
  assert.equal(typeof actionModule.executeAction, 'function');
  for (const transport of [
    async () => new Response(fixtureSecret, { status: 302, headers: { Location: 'https://evil.test' } }),
    async () => new Response(fixtureSecret, { status: 401 }),
    async () => { throw new Error(fixtureSecret); },
    async () => new Response('x'.repeat(300_000)),
  ]) {
    await assert.rejects(() => actionModule.executeAction(github, { connection: 'work', action: 'github.run-status', runId: 42 }, fixtureSecret, transport), error => {
      assert.doesNotMatch(error.message, /synthetic|evil/);
      return true;
    });
  }
});

test('Cloudflare promotes only the approved immutable version', async () => {
  assert.equal(typeof actionModule.executeAction, 'function');
  const versionId = '12345678-1234-4234-8234-123456789abc';
  let body;
  const result = await actionModule.executeAction(cloudflare, { connection: 'edge', action: 'cloudflare.deploy-version', versionId }, fixtureSecret, async (url, init) => {
    assert.equal(String(url), `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/workers/scripts/example-worker/deployments`);
    body = JSON.parse(init.body);
    return new Response(JSON.stringify({ success: true, result: { id: versionId, secret: fixtureSecret } }));
  });
  assert.deepEqual(body, { strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] });
  assert.deepEqual(result, { action: 'cloudflare.deploy-version', deploymentId: versionId });
});

async function fixture(t) {
  assert.equal(typeof brokerModule.startBroker, 'function');
  const dir = await mkdtemp(join(tmpdir(), 'safegen-broker-test-'));
  let calls = 0;
  const broker = await brokerModule.startBroker({
    connections: [github], logPath: join(dir, 'activity.jsonl'),
    vault: { read: async password => { if (password !== 'synthetic-master') throw new Error('bad'); return { entries: [] }; }, get: async () => ({ credential: fixtureSecret }) },
    transport: async () => { calls++; return new Response(JSON.stringify({ id: 42, status: 'completed', conclusion: 'success', token: fixtureSecret })); },
  });
  t.after(() => broker.close());
  return { broker, calls: () => calls };
}

async function submit(broker) {
  const response = await fetch(`${broker.url}/v1/requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ connection: 'work', action: 'github.run-status', runId: 42 }) });
  assert.equal(response.status, 202);
  const request = await response.json();
  assert.equal(request.status, 'pending');
  assert.doesNotMatch(JSON.stringify(request), /token|password|control/);
  return request;
}

async function owner(broker, values) {
  const page = await (await fetch(broker.controlUrl)).text();
  const csrf = page.match(/name="csrf" value="([^"]+)"/)[1];
  return fetch(broker.controlUrl, { method: 'POST', redirect: 'manual', headers: { Origin: broker.url, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf, ...values }) });
}

test('real broker requires private local unlock and one-use approval, returns no credential', async t => {
  const { broker, calls } = await fixture(t);
  const request = await submit(broker);
  assert.equal(calls(), 0);
  assert.equal((await fetch(`${broker.url}/v1/credentials`)).status, 404);
  assert.equal((await owner(broker, { operation: 'approve', requestId: request.requestId })).status, 409);
  assert.equal((await owner(broker, { operation: 'unlock', password: 'synthetic-master' })).status, 303);
  assert.equal((await owner(broker, { operation: 'approve', requestId: request.requestId })).status, 303);
  const result = await (await fetch(`${broker.url}/v1/requests/${request.requestId}`)).json();
  assert.equal(result.status, 'completed');
  assert.equal(result.result.status, 'completed');
  assert.doesNotMatch(JSON.stringify(result), /synthetic|credential|password/);
  assert.equal((await owner(broker, { operation: 'approve', requestId: request.requestId })).status, 409);
  assert.equal(calls(), 1);
});

test('denial and locking revoke pending requests; browser-origin agent requests are rejected', async t => {
  const { broker, calls } = await fixture(t);
  const request = await submit(broker);
  await owner(broker, { operation: 'deny', requestId: request.requestId });
  assert.equal((await (await fetch(`${broker.url}/v1/requests/${request.requestId}`)).json()).status, 'denied');
  const next = await submit(broker);
  await owner(broker, { operation: 'lock' });
  assert.equal((await (await fetch(`${broker.url}/v1/requests/${next.requestId}`)).json()).status, 'revoked');
  assert.equal((await fetch(`${broker.url}/v1/requests`, { method: 'POST', headers: { Origin: 'https://evil.test', 'content-type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal((await fetch(broker.controlUrl, { method: 'POST', headers: { Origin: 'https://evil.test' }, body: 'operation=unlock&password=x' })).status, 403);
  assert.equal(calls(), 0);
});

test('agent client accepts only loopback broker URLs and projects safe responses', async t => {
  assert.equal(typeof clientModule.BrokerClient, 'function');
  for (const url of ['https://evil.test', 'http://127.0.0.1:1234/control/x', 'http://user:pass@127.0.0.1:1234', 'http://localhost:1234']) assert.throws(() => new clientModule.BrokerClient(url));
  const { broker } = await fixture(t);
  const client = new clientModule.BrokerClient(broker.url);
  assert.deepEqual(await client.connections(), { connections: [{ id: 'work', provider: 'github', actions: ['github.run-status', 'github.rerun'] }] });
  const pending = await client.request({ connection: 'work', action: 'github.run-status', runId: 42 });
  assert.equal(pending.status, 'pending');
  assert.equal((await client.status(pending.requestId)).status, 'pending');
  await assert.rejects(() => client.status('../control/x'));
  await assert.rejects(() => client.request({ connection: 'work', action: 'github.run-status', runId: 42, url: 'https://evil.test' }));
});

test('request expiry blocks approval and provider dispatch', async t => {
  assert.equal(typeof brokerModule.startBroker, 'function');
  const dir = await mkdtemp(join(tmpdir(), 'safegen-expiry-'));
  let called = false;
  const broker = await brokerModule.startBroker({ connections: [github], logPath: join(dir, 'log'), requestTtlMs: 20, vault: { read: async () => ({ entries: [] }), get: async () => { called = true; return { credential: fixtureSecret }; } } });
  t.after(() => broker.close());
  const pending = await submit(broker);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal((await (await fetch(`${broker.url}/v1/requests/${pending.requestId}`)).json()).status, 'expired');
  assert.equal((await owner(broker, { operation: 'approve', requestId: pending.requestId })).status, 409);
  assert.equal(called, false);
});

test('concurrent revocations persist both removals without resurrecting connections', async t => {
  const home = await mkdtemp(join(tmpdir(), 'safegen-revocations-'));
  const connections = [github, { ...github, id: 'second' }];
  await configModule.writeConnections(home, connections);
  const broker = await brokerModule.startBroker({
    connections, logPath: join(home, 'activity.jsonl'),
    vault: { read: async () => ({ entries: [] }), get: async () => ({ credential: fixtureSecret }) },
    revokeConnection: async id => {
      const snapshot = await configModule.readConnections(home);
      await new Promise(resolve => setTimeout(resolve, 40));
      await configModule.writeConnections(home, snapshot.filter(connection => connection.id !== id));
    },
  });
  t.after(() => broker.close());
  const responses = await Promise.all(connections.map(connection => owner(broker, { operation: 'revoke', connection: connection.id })));
  assert.deepEqual(responses.map(response => response.status), [303, 303]);
  assert.deepEqual(await configModule.readConnections(home), []);
  assert.deepEqual(await (await fetch(`${broker.url}/v1/connections`)).json(), { connections: [] });
});

test('revocation while submission is logging cannot enqueue a stale connection', async t => {
  const { broker, calls } = await fixture(t);
  const original = fs.promises.appendFile;
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  let started;
  const seen = new Promise(resolve => { started = resolve; });
  fs.promises.appendFile = async (...args) => {
    if (String(args[1]).includes('"event":"requested"')) { started(); await blocked; }
    return original(...args);
  };
  syncBuiltinESMExports();
  t.after(() => { fs.promises.appendFile = original; syncBuiltinESMExports(); release(); });
  const submission = fetch(`${broker.url}/v1/requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ connection: 'work', action: 'github.run-status', runId: 42 }) });
  await seen;
  await owner(broker, { operation: 'revoke', connection: 'work' });
  release();
  assert.equal((await submission).status, 409);
  assert.equal(calls(), 0);
});

test('deadline passing during completion logging prevents result release', async t => {
  const { broker } = await fixture(t);
  const entry = await submit(broker);
  await owner(broker, { operation: 'unlock', password: 'synthetic-master' });
  const original = fs.promises.appendFile;
  const originalNow = Date.now;
  fs.promises.appendFile = async (...args) => {
    await original(...args);
    if (String(args[1]).includes('"event":"completed"')) Date.now = () => entry.expiresAt + 1;
  };
  syncBuiltinESMExports();
  t.after(() => { fs.promises.appendFile = original; Date.now = originalNow; syncBuiltinESMExports(); });
  await owner(broker, { operation: 'approve', requestId: entry.requestId });
  const state = await (await fetch(`${broker.url}/v1/requests/${entry.requestId}`)).json();
  assert.equal(state.status, 'expired');
  assert.equal(state.result, undefined);
});

function createTarball(version, packageName = '@poorvithmp/safegen-cli') {
  const pkgJson = Buffer.from(JSON.stringify({ name: packageName, version }), 'utf8');
  const header = Buffer.alloc(512);
  header.write('package/package.json', 0, 100, 'utf8');
  const sizeOctal = pkgJson.length.toString(8).padStart(11, '0') + ' ';
  header.write(sizeOctal, 124, 12, 'utf8');
  const contentPadded = Buffer.alloc(Math.ceil(pkgJson.length / 512) * 512);
  pkgJson.copy(contentPadded);
  const endBlocks = Buffer.alloc(1024);
  return gzipSync(Buffer.concat([header, contentPadded, endBlocks]));
}

test('npm.view-latest pins package, returns validated semver, strips extra fields and fails closed on error', async () => {
  assert.equal(typeof actionModule.executeAction, 'function');
  const connection = { id: 'pkg', provider: 'npm', package: '@poorvithmp/safegen-cli', tarballDir: '/fake/dir' };
  let calledUrl = '';
  const transport = async (url) => {
    calledUrl = String(url);
    return new Response(JSON.stringify({
      name: '@poorvithmp/safegen-cli',
      'dist-tags': { latest: '3.0.0', beta: '3.1.0-beta.0' },
      versions: { '3.0.0': { foo: 'bar', secret: fixtureSecret } },
      time: { modified: '2026-09-12' },
      secret: fixtureSecret,
    }));
  };
  const result = await actionModule.executeAction(connection, { connection: 'pkg', action: 'npm.view-latest' }, fixtureSecret, transport);
  assert.deepEqual(result, { action: 'npm.view-latest', package: '@poorvithmp/safegen-cli', latest: '3.0.0' });
  assert.equal(calledUrl, 'https://registry.npmjs.org/@poorvithmp%2Fsafegen-cli');
  assert.doesNotMatch(JSON.stringify(result), /synthetic|secret|beta|versions/);

  await assert.rejects(
    () => actionModule.executeAction(connection, { connection: 'pkg', action: 'npm.view-latest' }, fixtureSecret, async () => new Response('redirect', { status: 302, headers: { Location: 'https://evil.test' } })),
    /Provider action failed/
  );
  await assert.rejects(
    () => actionModule.executeAction(connection, { connection: 'pkg', action: 'npm.view-latest' }, fixtureSecret, async () => new Response('not json', { status: 200 })),
    /Provider action failed/
  );
});

test('npm.publish-tarball enforces tarball-dir boundaries and inner version match', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'safegen-tarball-test-'));
  const tarballDir = join(dir, 'allowed');
  fs.mkdirSync(tarballDir);
  const outsideDir = join(dir, 'outside');
  fs.mkdirSync(outsideDir);

  const connection = { id: 'pkg', provider: 'npm', package: '@poorvithmp/safegen-cli', tarballDir };
  const validTarball = join(tarballDir, 'safegen-cli-3.1.0.tgz');
  fs.writeFileSync(validTarball, createTarball('3.1.0'));

  const mismatchTarball = join(tarballDir, 'safegen-cli-3.0.0.tgz');
  fs.writeFileSync(mismatchTarball, createTarball('3.0.0'));

  const outsideTarball = join(outsideDir, 'safegen-cli-3.1.0.tgz');
  fs.writeFileSync(outsideTarball, createTarball('3.1.0'));

  // Path traversal with .. -> tarball not allowed
  await assert.rejects(
    () => actionModule.executeAction(connection, { connection: 'pkg', action: 'npm.publish-tarball', tarballPath: join(tarballDir, '../outside/safegen-cli-3.1.0.tgz'), version: '3.1.0' }, fixtureSecret, { otp: '123456' }),
    /tarball not allowed/
  );

  // Version mismatch -> version mismatch
  await assert.rejects(
    () => actionModule.executeAction(connection, { connection: 'pkg', action: 'npm.publish-tarball', tarballPath: mismatchTarball, version: '3.1.0' }, fixtureSecret, { otp: '123456' }),
    /version mismatch/
  );

  // Non-existent tarball -> tarball not allowed
  await assert.rejects(
    () => actionModule.executeAction(connection, { connection: 'pkg', action: 'npm.publish-tarball', tarballPath: join(tarballDir, 'nonexistent.tgz'), version: '3.1.0' }, fixtureSecret, { otp: '123456' }),
    /tarball not allowed/
  );
});

test('real broker executes npm publish with OTP without leaking OTP or secrets', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'safegen-npm-broker-'));
  const tarballDir = join(dir, 'dist');
  fs.mkdirSync(tarballDir);
  const tarballPath = join(tarballDir, 'pkg-3.1.0.tgz');
  fs.writeFileSync(tarballPath, createTarball('3.1.0'));

  const connection = { id: 'npm-pkg', provider: 'npm', package: '@poorvithmp/safegen-cli', tarballDir };
  let executedCommand = null;
  const runner = async (cmd, args, opts) => {
    executedCommand = { cmd, args, opts };
    return { exitCode: 0 };
  };

  const broker = await brokerModule.startBroker({
    connections: [connection],
    logPath: join(dir, 'activity.jsonl'),
    brokerAuditPath: join(dir, 'audit.jsonl'),
    vault: { read: async () => ({ entries: [] }), get: async () => ({ credential: fixtureSecret }) },
    commandRunner: runner,
  });
  t.after(() => broker.close());

  // Agent submits request
  const submitRes = await fetch(`${broker.url}/v1/requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ connection: 'npm-pkg', action: 'npm.publish-tarball', tarballPath, version: '3.1.0' }),
  });
  assert.equal(submitRes.status, 202);
  const req = await submitRes.json();
  assert.equal(req.status, 'pending');

  // Unlock vault
  assert.equal((await owner(broker, { operation: 'unlock', password: 'synthetic-master' })).status, 303);

  // Attempt approval without OTP -> HTTP 400
  const noOtpRes = await owner(broker, { operation: 'approve', requestId: req.requestId });
  assert.equal(noOtpRes.status, 400);

  // Attempt approval with invalid OTP -> HTTP 400
  const badOtpRes = await owner(broker, { operation: 'approve', requestId: req.requestId, otp: '123' });
  assert.equal(badOtpRes.status, 400);

  // Valid approval with 6-digit OTP
  const approveRes = await owner(broker, { operation: 'approve', requestId: req.requestId, otp: '654321' });
  assert.equal(approveRes.status, 303);

  // Request completes
  const resultRes = await fetch(`${broker.url}/v1/requests/${req.requestId}`);
  assert.equal(resultRes.status, 200);
  const resultJson = await resultRes.json();
  assert.equal(resultJson.status, 'completed');
  assert.deepEqual(resultJson.result, {
    action: 'npm.publish-tarball',
    package: '@poorvithmp/safegen-cli',
    version: '3.1.0',
    status: 'published',
  });

  // Verify command execution
  assert.equal(executedCommand.cmd, 'npm');
  assert.deepEqual(executedCommand.args, ['publish', tarballPath, '--access', 'public', '--otp', '654321']);
  assert.equal(executedCommand.opts.env.NODE_AUTH_TOKEN, fixtureSecret);

  // Verify OTP and secrets NEVER appear in result, activity log, or audit log
  assert.doesNotMatch(JSON.stringify(resultJson), /654321|synthetic/);
  const activityContent = fs.readFileSync(join(dir, 'activity.jsonl'), 'utf8');
  assert.doesNotMatch(activityContent, /654321|synthetic/);
  const auditContent = fs.readFileSync(join(dir, 'audit.jsonl'), 'utf8');
  assert.doesNotMatch(auditContent, /654321|synthetic/);
});

