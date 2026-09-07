# SafeGen

SafeGen lets agents request account actions without receiving your credentials. I changed the original credential-returning MCP bridge because approval alone doesn't keep a token out of model context.

[Open the browser generator](https://safegen.poorvithmp.com) · [Owner isolation setup](docs/isolation.md) · [CLI guide](packages/cli/README.md) · [Core API](packages/core/README.md)

## How agent access works

1. The owner creates an encrypted vault and pins each connection to a GitHub repository or Cloudflare Worker.
2. The owner starts the broker in a separate standard OS account and opens its control page in a private login session that the agent cannot inspect or automate.
3. The agent uses the CLI or MCP client to request a named action. It receives a pending request ID.
4. The owner approves the exact account, target and parameters locally. Requests expire after two minutes and approvals cannot be reused.
5. SafeGen calls the intended provider directly. The agent receives a small, validated status result. It never receives the provider token, master password, control-page link, cookies or raw provider response.

| Integration | Actions | Owner pins | Agent supplies |
| --- | --- | --- | --- |
| GitHub | Workflow run status; rerun an existing workflow | Repository | Run ID |
| Cloudflare | Recent Worker deployments; deploy an existing version to 100% | Account and Worker | Immutable version ID for deployment |

There is no arbitrary HTTP proxy, command execution or code upload tool. Provider redirects are rejected. Errors returned to agents use fixed messages. Locking revokes pending actions and aborts in-flight requests locally; a provider may still complete an action it has already received.

## Release status and installation

This repository contains CLI **3.0.0** and core **2.1.0**. The action broker is a breaking change from CLI v2. npm publication is separate; don't use the older published CLI for this security boundary. Build this revision from source in each account's own private installation:

```powershell
git clone https://github.com/poorvith-mp/safegen.git
cd safegen
npm ci
npm run build:packages
node packages/cli/dist/index.js --help
```

The CLI requires Node 22.13 or newer. See the [owner setup guide](docs/isolation.md) before storing a real credential. The agent account needs only its own CLI/MCP installation and the loopback endpoint; never share the owner's checkout or home directory.

## Browser generator

The website generates random passwords, EFF passphrases, PINs and custom patterns using Web Crypto. Generation doesn't upload secrets or load analytics. The application shell can be reopened offline after its first successful load.

Copied history stays in memory by default. Persistent history is an explicit opt-in and remains **unencrypted** in the browser profile. Exported history is also sensitive. The website is not the owner control page and never connects to your local broker.

Strength figures describe generation assumptions. They cannot establish the strength of an arbitrary human-chosen password or guarantee a cracking time. Don't reuse generated passwords.

## Local vault and trust boundary

The vault uses AES-256-GCM, a random 16-byte salt and 12-byte IV, and PBKDF2-HMAC-SHA256 with 600,000 iterations. Initialization never overwrites a vault. Mutations are serialized across processes. Encrypted backup/restore and master-password rotation are available; losing the master password has no recovery path.

The owner broker auto-locks after five minutes. Connection revocation removes the grant from the running broker and its saved configuration; it does not revoke the provider's token remotely. Revoke or rotate that token at GitHub/Cloudflare when needed. Configure minimum provider permissions and an expiration when creating tokens.

A second process alone isn't an isolation boundary. **The agent must not have access to the owner's OS account, browser session, vault, broker code, runtime, or process memory.** Startup checks reject the same username and inspect basic OS/file permissions; they do not certify the complete machine configuration. Administrator/root access, shared screen/input automation, a compromised broker/runtime, malicious provider behavior, and OS compromise remain outside this model. Approved nonsecret results may reach the model provider.

## Development and deployment

```powershell
npm test
npm run lint
npm run build
npm run dev
```

`npm run test:browser` checks a production preview at `http://127.0.0.1:4173` using an existing Playwright installation. Start `npm run preview` first. Set `SAFEGEN_PLAYWRIGHT_MODULE` to an existing Playwright module entry if it isn't installed in the checkout, and `SAFEGEN_BROWSER_CHANNEL=msedge` to use an installed Edge browser. The smoke test uses a fresh profile and synthetic data; it checks offline loading, copy failures, history consent and unauthorized network calls. No browser automation dependency is bundled in production.

Cloudflare Workers serves the static website through the existing Git integration. Build checks run tests and lint before producing assets. Only the public generator is deployed; vaults and the broker remain on the owner's machine. Native static-asset headers enforce the website's content and framing policy.

The response policy also uses `no-transform` to prevent Cloudflare's automatic Web Analytics injection, as described in its [Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/). Offline caching fetches the canonical root page because Cloudflare redirects `/index.html`.

The generator core has no runtime dependencies. The broker reuses Node built-ins and the existing MCP SDK, Commander, Inquirer and Zod. Contributions that change secret handling need regression tests and a clear statement of the affected trust boundary.

MIT. Built by [Poorvith M P](https://poorvithmp.com). The EFF wordlist has its own attribution in the core package.
