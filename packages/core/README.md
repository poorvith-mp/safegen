# @poorvithmp/safegen

Credential generation and generation-strength estimates for browsers and Node 20+. The core has no runtime dependencies and uses Web Crypto with rejection sampling. It does not make network requests or store generated values.

This checkout contains version 2.1.0. npm publication is separate; build this revision from the repository root with `npm ci` and `npm run build:packages`.

```ts
import {
  generatePassword, generatePassphrase, generatePIN,
  generatePattern, generateCredential, calculateAudit,
} from '@poorvithmp/safegen';

const password = generatePassword({ length: 20 });
const options = { mode: 'passphrase' as const, words: 5, separator: '-' };
const phrase = generateCredential(options);
const audit = calculateAudit(phrase, options);
const pin = generatePIN({ pinLength: 6 });
const token = generatePattern({ template: 'Lnnn-Lnnn-S' });
```

| Function | Options and defaults |
| --- | --- |
| `generatePassword` / `generateRandomPassword` | `length: 16`; `uppercase`, `lowercase`, `numbers`, `symbols` all true. At least one character from each enabled set. Returns an empty string when all sets are disabled; rejects a length shorter than the set count. |
| `generatePassphrase` | `words` / `wordCount: 4`; `separator: '-'`; `capitalize: false`; `includeNumber: false`. Number mode appends a random integer from 0 through 99 to a random word. |
| `generatePIN` | `pinLength` takes precedence over `length`; default 6 digits. |
| `generatePattern` | `template` / `pattern: 'Lnnn-Lnnn-S'`. `L` uppercase, `l` lowercase, `n` digit, `S`/`s` symbol; other characters are literal. |
| `generateCredential` | Routes by `mode`: `random`, `passphrase`, `pin` or `pattern`. |
| `calculateAudit` / `calculateDetailedAudit` | Accept the generated value and the same generator options. Returns entropy, rating, score, pool size, warnings, tips and a hypothetical cracking-time estimate. |

Lengths and word counts must be positive integers. Randomness failure is an error; there is no fallback to `Math.random`.

## Interpreting an audit

Passphrase entropy is based on the bundled 7,776-word vocabulary (about 12.92 bits per independent word). Fixed capitalization and separators add no entropy. Random number mode adds the number and position choices. PIN and pattern estimates use their respective character pools; literal pattern characters add no entropy.

The random-password estimate uses the character classes present in the supplied value. It is a heuristic, not an exact measurement of the constrained generator's distribution, and cannot establish the strength of a human-chosen password. Always pass the generation options for passphrases and patterns.

`score` is on a 0–100 scale. `rating` is `Weak`, `Medium`, `Strong` or `Very strong`. `timeToCrackSeconds` is half the estimated search space at 100 billion guesses per second; `crackTime` and `crackTimeFormatted` describe that same assumption. Actual attack rates depend on password hashing, hardware and rate limits. This is not a safety guarantee.

## Wordlist and license

Passphrases use the [EFF Large Wordlist](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt), copyright Electronic Frontier Foundation, under [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/). The source's dice labels are omitted from the generated TypeScript array; the words are preserved. The rest of SafeGen is MIT licensed.
