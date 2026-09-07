import { mkdir, readFile, rename, writeFile, open, rm, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { userInfo } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { connectionSchema, type Connection } from './actions.js';

export async function readConnections(home: string): Promise<Connection[]> {
  try {
    const path = join(home, 'connections.json');
    if ((await stat(path)).size > 32_768) throw new Error('Invalid connection configuration');
    const entries = z.array(connectionSchema).max(50).parse(JSON.parse(await readFile(path, 'utf8')));
    if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('Duplicate connection identifiers');
    return entries;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw new Error('Invalid owner connection configuration');
  }
}

export async function writeConnections(home: string, entries: Connection[]): Promise<void> {
  const parsed = z.array(connectionSchema).max(50).parse(entries);
  const temporary = join(home, `connections.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await rename(temporary, join(home, 'connections.json'));
  } finally { await rm(temporary, { force: true }); }
}

/** Owner config is immutable to other CLI processes while a broker is running. */
export async function acquireOwnerLock(home: string): Promise<() => Promise<void>> {
  await mkdir(home, { recursive: true, mode: 0o700 });
  const path = join(home, 'broker.lock');
  try {
    const handle = await open(path, 'wx', 0o600);
    return async () => { await handle.close(); await rm(path, { force: true }); };
  } catch { throw new Error('Owner configuration is busy. Stop the broker first; recover a leftover lock only after all broker processes stop.'); }
}

export async function assertOwnerIsolation(agentUser: string, home: string): Promise<void> {
  if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(agentUser)) throw new Error('The broker requires a separate standard OS account for isolation');
  const current = userInfo();
  if (current.username.toLowerCase() === agentUser.toLowerCase()) throw new Error('The broker requires a separate OS account from the agent');
  await mkdir(home, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    const script = fileURLToPath(new URL('../../scripts/check-isolation.ps1', import.meta.url));
    const shell = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const result = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-AgentUser', agentUser, '-VaultHome', home, '-CodePath', dirname(fileURLToPath(import.meta.url))], { encoding: 'utf8', windowsHide: true, timeout: 15_000 });
    if (result.status !== 0) throw new Error('OS isolation check failed. Use a separate standard owner account with a private installation and vault directory; see docs/isolation.md.');
  } else {
    const identity = spawnSync('id', ['-u', agentUser], { encoding: 'utf8', timeout: 5_000 });
    const agentUid = Number(identity.stdout.trim());
    if (identity.status !== 0 || !Number.isSafeInteger(agentUid) || agentUid === 0 || agentUid === current.uid || current.uid === 0) throw new Error('Separate non-root owner and agent accounts are required');
    const info = await stat(home);
    if (info.uid !== current.uid || (info.mode & 0o077) !== 0) throw new Error('The owner vault directory must be private (mode 0700)');
    // The owner installs vetted code in their private home; agent-writable code cannot own credentials.
    const code = await stat(dirname(fileURLToPath(import.meta.url)));
    if (code.uid !== current.uid || (code.mode & 0o022) !== 0) throw new Error('Broker installation must be owned by the owner and not writable by other users');
  }
}
