import { BookOpen, Box, KeyRound, ShieldCheck, Terminal } from 'lucide-react';

const guides = [
  {
    id: 'package',
    Icon: Box,
    label: 'Core package',
    title: 'Use SafeGen in TypeScript',
    body: 'Install the zero-dependency generator when your own app needs cryptographic passwords, passphrases, PINs, patterns, or an honest strength estimate.',
    code: `npm install @poorvithmp/safegen\n\nimport { generatePassword, calculateAudit } from '@poorvithmp/safegen';\n\nconst credential = generatePassword({ length: 20 });\nconsole.log(calculateAudit(credential));`,
  },
  {
    id: 'cli',
    Icon: Terminal,
    label: 'CLI',
    title: 'Generate from the terminal',
    body: 'Run the scoped CLI without a global install. Add --audit when you also want the estimated entropy, rating, and crack time.',
    code: `npx @poorvithmp/safegen-cli generate password --length 20 --uppercase --lowercase --numbers --symbols --audit\nnpx @poorvithmp/safegen-cli generate passphrase --words 4 --separator -\nnpx @poorvithmp/safegen-cli generate pin --length 6`,
  },
  {
    id: 'vault',
    Icon: KeyRound,
    label: 'Encrypted vault',
    title: 'Store credentials locally',
    body: 'The CLI vault encrypts one local file with AES-256-GCM. Credential values and the master password are collected interactively, never through command arguments.',
    code: `npx @poorvithmp/safegen-cli vault init\nnpx @poorvithmp/safegen-cli vault save --service github.com --username poorvith\nnpx @poorvithmp/safegen-cli vault list\nnpx @poorvithmp/safegen-cli vault get --service github.com --username poorvith`,
  },
  {
    id: 'mcp',
    Icon: ShieldCheck,
    label: 'MCP bridge',
    title: 'Approve agent access explicitly',
    body: 'Start the stdio server to expose safegen_get_credential. SafeGen asks you to unlock locally and approve each request. The approved value enters the tool context, so connect it only to a trusted MCP host.',
    code: `npx @poorvithmp/safegen-cli mcp\n\n# Claude Code\nclaude mcp add safegen -- npx @poorvithmp/safegen-cli mcp`,
  },
];

export function DocumentationHub() {
  return <section aria-labelledby="docs-title" className="safe-docs">
    <header className="safe-docs-hero">
      <p><BookOpen size={16} /> Installation & docs</p>
      <h1 id="docs-title">Use SafeGen where the credential work happens.</h1>
      <span>The browser generator needs no setup. The package, CLI, encrypted vault, and MCP bridge are separate surfaces with different trust boundaries.</span>
    </header>
    <nav aria-label="Documentation sections" className="safe-docs-jumps">{guides.map(({ id, label }) => <a key={id} href={`#docs-${id}`}>{label}</a>)}</nav>
    <div className="safe-docs-grid">{guides.map(({ id, Icon, label, title, body, code }, index) => <article id={`docs-${id}`} key={id} className="safe-doc-card">
      <div className="safe-doc-card-heading"><span>{String(index + 1).padStart(2, '0')}</span><Icon size={20} /></div>
      <p>{label}</p>
      <h2>{title}</h2>
      <div className="safe-doc-copy">{body}</div>
      <pre><code>{code}</code></pre>
    </article>)}</div>
    <aside className="safe-doc-boundary"><ShieldCheck size={21} /><div><strong>Know the boundary.</strong><p>Browser history is localStorage and is not encrypted. The CLI vault is encrypted at rest. An MCP-approved credential is visible to the trusted agent host that receives it.</p></div></aside>
  </section>;
}
