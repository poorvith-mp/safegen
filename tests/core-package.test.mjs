import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateAudit,
  generatePIN,
  generatePassphrase,
  generatePassword,
  generatePattern,
} from '../packages/core/dist/index.js';

test('core generators honor their public options', () => {
  const password = generatePassword({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  assert.equal(password.length, 20);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[0-9]/);

  const passphrase = generatePassphrase({ words: 4, separator: '_', capitalize: true, includeNumber: true });
  assert.equal(passphrase.split('_').length, 4);
  assert.match(passphrase, /\d/);

  assert.match(generatePIN({ length: 8 }), /^\d{8}$/);
  assert.match(generatePattern({ template: 'LLnn-SSll' }), /^[A-Z]{2}\d{2}-.{4}$/);
});
test('audit returns the documented security fields', () => {
  const audit = calculateAudit('Correct-Horse-42!');
  assert.equal(typeof audit.entropy, 'number');
  assert.equal(typeof audit.crackTime, 'string');
  assert.match(audit.rating, /^(Weak|Medium|Strong|Very strong)$/);
  assert.ok(Array.isArray(audit.warnings));
  assert.ok(Array.isArray(audit.tips));
});
