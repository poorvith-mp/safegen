# Getting started

SafeGen has two independent entry points: a browser generator, and a local action broker for agents. The website never asks for your provider token or connects to your local broker.

## Generate locally

Open the [generator](https://safegen.poorvithmp.com/generator), choose random, passphrase, PIN or pattern, then copy. Copied history stays in memory unless you explicitly keep it on your device. Persistent history and JSON exports are plaintext. This browser history is not the encrypted owner vault.

## Connect an agent

Use Node 22.13 or newer. The current CLI 3 action broker must be built from source; older published CLI versions return credentials and do not implement this boundary.

1. The machine owner provisions two separate standard OS accounts and private installations, runtimes and browser sessions. Follow [owner isolation](isolation.md). A second terminal under the same user is insufficient.
2. In each account's own checkout, run `npm ci` and `npm run build:packages`.
3. The owner initializes the vault, pins provider connections and starts the broker in their private session, following the isolation guide. Tokens and passwords go only into local owner prompts.
4. In the agent account, open the [client setup guide](https://safegen.poorvithmp.com/setup). Choose Codex, Claude Code or Cursor and enter the absolute path to that account's `packages/cli/dist/index.js`.
5. Copy the generated MCP configuration into the agent client. Cursor users merge the server into existing configuration rather than replacing other servers. Restart or enable the server.
6. Verify only `safegen_list_connections`, `safegen_request_action` and `safegen_action_status` are exposed. Ask for a connection list, then request a specific supported action.
7. The human owner reviews the exact request in their private browser. The agent polls the request ID for an allowed status result.

The shared endpoint is `http://127.0.0.1:4767`. The private owner control-page link must never go into MCP configuration, agent chat or agent-controlled browsers. Approved nonsecret results may reach the model provider.

### Manual configuration

Codex, in the agent's terminal:

```text
codex mcp add safegen -- node /absolute/agent/safegen/packages/cli/dist/index.js mcp --broker http://127.0.0.1:4767
```

Claude Code:

```text
claude mcp add --transport stdio --scope user safegen -- node /absolute/agent/safegen/packages/cli/dist/index.js mcp --broker http://127.0.0.1:4767
```

Cursor, in `~/.cursor/mcp.json` (`%USERPROFILE%\.cursor\mcp.json` on Windows):

```json
{
  "mcpServers": {
    "safegen": {
      "command": "node",
      "args": ["/absolute/agent/safegen/packages/cli/dist/index.js", "mcp", "--broker", "http://127.0.0.1:4767"]
    }
  }
}
```

Replace the example path; quote paths containing spaces in terminal commands. Use the interactive guide for Windows PowerShell quoting. Official references: [Codex](https://developers.openai.com/codex/mcp), [Claude Code](https://code.claude.com/docs/en/mcp), [Cursor](https://cursor.com/docs/context/mcp).

## Common stops

| Symptom | Check |
| --- | --- |
| MCP server missing | Node is on the client PATH; CLI has been built; path is absolute; server is enabled |
| Broker unavailable | Owner started it in their separate session; agent uses the public loopback endpoint |
| Startup rejects isolation | Exact agent username and private owner permissions; do not elevate the agent or bypass checks |
| Request expires | Submit a new request only when the owner wants it; every approval is single-use |
| Locked vault | Owner unlocks in their private browser; never share the master password |
| Provider rejects action | Owner checks token permissions, expiry and pinned resource privately |

See [CLI reference](../packages/cli/README.md), [architecture](architecture.md) and [maintenance](maintenance.md). A full machine security assessment is separate from installation checks.
