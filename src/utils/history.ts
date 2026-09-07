import type { HistoryItem } from '../types';

export const HISTORY_STORAGE_KEY = 'safegen-history-vault';
const MODES = new Set(['random', 'passphrase', 'pin', 'pattern']);
const RATINGS = new Set(['Weak', 'Medium', 'Strong', 'Very strong']);

export type StoredHistory = {
  status: 'none' | 'available' | 'invalid';
  items: HistoryItem[];
};

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && typeof item.password === 'string'
    && typeof item.timestamp === 'number'
    && Number.isFinite(item.timestamp)
    && typeof item.mode === 'string'
    && MODES.has(item.mode)
    && typeof item.rating === 'string'
    && RATINGS.has(item.rating)
    && typeof item.entropy === 'number'
    && Number.isFinite(item.entropy)
    && typeof item.isFavorite === 'boolean';
}

export function parseStoredHistory(raw: string | null): StoredHistory {
  if (raw === null) return { status: 'none', items: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isHistoryItem)) return { status: 'invalid', items: [] };
    return { status: 'available', items: parsed.slice(0, 50) };
  } catch {
    return { status: 'invalid', items: [] };
  }
}

export function removeStoredHistory(storage: Pick<Storage, 'removeItem'>): boolean {
  try {
    storage.removeItem(HISTORY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function csvCell(value: unknown): string {
  let text = String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializeHistory(history: HistoryItem[], format: 'json' | 'csv') {
  if (format === 'json') {
    return { data: JSON.stringify(history, null, 2), type: 'application/json', extension: 'json' };
  }
  const header = 'ID,Password,Mode,Rating,Entropy,Timestamp,IsFavorite';
  const rows = history.map((item) => [
    item.id,
    item.password,
    item.mode,
    item.rating,
    item.entropy,
    new Date(item.timestamp).toISOString(),
    item.isFavorite,
  ].map(csvCell).join(','));
  return { data: [header, ...rows].join('\n'), type: 'text/csv', extension: 'csv' };
}
