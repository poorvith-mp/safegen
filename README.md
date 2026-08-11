# SafeGen

SafeGen generates random passwords, passphrases, numeric PINs, and custom patterns in the browser. Generation uses `crypto.getRandomValues` with rejection sampling; it does not fall back to `Math.random`.

## Strength estimates

Entropy and crack-time figures are estimates. The calculator assumes uniform choices from the stated pool and 100 billion offline guesses per second. Real results depend on an attacker's hardware, the storage algorithm used by a service, predictable user choices, leaks, and reuse. No password is unbreakable.

## Local history

History is optional in practice: an item is added when you copy it. SafeGen stores at most 50 copied secrets in this browser's local storage, together with generation mode, estimated rating, entropy, and time. The history is not encrypted. Use **Clear history** to remove it from local storage.

Generated secrets are not uploaded. Vercel Analytics is enabled for aggregate site-usage measurement and does not receive generated values.

## Local development

```bash
npm install
npm run dev
```

Create a production bundle with `npm run build`.

Built by [Poorvith M P](https://poorvithmp.com) and released under the MIT licence.
