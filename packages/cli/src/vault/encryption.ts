import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import type { EncryptedVault, VaultData } from './types.js';

export const PBKDF2_ITERATIONS = 600_000;

function deriveKey(password: string, salt: Buffer): Buffer {
  if (!password) throw new Error('Master password is required');
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
}

export function encryptVault(data: VaultData, password: string): EncryptedVault {
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
  try {
    if (envelope.version !== 1 || envelope.kdf.iterations !== PBKDF2_ITERATIONS) throw new Error('Unsupported vault format');
    const salt = Buffer.from(envelope.kdf.salt, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(password, salt), Buffer.from(envelope.cipher.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.cipher.tag, 'base64'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.cipher.data, 'base64')), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as VaultData;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unsupported vault format') throw error;
    throw new Error('Unable to decrypt vault; check the master password');
  }
}
