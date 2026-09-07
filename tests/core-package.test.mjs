import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PASSPHRASE_WORDS,
  calculateAudit,
  generateCredential,
  generatePIN,
  generatePassphrase,
  generatePassword,
  generatePattern,
} from '../packages/core/dist/index.js';

test('passphrases use the complete EFF long wordlist and audit that exact search space', () => {
  assert.equal(PASSPHRASE_WORDS.length, 7776);
  const phrase = generatePassphrase({ words: 6, separator: ' ' });
  assert.ok(phrase.split(' ').every((word) => PASSPHRASE_WORDS.includes(word)));

  const audit = calculateAudit(phrase, { mode: 'passphrase', words: 6, separator: ' ' });
  assert.equal(audit.poolSize, PASSPHRASE_WORDS.length);
  assert.equal(audit.entropy, Math.round(6 * Math.log2(PASSPHRASE_WORDS.length)));
});

test('PIN mode uses pinLength even when browser random-password length is present', () => {
  assert.match(generateCredential({ mode: 'pin', length: 16, pinLength: 6 }), /^\d{6}$/);
});

test('an empty random character selection produces an empty result', () => {
  assert.equal(generatePassword({ uppercase: false, lowercase: false, numbers: false, symbols: false }), '');
});

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

test('random-mode audit does not claim resistance for arbitrary supplied passwords', () => {
  const audit = calculateAudit('PasswordPassword1', { mode: 'random' });
  assert.equal(audit.tips.some((tip) => /resistant|rainbow table/i.test(tip)), false);
  assert.equal(audit.tips.some((tip) => /excellent|high-value/i.test(tip)), false);
});
