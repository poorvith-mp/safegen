import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const cli = fileURLToPath(new URL('../packages/cli/dist/index.js', import.meta.url));

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

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
