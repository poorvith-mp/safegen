# @poorvithmp/safegen-cli

> Terminal credential generator, AES-256-GCM encrypted local vault, and approval-gated MCP bridge.

[![npm version](https://img.shields.io/npm/v/@poorvithmp/safegen-cli.svg)](https://www.npmjs.com/package/@poorvithmp/safegen-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

SafeGen CLI is a command-line tool and local credential vault. It also includes a Model Context Protocol (MCP) server that lets AI agents request credentials with mandatory user approval.

---

## Installation & Running

Run directly via `npx` without installing globally:

```bash
npx @poorvithmp/safegen-cli --help
```

Or install globally:

```bash
npm install -g @poorvithmp/safegen-cli
safegen --help
```

---

## Commands

### 1. Generate Credentials

Generate passwords, passphrases, PINs, and patterns directly in the terminal:

```bash
# Password with custom length and character sets
npx @poorvithmp/safegen-cli generate password --length 24 --uppercase --lowercase --numbers --symbols --audit

# Passphrase
npx @poorvithmp/safegen-cli generate passphrase --words 5 --separator - --capitalize --include-number

# Numeric PIN
npx @poorvithmp/safegen-cli generate pin --length 8

# Pattern Template (L=uppercase, l=lowercase, n=number, s=symbol)
npx @poorvithmp/safegen-cli generate pattern -t "Lnnn-Lnnn-S"
```

Adding `--audit` outputs entropy bits, strength rating, and estimated crack time.

---

### 2. Encrypted Local Vault

SafeGen includes a secure local vault stored at `~/.safegen/vault.enc`.

- **Encryption**: AES-256-GCM with a unique 32-byte salt and 12-byte IV per write.
- **Key Derivation**: PBKDF2-HMAC-SHA256 with 600,000 iterations.
- **Privacy**: Secrets and master passwords are provided interactively via masked prompts and are never accepted as command-line arguments.

```bash
# Initialize a new vault
npx @poorvithmp/safegen-cli vault init

# Save a credential
npx @poorvithmp/safegen-cli vault save --service github.com --username poorvith

# List saved services
npx @poorvithmp/safegen-cli vault list

# Retrieve a credential
npx @poorvithmp/safegen-cli vault get --service github.com --username poorvith

# Delete a credential
npx @poorvithmp/safegen-cli vault delete --service github.com --username poorvith
```

---

### 3. MCP Credential Bridge (AI Agent Integration)

Connect your local vault to AI agent platforms (such as Claude Code, Cursor, Antigravity, or any MCP client):

```bash
npx @poorvithmp/safegen-cli mcp
```

#### Configuring with Claude Code:
```bash
claude mcp add safegen -- npx @poorvithmp/safegen-cli mcp
```

#### Security & Approval Boundary:
- The MCP server exposes the `safegen_get_credential` tool.
- When an AI agent invokes the tool, SafeGen requires explicit human approval before unlocking the vault.
- All requests are logged in `~/.safegen/access.log` with timestamp and service name (never credential plaintext).

---

## License

MIT © [Poorvith M P](https://poorvithmp.com)
