import { useState } from 'react';
import { ArrowRight, Terminal } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import './guides.css';

const clients = [
  { id: 'codex', name: 'Codex', icon: '/clients/codex.png', docs: 'https://developers.openai.com/codex/mcp' },
  { id: 'claude', name: 'Claude Code', icon: '/clients/claude.png', docs: 'https://code.claude.com/docs/en/mcp' },
  { id: 'cursor', name: 'Cursor', icon: '/clients/cursor.svg', docs: 'https://cursor.com/docs/context/mcp' },
] as const;
const sourceInstall = 'git clone https://github.com/poorvith-mp/safegen.git\ncd safegen\nnpm ci\nnpm run build:packages';

export function AgentSetup() {
  const [client, setClient] = useState<(typeof clients)[number]['id']>('codex');
  const [os, setOs] = useState('windows');
  const [customPath, setCustomPath] = useState('');
  const path = customPath.trim() || (os === 'windows' ? 'C:/path/to/safegen/packages/cli/dist/index.js' : '/path/to/safegen/packages/cli/dist/index.js');
  const quote = (value: string) => `'${value.replaceAll("'", os === 'windows' ? "''" : "'\\''")}'`;
  const config = client === 'cursor'
    ? JSON.stringify({ mcpServers: { safegen: { command: 'node', args: [path, 'mcp', '--broker', 'http://127.0.0.1:4767'] } } }, null, 2)
    : `${client === 'codex' ? 'codex mcp add safegen' : 'claude mcp add --transport stdio --scope user safegen'} -- node ${quote(path)} mcp --broker http://127.0.0.1:4767`;
  const selected = clients.find(item => item.id === client)!;
  const prompt = `Help me connect ${selected.name} to my agent-side SafeGen CLI 3 source build.\nUse the CLI entry at ${path}. Configure only the stdio MCP server:\ncommand: node\nargs: ${JSON.stringify([path, 'mcp', '--broker', 'http://127.0.0.1:4767'])}\n\nDo not ask for, read, print, upload or store provider tokens, vault passwords, owner files or the private owner control-page URL. Do not create or control the owner's OS account, browser or broker installation. The human owner handles isolation and approvals separately.\nVerify these three tools are available: safegen_list_connections, safegen_request_action, safegen_action_status. List connections first. Ask me which named action I want before requesting it; return the request ID and wait for my approval in the private owner browser. Never work around a denial, expiry or locked broker. Return only the permitted status fields. If the broker is unavailable, ask me to start it in the owner account.\n\nThese instructions guide behavior; OS isolation and the broker enforce the credential boundary.`;

  return <section className="guide-page" aria-labelledby="setup-title">
    <header className="guide-heading"><p className="guide-eyebrow"><Terminal size={16} /> Connect your agent</p><h1 id="setup-title">A useful agent.<br />Your credentials stay yours.</h1><p>Connect a local MCP client to SafeGen. Your agent asks for an action; you approve it in your private owner session.</p></header>
    <aside className="guide-callout"><strong>Start with the right boundary.</strong><p>You need Node 22.13+, two separate standard OS accounts, and private owner and agent installations. SafeGen checks basic permissions; it does not provision or certify isolation. An agent with administrator access or control of the owner browser is outside this model.</p><a href="/docs#owner">Read the owner setup first <ArrowRight size={15} /></a></aside>
    <div className="setup-layout"><div className="setup-controls">
      <fieldset><legend>01 / Choose your client</legend><div className="client-choices">{clients.map(item => <button key={item.id} type="button" aria-pressed={client === item.id} onClick={() => setClient(item.id)}><img src={item.icon} alt="" width="30" height="30" /><span>{item.name}</span></button>)}</div></fieldset>
      <label className="guide-label">Your operating system<select value={os} onChange={event => { setOs(event.target.value); setCustomPath(''); }}><option value="windows">Windows · PowerShell</option><option value="macos">macOS · shell</option><option value="linux">Linux · shell</option></select></label>
      <label className="guide-label">Agent-side CLI entry path<input value={customPath} placeholder={path} onChange={event => setCustomPath(event.target.value)} spellCheck={false} autoComplete="off" /></label>
      <p className="guide-note">Use the absolute path in the agent account’s own installation. This form stays in browser memory. It never contacts your broker.</p>
      <a href={selected.docs} target="_blank" rel="noreferrer">Official {selected.name} MCP guide ↗</a>
      <p className="guide-note">Client marks identify configuration targets. SafeGen is independent and is not endorsed by these providers.</p>
    </div><div className="setup-steps">
      <article><span className="guide-eyebrow">02 / Build the current CLI</span><h2>Install in the agent account.</h2><p>The action broker is in the CLI 3 source release. Older published CLI versions return credentials; use this source build for the action-only model.</p><CodeBlock label="Source install">{sourceInstall}</CodeBlock></article>
      <article><span className="guide-eyebrow">03 / Register SafeGen</span><h2>{client === 'cursor' ? 'Add your MCP configuration.' : 'Run this in your agent terminal.'}</h2><p>{client === 'cursor' ? `Merge the safegen entry into ${os === 'windows' ? '%USERPROFILE%\\.cursor\\mcp.json' : '~/.cursor/mcp.json'}. Keep any existing servers. Restart or enable the server in Cursor’s MCP settings.` : 'Replace the example path above, run the command, then reopen your client to load its tools.'}</p><CodeBlock label={client === 'cursor' ? 'MCP configuration' : 'MCP command'}>{config}</CodeBlock></article>
      <article><span className="guide-eyebrow">04 / Check the connection</span><h2>Three tools. One approval at a time.</h2><p>Ask your client to list SafeGen tools. You should see only <code>safegen_list_connections</code>, <code>safegen_request_action</code> and <code>safegen_action_status</code>. The human owner starts the broker separately.</p><a href="/docs#troubleshooting">Connection not working? Read troubleshooting →</a><details><summary>Copy a setup prompt for your agent</summary><p>Use this after you have prepared separate accounts. A prompt is guidance, not a security boundary.</p><CodeBlock label="Agent setup prompt">{prompt}</CodeBlock></details></article>
    </div></div>
  </section>;
}
