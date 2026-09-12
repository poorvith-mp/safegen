import { appendFile, mkdir, readFile, rename, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type AuditEventName = 'request' | 'approve' | 'deny' | 'expire' | 'execute' | 'result' | 'error' | 'lock';

export interface AuditEntry {
  ts: string;
  event: AuditEventName;
  requestId?: string;
  connection?: string;
  action?: string;
  params?: Record<string, unknown>;
  outcome?: 'ok' | 'error';
  agentUser?: string;
}

const MAX_AUDIT_LOG_BYTES = 10 * 1024 * 1024; // 10 MiB

export function sanitizeActionParams(action: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(action)) {
    if (key !== 'connection' && key !== 'action') {
      params[key] = value;
    }
  }
  return params;
}

export async function appendAuditEvent(auditPath: string, entry: AuditEntry): Promise<void> {
  await mkdir(dirname(auditPath), { recursive: true, mode: 0o700 });
  try {
    const fileStat = await stat(auditPath);
    if (fileStat.size >= MAX_AUDIT_LOG_BYTES) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotated = join(dirname(auditPath), `broker-audit.${timestamp}.jsonl`);
      await rename(auditPath, rotated);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const line = JSON.stringify(entry);
  await appendFile(auditPath, `${line}\n`, { mode: 0o600 });
}

export async function readAuditEvents(auditPath: string, since?: string): Promise<AuditEntry[]> {
  let content = '';
  try {
    content = await readFile(auditPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const lines = content.trim().split('\n').filter(Boolean);
  const entries: AuditEntry[] = [];
  const sinceTime = since ? new Date(since).getTime() : 0;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as AuditEntry;
      if (!sinceTime || (parsed.ts && new Date(parsed.ts).getTime() >= sinceTime)) {
        entries.push(parsed);
      }
    } catch {
      // skip corrupted individual lines
    }
  }
  return entries;
}

function sanitizeFormula(value: unknown): unknown {
  if (typeof value === 'string') {
    if (/^[=+\-@\t\r]/.test(value)) {
      return `'${value}`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeFormula);
  }
  if (value && typeof value === 'object') {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      res[k] = sanitizeFormula(v);
    }
    return res;
  }
  return value;
}

function escapeCsvCell(value: unknown): string {
  if (value === undefined || value === null) return '""';
  const sanitized = sanitizeFormula(value);
  let str = typeof sanitized === 'object' ? JSON.stringify(sanitized) : String(sanitized);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function formatAuditCsv(entries: AuditEntry[]): string {
  const headers = ['ts', 'event', 'requestId', 'connection', 'action', 'outcome', 'agentUser', 'params'];
  const rows = [headers.join(',')];
  for (const entry of entries) {
    rows.push([
      escapeCsvCell(entry.ts),
      escapeCsvCell(entry.event),
      escapeCsvCell(entry.requestId ?? ''),
      escapeCsvCell(entry.connection ?? ''),
      escapeCsvCell(entry.action ?? ''),
      escapeCsvCell(entry.outcome ?? ''),
      escapeCsvCell(entry.agentUser ?? ''),
      escapeCsvCell(entry.params ? sanitizeFormula(entry.params) : ''),
    ].join(','));
  }
  return `${rows.join('\n')}\n`;
}

export function formatAuditTable(entries: AuditEntry[]): string {
  if (entries.length === 0) return 'No audit events found\n';
  const headers = ['Timestamp', 'Event', 'Request ID', 'Connection', 'Action', 'Outcome', 'Agent'];
  const rows = entries.map(e => [
    e.ts || '-',
    e.event || '-',
    (e.requestId ? e.requestId.slice(0, 8) : '-'),
    e.connection || '-',
    e.action || '-',
    e.outcome || '-',
    e.agentUser || '-',
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  const formatRow = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join('  ');
  const divider = widths.map(w => '-'.repeat(w)).join('  ');
  return [formatRow(headers), divider, ...rows.map(formatRow)].join('\n') + '\n';
}

