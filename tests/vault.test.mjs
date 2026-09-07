import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, writeFile, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

import { decryptVault, encryptVault, PBKDF2_ITERATIONS } from '../packages/cli/dist/vault/encryption.js';
import { registerVault } from '../packages/cli/dist/commands/vault.js';
import { VaultStore } from '../packages/cli/dist/vault/store.js';

const execFileAsync = promisify(execFile);

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

test('vault initialization is exclusive and preserves an existing vault', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-init-'));
  const store = new VaultStore(join(directory, 'vault.enc'));
  await store.initialize('master-password');
  await store.save('github.com', 'owner', 'token-value', 'master-password');

  await assert.rejects(store.initialize('different-password'), /already exists/i);
  assert.equal((await store.get('github.com', 'owner', 'master-password')).credential, 'token-value');
});

test('concurrent saves from separate processes preserve every entry and clean temporary files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-concurrent-'));
  const vaultPath = join(directory, 'vault.enc');
  await new VaultStore(vaultPath).initialize('master-password');
  const storeModule = pathToFileURL(resolve('packages/cli/dist/vault/store.js')).href;
  const script = `import { VaultStore } from ${JSON.stringify(storeModule)};\nconst [path, username] = process.argv.slice(1);\nawait new VaultStore(path).save('github.com', username, 'token-' + username, 'master-password');`;

  await Promise.all(['one', 'two', 'three', 'four'].map((username) =>
    execFileAsync(process.execPath, ['--input-type=module', '--eval', script, vaultPath, username]),
  ));

  assert.deepEqual(
    (await new VaultStore(vaultPath).list('master-password')).map(({ username }) => username).sort(),
    ['four', 'one', 'three', 'two'],
  );
  assert.deepEqual((await readdir(directory)).sort(), ['vault.enc']);
});

test('delete rejects an ambiguous service and leaves every credential intact', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-delete-'));
  const store = new VaultStore(join(directory, 'vault.enc'));
  await store.initialize('master-password');
  await store.save('github.com', 'one', 'token-one', 'master-password');
  await store.save('github.com', 'two', 'token-two', 'master-password');

  await assert.rejects(store.delete('github.com', undefined, 'master-password'), /multiple|username/i);
  assert.equal((await store.list('master-password')).length, 2);
});

test('an aged mutation lock is never stolen and a blocked write leaves the vault intact', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-lock-'));
  const vaultPath = join(directory, 'vault.enc');
  const store = new VaultStore(vaultPath);
  await store.initialize('master-password');
  const original = await readFile(vaultPath, 'utf8');
  const lockPath = `${vaultPath}.lock`;
  await writeFile(lockPath, 'active-owner');
  const old = new Date(Date.now() - 120_000);
  await utimes(lockPath, old, old);
  const now = Date.now();
  let calls = 0;
  context.mock.method(Date, 'now', () => now + (calls++ ? 30_001 : 0));
  await assert.rejects(store.save('github.com', 'owner', 'token-value', 'master-password'), /busy|lock/i);
  assert.equal(await readFile(lockPath, 'utf8'), 'active-owner');
  assert.equal(await readFile(vaultPath, 'utf8'), original);
});

test('Windows transient lock sharing errors retry without deleting another lock', { skip: process.platform !== 'win32' }, async context => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-sharing-'));
  const vaultPath = join(directory, 'vault.enc');
  const store = new VaultStore(vaultPath);
  await store.initialize('master-password');
  const originalOpen = fs.promises.open;
  let interrupted = false;
  context.mock.method(fs.promises, 'open', async (path, ...args) => {
    if (path === `${vaultPath}.lock` && !interrupted) {
      interrupted = true;
      throw Object.assign(new Error('Sharing violation'), { code: 'EPERM' });
    }
    return originalOpen(path, ...args);
  });
  syncBuiltinESMExports();
  context.after(() => { context.mock.restoreAll(); syncBuiltinESMExports(); });
  await store.save('github.com', 'owner', 'synthetic-token', 'master-password');
  assert.equal(interrupted, true);
  assert.equal((await store.list('master-password')).length, 1);
});

test('vault rejects malformed envelopes, malformed entries, and oversized files', async () => {
  const encrypted = encryptVault({ entries: [] }, 'master-password');
  assert.throws(
    () => decryptVault({ ...encrypted, kdf: { ...encrypted.kdf, name: 'scrypt' } }, 'master-password'),
    /vault format|envelope/i,
  );
  assert.throws(
    () => decryptVault(encryptVault({ entries: [{ service: 'github.com', username: 'owner', credential: 42 }] }, 'master-password'), 'master-password'),
    /vault data|entry/i,
  );

  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-size-'));
  const vaultPath = join(directory, 'vault.enc');
  await writeFile(vaultPath, ' '.repeat(1_048_577));
  await assert.rejects(new VaultStore(vaultPath).read('master-password'), /size|large/i);
});

test('password rotation re-encrypts the vault and invalidates the old password', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-rotate-'));
  const store = new VaultStore(join(directory, 'vault.enc'));
  await store.initialize('old-password');
  await store.save('github.com', 'owner', 'token-value', 'old-password');

  await store.rotatePassword('old-password', 'new-password');

  await assert.rejects(store.read('old-password'), /master password|decrypt/i);
  assert.equal((await store.get('github.com', 'owner', 'new-password')).credential, 'token-value');
});

test('encrypted backup and restore preserve data and require explicit overwrite', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-vault-backup-'));
  const source = new VaultStore(join(directory, 'source.enc'));
  const backupPath = join(directory, 'backup.enc');
  await source.initialize('master-password');
  await source.save('github.com', 'owner', 'token-value', 'master-password');
  await source.backup(backupPath, 'master-password');
  assert.doesNotMatch(await readFile(backupPath, 'utf8'), /token-value/);
  await assert.rejects(source.backup(backupPath, 'master-password'), /already exists|overwrite/i);

  const restored = new VaultStore(join(directory, 'restored.enc'));
  await restored.restore(backupPath, 'master-password');
  assert.equal((await restored.get('github.com', 'owner', 'master-password')).credential, 'token-value');

  const occupied = new VaultStore(join(directory, 'occupied.enc'));
  await occupied.initialize('other-password');
  await assert.rejects(occupied.restore(backupPath, 'master-password'), /already exists|overwrite/i);
  await occupied.restore(backupPath, 'master-password', true);
  assert.equal((await occupied.get('github.com', 'owner', 'master-password')).credential, 'token-value');
});

test('vault get directs users to the local action broker without requesting a secret', async () => {
  const program = new Command().exitOverride();
  registerVault(program);
  await assert.rejects(
    program.parseAsync(['node', 'safegen', 'vault', 'get']),
    /local action broker/i,
  );
});
