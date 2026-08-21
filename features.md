# features.md — SafeGen SDK, CLI & Agent Auth Bridge

| Field | Value |
|---|---|
| **Feature** | npm package + CLI vault + MCP agent-auth bridge |
| **Scope** | **MAJOR** |
| **Target version** | 2.0.0 |
| **Date** | 2026-08-20 |
| **Author** | Poorvith M P |
| **Goes to** | Codex |

---

## 1. What exists today

SafeGen is a single-page React app that generates passwords, passphrases, PINs, and custom patterns in the browser using `crypto.getRandomValues`. All generation logic lives in `src/utils/generator.ts` — five pure functions (`randomInt`, `generateRandomPassword`, `generatePassphrase`, `generatePIN`, `generatePattern`, `calculateDetailedAudit`) with no external dependencies beyond the Web Crypto API. Copied values are stored in `localStorage` (capped at 50, unencrypted) via `src/context/HistoryContext.tsx`. There is no npm package, no CLI, no `bin` field, no library build, and no tests.

## 2. What changes

SafeGen becomes three things:

1. **`@poorvithmp/safegen` npm package** — a zero-dependency library exporting all generation and audit functions. It uses the runtime's native cryptographic random source and has no `Math.random` fallback. Importable as `import { generatePassword } from '@poorvithmp/safegen'`. The unscoped `safegen` package name is already owned by another publisher.

2. **`@poorvithmp/safegen-cli` CLI** — a terminal tool with the `safegen` binary that wraps the library and adds an encrypted local credential vault. The vault is a single JSON file encrypted with AES-256-GCM, unlocked by a master password the user sets on first use. Vault location: `~/.safegen/vault.enc`.

3. **MCP agent-auth tool** — SafeGen exposes an MCP tool (`safegen_get_credential`) that AI agents can call when they need a stored credential. The flow:
   - Agent calls `safegen_get_credential { service: "github.com" }`.
   - SafeGen uses a short-lived loopback URL to collect the sensitive master password, then uses MCP-native elicitation for explicit approval. Stdio remains reserved for JSON-RPC.
   - On approval, returns the credential to the agent's tool response. It is not pasted into a chat message, but it does enter the trusted agent host's tool context.
   - On denial, returns an error. The agent cannot retry without another user action.

   This removes the need to paste a credential into chat, adds an explicit approval gate per request, and encrypts the vault at rest. It does not make the credential invisible to the trusted agent host receiving the tool result.

## 3. Why now

AI agents (Claude Code, Codex, coding assistants) increasingly act on behalf of users — cloning repos, deploying, managing services. Every one of them hits the same wall: "I need your GitHub token / API key / password." Today the user either pastes it into chat (logged, cached, leaked in transcripts) or does the auth step manually (breaks the agent workflow). No existing tool bridges this gap with an approval-gated credential provider designed for agent consumption. 1Password CLI and Bitwarden CLI exist but are not MCP-native and require their own account setup. SafeGen already has the generation logic — adding a vault and agent bridge makes it the missing link.

## 4. Acceptance criteria

### npm package
- [x] `npm install @poorvithmp/safegen` installs successfully and exposes `generatePassword`, `generatePassphrase`, `generatePIN`, `generatePattern`, `calculateAudit` as named exports.
- [x] Generation uses `crypto.randomBytes` in Node and `crypto.getRandomValues` in browsers, auto-detected at runtime. No `Math.random` fallback.
- [x] All options from the current web UI (length, character sets, word count, separator, capitalize, include number, PIN length, pattern template) are supported as typed function parameters.
- [x] `calculateAudit(password)` returns entropy, crack time, rating, warnings, and tips — matching the web app's output.
- [x] Package has zero runtime dependencies.
- [x] Package ships with TypeScript type declarations.
- [x] Package is tree-shakeable (ESM with `"sideEffects": false`).

### CLI
- [x] `npx @poorvithmp/safegen-cli generate password --length 20 --uppercase --lowercase --numbers --symbols` prints a password to stdout.
- [x] `npx @poorvithmp/safegen-cli generate passphrase --words 4 --separator -` prints a passphrase.
- [x] `npx @poorvithmp/safegen-cli generate pin --length 6` prints a PIN.
- [x] `npx @poorvithmp/safegen-cli generate pattern -t "LLnn-SSll"` prints a pattern-filled string.
- [x] All generate commands accept `--audit` flag that appends entropy/rating/crack-time to output.
- [x] `npx @poorvithmp/safegen-cli vault init` prompts for a master password and creates `~/.safegen/vault.enc`.
- [x] `npx @poorvithmp/safegen-cli vault save --service github.com --username poorvith` prompts for the credential value (never taken as a CLI argument), encrypts, and stores it.
- [x] `npx @poorvithmp/safegen-cli vault get --service github.com` prompts for master password, decrypts, prints the credential.
- [x] `npx @poorvithmp/safegen-cli vault list` shows all saved service names (not credentials).
- [x] `npx @poorvithmp/safegen-cli vault delete --service github.com` removes an entry after confirmation.
- [x] Vault file is AES-256-GCM encrypted with a key derived from the master password via PBKDF2-HMAC-SHA256 (600k iterations, random salt).
- [x] CLI exits with appropriate codes: 0 success, 1 error, 130 user interrupt.

