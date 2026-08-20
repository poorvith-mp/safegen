import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { VaultEntry } from '../vault/types.js';

export function selectCredential(entries: VaultEntry[], service: string, username?: string): VaultEntry {
  const matches = entries.filter((entry) => entry.service === service && (!username || entry.username === username));
  if (matches.length === 0) throw new Error(`No credential found for ${service}`);
  if (matches.length > 1) throw new Error(`Multiple credentials found for ${service}; specify a username`);
  return matches[0];
}

export async function appendAccessLog(path: string, request: { service: string; username?: string; approved: boolean }): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const line = JSON.stringify({ timestamp: new Date().toISOString(), service: request.service, username: request.username ?? null, result: request.approved ? 'approved' : 'denied' });
  await appendFile(path, `${line}\n`, { encoding: 'utf8', mode: 0o600 });
}
