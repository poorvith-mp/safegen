import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { decryptVault, encryptVault, PBKDF2_ITERATIONS } from '../packages/cli/dist/vault/encryption.js';
import { VaultStore } from '../packages/cli/dist/vault/store.js';

test('vault encryption is authenticated, salted, and uses the required work factor', () => {
  const encrypted = encryptVault({ entries: [{ service: 'github.com', username: 'poorvith', credential: 'secret-value' }] }, 'master-password');
  assert.equal(encrypted.kdf.iterations, 600_000);
  assert.equal(PBKDF2_ITERATIONS, 600_000);
  assert.doesNotMatch(JSON.stringify(encrypted), /secret-value/);
  assert.deepEqual(decryptVault(encrypted, 'master-password').entries[0], {
    service: 'github.com', username: 'poorvith', credential: 'secret-value',
  });
  assert.throws(() => decryptVault(encrypted, 'wrong-password'), /master password|decrypt/i);
});
test('vault store supports save, lookup, list, and delete without plaintext at rest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-'));
  const vaultPath = join(directory, 'vault.enc');
  const store = new VaultStore(vaultPath);
  await store.initialize('master-password');
  await store.save('github.com', 'poorvith', 'token-value', 'master-password');
  assert.equal((await store.get('github.com', 'poorvith', 'master-password')).credential, 'token-value');
  assert.deepEqual(await store.list('master-password'), [{ service: 'github.com', username: 'poorvith' }]);
  assert.doesNotMatch(await readFile(vaultPath, 'utf8'), /token-value/);
  assert.equal(await store.delete('github.com', 'poorvith', 'master-password'), true);
  assert.deepEqual(await store.list('master-password'), []);
});
