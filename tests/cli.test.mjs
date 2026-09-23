import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const cli = fileURLToPath(new URL('../packages/cli/dist/index.js', import.meta.url));
const cliPackage = JSON.parse(readFileSync(fileURLToPath(new URL('../packages/cli/package.json', import.meta.url)), 'utf8'));

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

test('CLI reports its package version', () => {
  const result = run(['--version']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), cliPackage.version);
});

test('CLI generates each credential type', () => {
  const password = run(['generate', 'password', '--length', '20', '--uppercase', '--lowercase', '--numbers', '--symbols']);
  assert.equal(password.status, 0, password.stderr);
  assert.equal(password.stdout.trim().length, 20);

  const passphrase = run(['generate', 'passphrase', '--words', '4', '--separator', '-']);
  assert.equal(passphrase.status, 0, passphrase.stderr);
  assert.equal(passphrase.stdout.trim().split('-').length, 4);

  assert.match(run(['generate', 'pin', '--length', '6']).stdout.trim(), /^\d{6}$/);
  assert.match(run(['generate', 'pattern', '--template', 'LLnn-SSll']).stdout.trim(), /^[A-Z]{2}\d{2}-.{4}$/);
});

test('CLI audit output includes rating, entropy, and crack time', () => {
  const result = run(['generate', 'password', '--length', '20', '--uppercase', '--lowercase', '--numbers', '--symbols', '--audit']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Rating:/);
  assert.match(result.stdout, /Entropy:/);
  assert.match(result.stdout, /Crack time:/);
});

test('CLI rejects ineffective self-destruct and unsafe broker startup', () => {
  const ephemeral = run(['generate', 'pin', '--ephemeral', '60']);
  assert.notEqual(ephemeral.status, 0);
  assert.equal(ephemeral.stdout, '');
  const startup = run(['broker', 'start', '--agent-user', 'invalid/identity']);
  assert.notEqual(startup.status, 0);
  assert.match(startup.stderr, /separate|different|isolat/i);
});

test('broker connect validates npm provider flags and requires tarball-dir', () => {
  const missing = run(['broker', 'connect', '--provider', 'npm', '--name', 'pkg', '--package', '@poorvithmp/safegen-cli']);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /tarball-dir/i);
});

