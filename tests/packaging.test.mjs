import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const coreDir = fileURLToPath(new URL('../packages/core', import.meta.url));
const cliDir = fileURLToPath(new URL('../packages/cli', import.meta.url));

test('core package packaging matches hygiene criteria', () => {
  const pkg = JSON.parse(readFileSync(`${coreDir}/package.json`, 'utf8'));
  assert.equal(pkg.version, '2.2.0');
  assert.equal(pkg.engines?.node, '>=22.13.0');

  const packOutput = execSync('npm pack --dry-run --json', { cwd: coreDir, encoding: 'utf8' });
  const [tarball] = JSON.parse(packOutput);
  assert.equal(tarball.name, '@poorvithmp/safegen');
  assert.equal(tarball.version, '2.2.0');

  const files = tarball.files.map(f => f.path);
  for (const file of files) {
    assert.doesNotMatch(file, /^(tests\/|\.agents\/|docs\/|src\/)/, `Forbidden file included: ${file}`);
    assert.match(file, /^(LICENSE|README\.md|package\.json|dist\/)/, `Unexpected file included: ${file}`);
  }
});

test('cli package packaging matches hygiene criteria', () => {
  const pkg = JSON.parse(readFileSync(`${cliDir}/package.json`, 'utf8'));
  assert.equal(pkg.version, '3.1.1');
  assert.equal(pkg.engines?.node, '>=22.13.0');
  assert.equal(pkg.dependencies?.['@poorvithmp/safegen'], '2.2.0');

  const packOutput = execSync('npm pack --dry-run --json', { cwd: cliDir, encoding: 'utf8' });
  const [tarball] = JSON.parse(packOutput);
  assert.equal(tarball.name, '@poorvithmp/safegen-cli');
  assert.equal(tarball.version, '3.1.1');

  const files = tarball.files.map(f => f.path);
  for (const file of files) {
    assert.doesNotMatch(file, /^(tests\/|\.agents\/|docs\/|src\/)/, `Forbidden file included: ${file}`);
    assert.match(file, /^(LICENSE|README\.md|package\.json|scripts\/|dist\/)/, `Unexpected file included: ${file}`);
  }
});
