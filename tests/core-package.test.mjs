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
test('audit returns the documented security fields and calibrated Diceware entropy', () => {
  const audit = calculateAudit('Correct-Horse-42!');
  assert.equal(typeof audit.entropy, 'number');
  assert.equal(typeof audit.crackTime, 'string');
  assert.match(audit.rating, /^(Weak|Medium|Strong|Very strong)$/);
  assert.ok(Array.isArray(audit.warnings));
  assert.ok(Array.isArray(audit.tips));

  const fiveWordAudit = calculateAudit('beacon-cipher-delta-fossil-granite', { mode: 'passphrase', words: 5 });
  // 5 words * log2(7776) = 5 * 12.9248 = 64.6 -> rounded 65 bits
  assert.equal(fiveWordAudit.entropy, 65);
  assert.equal(fiveWordAudit.rating, 'Strong');
});
