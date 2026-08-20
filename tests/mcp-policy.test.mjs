import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { appendAccessLog, selectCredential } from '../packages/cli/dist/mcp/policy.js';

test('credential selection is explicit and rejects ambiguous matches', () => {
  const entries = [
    { service: 'github.com', username: 'one', credential: 'a' },
    { service: 'github.com', username: 'two', credential: 'b' },
  ];
  assert.throws(() => selectCredential(entries, 'github.com'), /multiple/i);
  assert.equal(selectCredential(entries, 'github.com', 'two').credential, 'b');
});
test('access log contains request metadata but never credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-log-'));
  const path = join(directory, 'access.log');
  await appendAccessLog(path, { service: 'github.com', username: 'poorvith', approved: false });
  const log = await readFile(path, 'utf8');
  assert.match(log, /github\.com/);
  assert.match(log, /denied/);
  assert.doesNotMatch(log, /credential/);
});
