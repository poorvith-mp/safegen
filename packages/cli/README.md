# @poorvithmp/safegen-cli 3.0

I replaced SafeGen's credential-returning MCP tool with a local action broker. Agents can request a GitHub workflow action or Cloudflare Worker deployment; the owner approves it privately and SafeGen authenticates directly.

This revision is available from source. npm publication is separate, and CLI v2 does not enforce the new action boundary. Requires Node 22.13+. Follow [owner isolation setup](../../docs/isolation.md) before storing real credentials.

## Commands

Run `node packages/cli/dist/index.js` from a built checkout, followed by:

| Command | Purpose |
| --- | --- |
| `generate password --length 24 --audit` | Generate locally and print a password |
| `generate passphrase --words 5` | Generate from the bundled EFF wordlist |
| `generate pin --length 6` | Generate a numeric PIN |
| `generate pattern --template LLnn-SSll` | Fill a pattern |
| `vault init` | Create an encrypted vault without overwriting one |
| `vault save --service SERVICE --username NAME` | Owner-only masked credential input |
| `vault list` | Owner-only account metadata |
| `vault delete --service SERVICE --username NAME` | Confirm removal of an entry |
| `vault rotate-password` | Re-encrypt using a new master password |
| `vault backup --path PATH` | Write a verified encrypted backup |
| `vault restore --path PATH` | Validate and restore encrypted data |
| `broker connect --provider github --name work --repository example/project` | Pin a GitHub account connection |
| `broker connect --provider cloudflare --name edge --account-id ID --worker NAME` | Pin a Cloudflare account connection |
| `broker start --agent-user USERNAME` | Start the owner process after isolation checks |
| `action connections` | List aliases available to the agent |
| `action request --connection work --action github.run-status --run-id 123` | Request a workflow status read |
| `action request --connection work --action github.rerun --run-id 123` | Request a workflow rerun |
| `action request --connection edge --action cloudflare.deployments` | Request recent deployments |
| `action request --connection edge --action cloudflare.deploy-version --version-id UUID` | Request deployment of an existing Worker version |
| `action status REQUEST_ID` | Read the bounded result after owner approval |
| `mcp --broker http://127.0.0.1:4767` | Start the agent-facing stdio client |

`vault get` is disabled. `--ephemeral` was removed because clearing a buffer cannot retract a printed secret. Generation commands intentionally print newly generated values; never use their stdout to provision credentials that must remain outside agent context. Use owner-only masked setup for provider tokens.

The MCP tools are `safegen_list_connections`, `safegen_request_action`, and `safegen_action_status`. There is no credential, unlock, approve or arbitrary HTTP tool. MCP results may reach the host's model provider, but contain only approved status fields.

Vault encryption uses AES-256-GCM with a random 16-byte salt and 12-byte IV per write, PBKDF2-HMAC-SHA256 at 600,000 iterations, and no recovery mechanism for a lost master password. Backups stay encrypted. Store them privately and remember that changing the live password does not change older backups.

MIT. [Poorvith M P](https://poorvithmp.com).
