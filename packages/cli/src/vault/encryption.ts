import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { assertEncryptedVault, assertVaultData, type EncryptedVault, type VaultData } from './types.js';

export const PBKDF2_ITERATIONS = 600_000;

function deriveKey(password: string, salt: Buffer): Buffer {
  if (!password) throw new Error('Master password is required');
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
}

export function encryptVault(data: VaultData, password: string): EncryptedVault {
  assertVaultData(data);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(password, salt), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return {
    version: 1,
    kdf: { name: 'PBKDF2-HMAC-SHA256', iterations: PBKDF2_ITERATIONS, salt: salt.toString('base64') },
    cipher: { name: 'AES-256-GCM', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') },
  };
}

export function decryptVault(envelope: EncryptedVault, password: string): VaultData {
  assertEncryptedVault(envelope);
  if (envelope.kdf.iterations !== PBKDF2_ITERATIONS) throw new Error('Unsupported vault format');
  let plaintext: Buffer;
  try {
    const salt = Buffer.from(envelope.kdf.salt, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(password, salt), Buffer.from(envelope.cipher.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.cipher.tag, 'base64'));
    plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.cipher.data, 'base64')), decipher.final()]);
  } catch {
    throw new Error('Unable to decrypt vault; check the master password');
  }
  let data: unknown;
  try { data = JSON.parse(plaintext.toString('utf8')); }
  catch { throw new Error('Invalid vault data'); }
  assertVaultData(data);
  return data;
}
