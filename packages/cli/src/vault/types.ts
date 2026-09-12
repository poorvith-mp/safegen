export interface VaultEntry { service: string; username: string; credential: string }
export interface VaultData { entries: VaultEntry[] }

export interface EncryptedVaultV1 {
  version: 1;
  kdf: { name: 'PBKDF2-HMAC-SHA256'; iterations: number; salt: string };
  cipher: { name: 'AES-256-GCM'; iv: string; tag: string; data: string };
}

export interface EncryptedVaultV2 {
  version: 2;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string }
       | { name: 'PBKDF2-HMAC-SHA256'; iterations: number; salt: string };
  cipher: { name: 'AES-256-GCM'; iv: string; tag: string; data: string };
}

export type EncryptedVault = EncryptedVaultV1 | EncryptedVaultV2;

export const MAX_VAULT_BYTES = 1_048_576;
const MAX_ENTRIES = 1_000;
const MAX_NAME_BYTES = 256;
const MAX_CREDENTIAL_BYTES = 65_536;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, name: string, maxBytes: number): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || Buffer.byteLength(value, 'utf8') > maxBytes) {
    throw new Error(`Invalid vault entry: ${name} must be a non-empty string of at most ${maxBytes} bytes`);
  }
}

function base64(value: unknown, bytes?: number): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_VAULT_BYTES * 2) return false;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
  const decoded = Buffer.from(value, 'base64');
  return bytes === undefined || decoded.length === bytes;
}

export function assertVaultEntry(value: unknown): asserts value is VaultEntry {
  if (!record(value)) throw new Error('Invalid vault entry');
  boundedString(value.service, 'service', MAX_NAME_BYTES);
  boundedString(value.username, 'username', MAX_NAME_BYTES);
  boundedString(value.credential, 'credential', MAX_CREDENTIAL_BYTES);
}

export function assertVaultData(value: unknown): asserts value is VaultData {
  if (!record(value) || !Array.isArray(value.entries) || value.entries.length > MAX_ENTRIES) {
    throw new Error('Invalid vault data');
  }
  for (const entry of value.entries) assertVaultEntry(entry);
}

export function assertEncryptedVault(value: unknown): asserts value is EncryptedVault {
  if (!record(value) || !record(value.kdf) || !record(value.cipher)) {
    throw new Error('Invalid vault envelope');
  }
  if (value.cipher.name !== 'AES-256-GCM' || !base64(value.cipher.iv, 12) || !base64(value.cipher.tag, 16) || !base64(value.cipher.data)) {
    throw new Error('Invalid vault envelope');
  }
  if (value.version === 1) {
    if (value.kdf.name !== 'PBKDF2-HMAC-SHA256' || !Number.isSafeInteger(value.kdf.iterations)
      || (value.kdf.iterations as number) < 600_000 || (value.kdf.iterations as number) > 5_000_000
      || !base64(value.kdf.salt, 16)) {
      throw new Error('Invalid vault envelope');
    }
    return;
  }
  if (value.version === 2) {
    if (!base64(value.kdf.salt, 16)) throw new Error('Invalid vault envelope');
    if (value.kdf.name === 'scrypt') {
      const { N, r, p } = value.kdf;
      if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) throw new Error('Invalid vault envelope');
      const nNum = N as number;
      const rNum = r as number;
      const pNum = p as number;
      if (nNum < 16_384 || nNum > 1_048_576 || (nNum & (nNum - 1)) !== 0) throw new Error('Invalid vault envelope');
      if (rNum < 8 || rNum > 16) throw new Error('Invalid vault envelope');
      if (pNum < 1 || pNum > 4) throw new Error('Invalid vault envelope');
      return;
    }
    if (value.kdf.name === 'PBKDF2-HMAC-SHA256') {
      const { iterations } = value.kdf;
      if (!Number.isSafeInteger(iterations) || (iterations as number) < 600_000 || (iterations as number) > 5_000_000) {
        throw new Error('Invalid vault envelope');
      }
      return;
    }
    throw new Error('Invalid vault envelope');
  }
  throw new Error('Invalid vault envelope');
}
