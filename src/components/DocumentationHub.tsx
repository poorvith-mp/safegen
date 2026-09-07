import { BookOpen, Box, KeyRound, ShieldCheck, Terminal } from 'lucide-react';

const guides = [
  {
    id: 'broker', Icon: ShieldCheck, label: 'Agent actions', title: 'Keep credentials out of agent context.',
    body: 'SafeGen runs approved GitHub and Cloudflare actions in a separate local owner process. Your agent receives a request ID and a limited status result. It never receives a provider token or your master password.',
    code: `Agent requests an action\nYou inspect and approve it locally\nSafeGen authenticates with the intended provider\nAgent receives only the approved status fields`,
  },
  {
    id: 'setup', Icon: Terminal, label: 'Build from source', title: 'Use the new action broker from this repository.',
    body: 'CLI 3.0 is a breaking change. npm publication is separate; the older published CLI still returns credentials. Build the current source with Node 22.13 or newer in separate owner and agent installations.',
    code: `git clone https://github.com/poorvith-mp/safegen.git\ncd safegen\nnpm ci\nnpm run build:packages\nnode packages/cli/dist/index.js --help`,
  },
  {
    id: 'owner', Icon: KeyRound, label: 'Owner setup', title: 'Pin the account and resource before an agent asks.',
    body: 'Run these commands only in the owner account, with a private browser/login session outside agent control. Connection setup prompts for a scoped provider token locally. The private control-page URL must never enter the agent chat or browser.',
    code: `node packages/cli/dist/index.js vault init\nnode packages/cli/dist/index.js broker connect --provider github --name work --repository example/project\nnode packages/cli/dist/index.js broker connect --provider cloudflare --name edge --account-id YOUR_ACCOUNT_ID --worker example-worker\nnode packages/cli/dist/index.js broker start --agent-user YOUR_AGENT_OS_USERNAME`,
  },
  {
    id: 'mcp', Icon: Terminal, label: 'CLI and MCP', title: 'Request actions. Inspect each approval.',
    body: 'The agent can read a workflow run status, rerun an existing workflow, list Worker deployments, or request deployment of an existing immutable Worker version. Every request needs fresh local approval and expires after two minutes.',
    code: `node packages/cli/dist/index.js action connections\nnode packages/cli/dist/index.js action request --connection work --action github.run-status --run-id 123456\nnode packages/cli/dist/index.js action status REQUEST_ID\nnode packages/cli/dist/index.js mcp --broker http://127.0.0.1:4767\n\nMCP tools:\nsafegen_list_connections\nsafegen_request_action\nsafegen_action_status`,
  },
  {
    id: 'vault', Icon: KeyRound, label: 'Vault maintenance', title: 'Back up encrypted data and rotate passwords.',
    body: 'The owner vault uses AES-256-GCM and PBKDF2-HMAC-SHA256. Stop the broker before maintenance. Restoring a backup requires its original master password, and rotating the live vault does not change old backups. The owner page can lock the vault and revoke pending actions.',
    code: `node packages/cli/dist/index.js vault backup --path PRIVATE_BACKUP_PATH\nnode packages/cli/dist/index.js vault rotate-password\nnode packages/cli/dist/index.js vault restore --path PRIVATE_BACKUP_PATH`,
  },
  {
    id: 'package', Icon: Box, label: 'Generator core', title: 'Generate locally in TypeScript.',
    body: 'The browser and core package still generate passwords, passphrases, PINs and patterns with native cryptographic randomness. Passphrase estimates use the bundled wordlist. Arbitrary-password strength is a heuristic, not a guarantee.',
    code: `import { generatePassword, calculateAudit } from '@poorvithmp/safegen';\n\nconst options = { mode: 'random' as const, length: 20 };\nconst value = generatePassword(options);\nconst estimate = calculateAudit(value, options);`,
  },
];

export function DocumentationHub() {
  return <section aria-labelledby="docs-title" className="safe-docs">
    <header className="safe-docs-hero">
      <p><BookOpen size={16} /> SafeGen guides</p>
      <h1 id="docs-title">Let agents use your accounts without receiving your credentials.</h1>
      <span>The public website is a local generator. The owner broker runs on your device under a separate OS account.</span>
    </header>
    <nav aria-label="Documentation sections" className="safe-docs-jumps">{guides.map(({ id, label }) => <a key={id} href={`#docs-${id}`}>{label}</a>)}</nav>
    <div className="safe-docs-grid">{guides.map(({ id, Icon, label, title, body, code }, index) => <article id={`docs-${id}`} key={id} className="safe-doc-card">
      <div className="safe-doc-card-heading"><span>{String(index + 1).padStart(2, '0')}</span><Icon size={20} /></div>
      <p>{label}</p><h2>{title}</h2><div className="safe-doc-copy">{body}</div><pre><code>{code}</code></pre>
    </article>)}</div>
    <aside className="safe-doc-boundary"><ShieldCheck size={21} /><div><strong>The isolation boundary matters.</strong><p>The agent must not control the owner account, browser, code or process memory. Administrator/root access and a compromised owner environment are outside this boundary. Startup checks cover basic account/file permissions, not the whole machine. Approved nonsecret results can reach the model provider. Browser history is separate and plaintext only when persistence is enabled.</p><a href="https://github.com/poorvith-mp/safegen/blob/main/docs/isolation.md">Read the owner isolation and setup guide</a></div></aside>
  </section>;
}
