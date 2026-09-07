# SafeGen feature scope

The current product model lets an agent request an action without receiving the credential used to perform it. The former v2 credential-returning MCP design is superseded by the [approved broker design](docs/superpowers/specs/2026-09-06-local-action-broker-design.md).

## Delivered in this revision

| Gap | Change | Verification |
| --- | --- | --- |
| Raw credentials entered MCP context | Three action-only tools, isolated owner broker and private approval page | Real stdio handshake and HTTP approval tests |
| An approval could permit arbitrary credential use | Fixed GitHub and Cloudflare adapters with owner-pinned resources and strict input/output schemas | Exact outbound destination/body assertions, redirect and error rejection |
| Grants lacked a bounded lifetime | Individual approvals, request expiry, automatic vault lock, immediate local connection revocation | Expiry, replay and concurrent-revocation tests |
| Vault writes could lose data | Exclusive initialization, serialized mutations, atomic replacement, encrypted backup/restore and password rotation | Cross-process saves and recovery tests |
| Passphrase strength used the wrong vocabulary size | Bundled EFF 7,776-word list and audit derived from the actual list | Vocabulary and entropy tests |
| Browser controls and storage gave misleading results | Correct PIN length, safe empty selection, clipboard failure handling, memory history by default and explicit plaintext persistence | Core and browser policy tests, browser verification |
| Website trusted third-party assets and lacked security headers | Bundled assets, native offline cache, static CSP and framing policy | Build checks and deployed-site verification |

CLI source version: 3.0.0. Core source version: 2.1.0. npm publication remains a separate release step.

## Boundaries and next extensions

The owner must provision a separate standard OS account, trusted private installation and private browser session before storing real provider tokens. Startup checks inspect basic permissions; they do not establish complete machine isolation. See [setup and maintenance](docs/isolation.md).

Manual provider tokens remain the first supported credential type. Provider-issued short-lived tokens, automatic refresh and remote revocation need provider-specific designs and tests before being added. Local revocation already stops new broker actions, but cannot undo an action received by a provider.

New integrations should add a small named action, an owner-pinned target, strict result fields and adversarial regression tests. Arbitrary HTTP requests, shell commands, raw logs and credential-export tools would break this model and are outside the feature scope.