### MCP agent-auth bridge
- [x] Running `npx @poorvithmp/safegen-cli mcp` starts a stdio MCP server exposing a `safegen_get_credential` tool.
- [x] Tool schema accepts `{ service: string, username?: string }` and returns `{ credential: string, service: string, username: string }`.
- [x] Before returning any credential, the MCP server requests explicit approval through MCP elicitation. Credential is returned only after an accepted approval response.
- [x] Denial returns an MCP tool error with message `"User denied credential access"`.
- [x] If the vault is locked, the MCP server uses URL-mode elicitation and a short-lived loopback page for the master password before the approval prompt.
- [x] MCP server logs every credential request (timestamp, service, approved/denied) to `~/.safegen/access.log` (no credentials in the log).
- [x] The tool works when configured in Claude Code's MCP settings (`claude mcp add safegen -- npx @poorvithmp/safegen-cli mcp`).

## 5. Out of scope

- Browser extension or form auto-filler.
- Cloud sync or remote vault backup.
- TOTP / 2FA code generation or storage.
- Password sharing between users.
- GUI vault management (vault is CLI-only; the web app remains a generator).
- OAuth token refresh or session management — SafeGen provides the stored credential, not a login flow.
- Vault migration from 1Password, Bitwarden, or other managers.
- Any changes to the existing web app UI (it continues to work as-is).

## 6. Files expected to change

### New files (library + CLI + MCP)
```
packages/
  core/                     # npm package
    src/
      index.ts              # public API re-exports
      generator.ts          # extracted from src/utils/generator.ts
      audit.ts              # extracted from calculateDetailedAudit
      crypto-provider.ts    # Node/browser crypto abstraction
      types.ts              # shared types
    package.json            # "safegen" on npm
    tsconfig.json
  cli/                      # CLI tool
    src/
      index.ts              # CLI entry point (bin)
      commands/
        generate.ts         # generate password/passphrase/pin/pattern
        vault.ts            # vault init/save/get/list/delete
        mcp.ts              # start MCP stdio server
      vault/
        encryption.ts       # AES-256-GCM encrypt/decrypt
        store.ts            # vault file read/write
      mcp/
        server.ts           # MCP server with safegen_get_credential tool
        approval.ts         # interactive terminal approval prompt
    package.json            # "safegen" bin entry
    tsconfig.json
```

### Modified files
```
package.json               # convert to monorepo workspaces
tsconfig.json              # update project references
src/utils/generator.ts     # import from packages/core instead of local logic
```

## 7. Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@modelcontextprotocol/server` | `2.0.0` | MCP server implementation and elicitation |
| `commander` | `15.0.0` | CLI argument parsing |
| `@inquirer/prompts` | `8.5.2` | Interactive CLI prompts |
| `zod` | `4.4.3` | MCP tool input and output schemas |

The `packages/core` library has **zero** runtime dependencies — Node `crypto` is a built-in.

## 8. Design notes

No UI changes. The web app continues to work as-is. The only web app change is that `src/utils/generator.ts` imports from `packages/core` instead of containing the logic inline — this is an internal refactor with no visible effect.

## 9. Implementation steps

1. **Monorepo setup** — convert repo to npm workspaces with `packages/core` and `packages/cli`. Update root `package.json`, add workspace-level tsconfig.
2. **Extract core library** — move generation functions from `src/utils/generator.ts` into `packages/core/src/generator.ts`. Add `crypto-provider.ts` that detects Node vs browser and exposes a unified `randomBytes(n)`. Add types. Wire up `package.json` with `"exports"`, `"types"`, `"sideEffects": false`.
3. **Wire web app to core** — update `src/utils/generator.ts` to re-export from `packages/core`. Verify web app builds and runs identically.
4. **Build CLI generate commands** — implement `generate password|passphrase|pin|pattern` commands using `commander`. Each command calls `packages/core` functions and prints to stdout. Add `--audit` flag.
5. **Build vault** — implement `encryption.ts` (AES-256-GCM, PBKDF2 key derivation), `store.ts` (read/write `~/.safegen/vault.enc`). Implement `vault init|save|get|list|delete` commands. Credential value input via `@inquirer/prompts` password prompt — never a CLI argument.
6. **Build MCP server** — implement stdio MCP server exposing `safegen_get_credential` tool. Add interactive approval prompt. Add access logging.
7. **Integration test** — test CLI commands end-to-end: generate, vault lifecycle, MCP tool call with approval/denial.
8. **Publish** — configure public npm publishing for the scoped core and CLI packages. Add the `safegen` bin entry in `packages/cli/package.json` and verify packed artifacts before publication.

## Revision log

- 2026-08-20: Corrected npm package ownership, MCP stdio/elicitation handling, sensitive unlock flow, credential-context wording, exact dependency versions, and PBKDF2 work factor before implementation.

## 10. Rollback

- The web app is untouched except for an import path change. Reverting the import in `src/utils/generator.ts` restores the original. The web app never depends on the vault or CLI.
- The npm package and CLI are additive — removing `packages/` and reverting `package.json` to non-workspace restores the original repo.
- No database, no migrations, no external service dependencies.
