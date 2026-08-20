# @poorvith-mp/safegen

SafeGen's zero-dependency TypeScript core for generating and auditing passwords, passphrases, PINs, and custom patterns with the runtime's native cryptographic random source.

```ts
import { calculateAudit, generatePassword } from '@poorvith-mp/safegen';

const credential = generatePassword({ length: 20 });
console.log(credential, calculateAudit(credential));
```

[Documentation](https://github.com/poorvith-mp/safegen#package-and-cli) · [SafeGen](https://safegen.poorvithmp.com)
