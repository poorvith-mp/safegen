import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';

const brokerModule = await import('../packages/cli/dist/broker/server.js').catch(() => ({}));
const auditModule = await import('../packages/cli/dist/broker/audit.js').catch(() => ({}));
const { registerBroker } = await import('../packages/cli/dist/commands/broker.js').catch(() => ({}));

const github = { id: 'work', provider: 'github', repository: 'example/project' };
const fixtureToken = 'super-secret-provider-token-12345';
const fixtureOtp = '987654';
const fixtureMaster = 'vault-master-pass';

test('audit log records exactly 4 events for a successful cycle with matching requestId', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'safegen-audit-test-'));
  const auditPath = join(dir, 'broker-audit.jsonl');
  const broker = await brokerModule.startBroker({
    connections: [github],
    logPath: join(dir, 'activity.jsonl'),
    brokerAuditPath: auditPath,
    agentUser: 'test-agent',
    vault: {
      read: async (pass) => {
        if (pass !== fixtureMaster) throw new Error('bad');
        return { entries: [] };
      },
      get: async () => ({ credential: fixtureToken }),
    },
    transport: async () =>
      new Response(JSON.stringify({ id: 42, status: 'completed', conclusion: 'success', token: fixtureToken })),
  });
  t.after(() => broker.close());

  const submitRes = await fetch(`${broker.url}/v1/requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ connection: 'work', action: 'github.run-status', runId: 42 }),
  });
  assert.equal(submitRes.status, 202);
  const { requestId } = await submitRes.json();

  const page = await (await fetch(broker.controlUrl)).text();
  const csrf = page.match(/name="csrf" value="([^"]+)"/)[1];
  await fetch(broker.controlUrl, {
    method: 'POST',
    headers: { Origin: broker.url, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrf, operation: 'unlock', password: fixtureMaster }),
  });
  await fetch(broker.controlUrl, {
    method: 'POST',
    headers: { Origin: broker.url, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrf, operation: 'approve', requestId }),
  });

  const statusRes = await fetch(`${broker.url}/v1/requests/${requestId}`);
  const statusBody = await statusRes.json();
  assert.equal(statusBody.status, 'completed');

  const lines = (await readFile(auditPath, 'utf8'))
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  assert.equal(lines.length, 4);
  const events = lines.map((l) => l.event);
  assert.deepEqual(events, ['request', 'approve', 'execute', 'result']);
  for (const line of lines) {
    assert.equal(line.requestId, requestId);
    assert.equal(line.connection, 'work');
    assert.equal(line.action, 'github.run-status');
    assert.ok(line.ts);
    assert.equal(line.agentUser, 'test-agent');
  }
  assert.equal(lines[3].outcome, 'ok');

  const rawLog = await readFile(auditPath, 'utf8');
  assert.doesNotMatch(rawLog, new RegExp(fixtureToken));
  assert.doesNotMatch(rawLog, new RegExp(fixtureOtp));
  assert.doesNotMatch(rawLog, new RegExp(fixtureMaster));
  assert.doesNotMatch(rawLog, /control/i);
});

test('broker audit supports --json, --csv, --since, and neutralizes formula injection', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'safegen-audit-cli-'));
  const auditPath = join(dir, 'broker-audit.jsonl');
  const sampleEntries = [
    {
      ts: '2026-09-10T10:00:00.000Z',
      event: 'request',
      requestId: 'req-1',
      connection: 'work',
      action: 'github.run-status',
      params: { runId: 10 },
      agentUser: 'agent',
    },
    {
      ts: '2026-09-10T10:00:01.000Z',
      event: 'approve',
      requestId: 'req-1',
      connection: 'work',
      action: 'github.run-status',
      agentUser: 'agent',
    },
    {
      ts: '2026-09-12T12:00:00.000Z',
      event: 'request',
      requestId: 'req-2',
      connection: 'work',
      action: 'github.run-status',
      params: { runId: '=1+1' },
      agentUser: 'agent',
    },
  ];
  await writeFile(auditPath, sampleEntries.map((e) => JSON.stringify(e)).join('\n') + '\n');

  let jsonOutput = '';
  const origStdout = process.stdout.write;
  process.stdout.write = (chunk) => {
    jsonOutput += String(chunk);
    return true;
  };
  try {
    const program = new Command().exitOverride();
    registerBroker(program);
    process.env.SAFEGEN_HOME = dir;
    await program.parseAsync(['node', 'safegen', 'broker', 'audit', '--json']);
  } finally {
    process.stdout.write = origStdout;
  }
  const parsedJson = JSON.parse(jsonOutput);
  assert.equal(parsedJson.length, 3);
  assert.equal(parsedJson[0].requestId, 'req-1');

  let sinceOutput = '';
  process.stdout.write = (chunk) => {
    sinceOutput += String(chunk);
    return true;
  };
  try {
    const program = new Command().exitOverride();
    registerBroker(program);
    await program.parseAsync(['node', 'safegen', 'broker', 'audit', '--json', '--since', '2026-09-11T00:00:00.000Z']);
  } finally {
    process.stdout.write = origStdout;
  }
  const parsedSince = JSON.parse(sinceOutput);
  assert.equal(parsedSince.length, 1);
  assert.equal(parsedSince[0].requestId, 'req-2');

  let csvOutput = '';
  process.stdout.write = (chunk) => {
    csvOutput += String(chunk);
    return true;
  };
  try {
    const program = new Command().exitOverride();
    registerBroker(program);
    await program.parseAsync(['node', 'safegen', 'broker', 'audit', '--csv']);
  } finally {
    process.stdout.write = origStdout;
  }
  assert.match(csvOutput, /ts,event,requestId/i);
  assert.match(csvOutput, /"'=1\+1"/);
});

test('broker audit refuses under agent user', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'safegen-audit-user-'));
  const currentUsername = (await import('node:os')).userInfo().username;
  const program = new Command().exitOverride();
  registerBroker(program);
  process.env.SAFEGEN_HOME = dir;
  await assert.rejects(
    program.parseAsync(['node', 'safegen', 'broker', 'audit', '--agent-user', currentUsername]),
    /separate OS account from the agent|isolation/i,
  );
});

test('10 MiB rotation renames existing file and continues without deletion', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'safegen-audit-rotate-'));
  const auditPath = join(dir, 'broker-audit.jsonl');
  const bigChunk = 'X'.repeat(1024 * 1024);
  for (let i = 0; i < 11; i++) {
    await writeFile(auditPath, bigChunk, { flag: 'a' });
  }

  await auditModule.appendAuditEvent(auditPath, {
    ts: new Date().toISOString(),
    event: 'request',
    requestId: 'rot-1',
  });

  const files = await readdir(dir);
  assert.equal(files.length, 2);
  assert.ok(files.some((f) => f === 'broker-audit.jsonl'));
  assert.ok(files.some((f) => /^broker-audit\..+\.jsonl$/.test(f)));
  const currentContent = await readFile(auditPath, 'utf8');
  assert.ok(currentContent.includes('rot-1'));
});

