# SafeGen owner isolation

SafeGen protects provider credentials by keeping them in an owner process that the agent can't read or control. The owner approves actions in a private browser session. The agent-facing MCP process only submits actions and reads limited results.

## Required separation

Use two standard, non-administrator OS accounts: one for SafeGen and one for the agent. Install a trusted Node runtime and this revision of SafeGen independently in the owner's private home. The agent must not be able to modify the broker code or its dependencies. Keep the vault, connection configuration, activity log, backups and owner browser profile private.

On Windows, sign into the owner account in a separate login session to run the broker and open its control page. A browser window started with `runas` on an agent-controlled desktop is not sufficient: screenshot and input automation can cross that boundary. Do not place either account in Administrators. The startup checker currently supports local Windows accounts and rejects nested administrator-group arrangements that it cannot assess.

On Linux/macOS, use a separate user/session with a private home and vault directory (0700). The agent must not have sudo, ptrace/debug or equivalent access to the owner. The automatic POSIX checks are basic UID and mode checks, not a complete sudo/ACL/group audit. Use a VM if you cannot enforce that separation.

This guide doesn't create accounts, change ACLs or install a service automatically. Have the machine owner provision and verify the boundary. Root/administrator access, OS/runtime compromise, shared owner-screen automation and a malicious intended provider are outside SafeGen's protection.

## Owner installation

In the owner's private login session, clone a reviewed commit and build it with Node 22.13+:

```powershell
git clone https://github.com/poorvith-mp/safegen.git
cd safegen
npm ci
npm run build:packages
node packages/cli/dist/index.js vault init
```

The default vault location is `~/.safegen/vault.enc`. `SAFEGEN_HOME` can move the owner data directory, but its isolation requirements remain the same. Do not put it inside the agent's workspace or cloud-synced storage.

Create a minimum-scope provider token in GitHub or Cloudflare's own UI. Set its expiration there. GitHub status needs Actions read access; rerun needs Actions write. Cloudflare's Worker deployment operations need the corresponding account Worker permissions. Restrict tokens to the resources you need. SafeGen does not create, refresh or revoke provider tokens remotely.

Run connection setup only in the owner's terminal. Tokens and the master password use masked interactive prompts, never CLI arguments:

```powershell
node packages/cli/dist/index.js broker connect --provider github --name work --repository example/project
node packages/cli/dist/index.js broker connect --provider cloudflare --name edge --account-id YOUR_ACCOUNT_ID --worker example-worker
node packages/cli/dist/index.js broker start --agent-user YOUR_AGENT_OS_USERNAME
```

The broker prints two different addresses. Share only `http://127.0.0.1:4767` with the agent. Open the **private owner page** in the owner's browser and keep that URL out of chats, agent terminals, screenshots and MCP configuration. It is an administrative capability. It changes every time the broker starts.

The owner page starts locked. Enter the master password there, refresh pending requests, inspect the account/target/action, then approve or deny. Nothing can approve through the MCP interface. Requests expire after two minutes; the vault locks after five minutes. Locking and revocation cannot undo an external action already dispatched.

## Agent installation

Use a separate installation of this same revision in the agent account. It has no owner vault or provider tokens.

```powershell
node packages/cli/dist/index.js action connections
node packages/cli/dist/index.js action request --connection work --action github.run-status --run-id 123456
node packages/cli/dist/index.js action status REQUEST_ID
node packages/cli/dist/index.js mcp --broker http://127.0.0.1:4767
```

Configure the last command as a stdio server in your MCP host. The tools are `safegen_list_connections`, `safegen_request_action` and `safegen_action_status`. Never configure `broker start` as the MCP command. The host doesn't need elicitation support because approvals happen in the owner's private session.

Every request is separately approved, including reads. Returned fields are provider status enums, validated identifiers and version percentages. No logs, arbitrary response text, authentication material or provider-supplied links are forwarded. The host may send these approved results to its model provider; SafeGen's boundary concerns credentials, not all account metadata.

## Maintenance and recovery

Stop the broker before changing connections, rotating credentials or restoring backups. `broker connect` replaces an existing connection/token only after owner confirmation. Restart to load the changed configuration. The owner control page can revoke a connection immediately and persist that removal. The encrypted credential can subsequently be removed with `vault delete --service safegen:github --username work` (use `safegen:cloudflare` for Cloudflare).

```powershell
node packages/cli/dist/index.js vault backup --path PRIVATE_BACKUP_PATH
node packages/cli/dist/index.js vault rotate-password
node packages/cli/dist/index.js vault restore --path PRIVATE_BACKUP_PATH
```

Back up `connections.json` separately in the private owner session if you want to preserve pinned resource metadata. Vault backups contain encrypted entries, not broker configuration. A restored backup still needs its original master password. Rotation doesn't change old backups.

Vault mutations and owner configuration use lock files. If a process crashes, stop every broker/vault process and verify none remains before manually removing its leftover `vault.enc.lock` or `broker.lock` from the private data directory. SafeGen never steals an old lock based on age. Never remove a live process's lock.

Review `~/.safegen/activity.jsonl` in the owner account. It records request IDs, configured aliases, action names and outcomes without credentials. There is no analytics upload.
