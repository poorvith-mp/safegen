# @poorvithmp/safegen

> Typed, zero-dependency credential generation and entropy auditing for browsers and Node.js.

[![npm version](https://img.shields.io/npm/v/@poorvithmp/safegen.svg)](https://www.npmjs.com/package/@poorvithmp/safegen)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

SafeGen is built on cryptographic primitives using `globalThis.crypto.getRandomValues` with rejection sampling. It has zero dependencies, works in modern browsers and Node.js (>=20), and never falls back to predictable random generators like `Math.random`.

---

## Installation

```bash
npm install @poorvithmp/safegen
```

Or via CDN (ES modules):

```html
<script type="module">
  import { generatePassword, calculateAudit } from 'https://esm.sh/@poorvithmp/safegen';
</script>
```

---

## Quick Start

```ts
import {
  generatePassword,
  generatePassphrase,
  generatePIN,
  generatePattern,
  calculateAudit
} from '@poorvithmp/safegen';

// 1. Cryptographic Random Password
const password = generatePassword({
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
});

// 2. Memorable Passphrase
const passphrase = generatePassphrase({
  words: 4,
  separator: '-',
  capitalize: true,
  includeNumber: true,
});

// 3. Numeric PIN
const pin = generatePIN({ length: 6 });

// 4. Custom Pattern Token
const pattern = generatePattern({ template: 'Lnnn-Lnnn-S' });

// 5. Security Audit & Entropy Estimation
const audit = calculateAudit(password);
console.log(audit);
```

---

## API Reference

### `generatePassword(options?: RandomPasswordOptions): string`
Generates a random password from selected character sets with rejection sampling.
- `length` *(number, default: 16)*: Total password length.
- `uppercase` *(boolean, default: true)*: Include `A-Z`.
- `lowercase` *(boolean, default: true)*: Include `a-z`.
- `numbers` *(boolean, default: true)*: Include `0-9`.
- `symbols` *(boolean, default: true)*: Include `!@#$%^&*()_+{}[]<>?/|~=-`.

*(Alias: `generateRandomPassword`)*

### `generatePassphrase(options?: PassphraseOptions): string`
Generates a passphrase from a curated list of non-offensive words.
- `words` / `wordCount` *(number, default: 4)*: Number of words.
- `separator` *(string, default: '-')*: Delimiter between words.
- `capitalize` *(boolean, default: false)*: Capitalize each word.
- `includeNumber` *(boolean, default: false)*: Append a random number to a random word.

### `generatePIN(options?: PinOptions): string`
Generates a numeric PIN.
- `length` / `pinLength` *(number, default: 6)*: Number of digits.

### `generatePattern(options?: PatternOptions): string`
Generates a credential matching a token template:
- `L`: Uppercase character (`A-Z`)
- `l`: Lowercase character (`a-z`)
- `n`: Number (`0-9`)
- `S` / `s`: Symbol
- *Any other character*: Preserved literally (e.g. hyphens, colons).
- `template` / `pattern` *(string, default: 'Lnnn-Lnnn-S')*.

### `generateCredential(options: PasswordOptions): string`
Unified entry point that routes to the correct generator based on `options.mode` (`'random' | 'passphrase' | 'pin' | 'pattern'`).

### `calculateAudit(password: string, options?: PasswordOptions): SecurityAudit`
Evaluates the entropy, estimated cracking time, strength rating, and gives security tips.

#### `SecurityAudit` Output Object:
```ts
interface SecurityAudit {
  entropy: number;            // Entropy in bits (e.g. 128.5)
  rating: StrengthRating;    // 'Very strong' | 'Strong' | 'Medium' | 'Weak'
  timeToCrackSeconds: number; // Raw seconds estimate at 10^10 hashes/sec
  crackTime: string;          // Human-readable formatted string (e.g. "142 million years")
  crackTimeFormatted: string; // Alias for crackTime
  poolSize: number;           // Calculated character pool size
  score: number;              // 0 to 4 score
  warnings: string[];         // Explanations of vulnerabilities or weaknesses
  tips: string[];             // Recommendations for increasing resilience
}
```

---

## Cryptographic Guarantees

1. **Rejection Sampling**: Avoids modulo bias when mapping cryptographic random bytes to character pool indices.
2. **Native Web Crypto**: Uses `crypto.getRandomValues` across both Node.js (v20+) and modern browsers.
3. **Zero Telemetry**: Passwords and keys are generated strictly in memory and are never transmitted across a network.

---

## License

MIT © [Poorvith M P](https://poorvithmp.com)
