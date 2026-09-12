import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes, scryptSync } from 'node:crypto';
import { assertEncryptedVault, assertVaultData, type EncryptedVault, type EncryptedVaultV2, type VaultData } from './types.js';

export const PBKDF2_ITERATIONS = 600_000;
export const SCRYPT_N = 131_072;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
export const SCRYPT_MAXMEM = 256 * 1024 * 1024;

function deriveKey(password: string, kdf: EncryptedVault['kdf']): Buffer {
  if (!password) throw new Error('Master password is required');
  const salt = Buffer.from(kdf.salt, 'base64');
  if (kdf.name === 'scrypt') {
    return scryptSync(password, salt, 32, { N: kdf.N, r: kdf.r, p: kdf.p, maxmem: SCRYPT_MAXMEM });
  }
  if (kdf.name === 'PBKDF2-HMAC-SHA256') {
    return pbkdf2Sync(password, salt, kdf.iterations, 32, 'sha256');
  }
  throw new Error('Unsupported vault format');
}

export function encryptVault(data: VaultData, password: string): EncryptedVault {
  assertVaultData(data);
  if (!password) throw new Error('Master password is required');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const kdfConfig: EncryptedVaultV2['kdf'] = {
    name: 'scrypt',
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    salt: salt.toString('base64'),
  };
  const key = scryptSync(password, salt, 32, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return {
    version: 2,
    kdf: kdfConfig,
    cipher: { name: 'AES-256-GCM', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') },
  };
}

export function decryptVault(envelope: EncryptedVault, password: string): VaultData {
  assertEncryptedVault(envelope);
  if (!password) throw new Error('Master password is required');
  let plaintext: Buffer;
  try {
    const key = deriveKey(password, envelope.kdf);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.cipher.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.cipher.tag, 'base64'));
    plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.cipher.data, 'base64')), decipher.final()]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unsupported vault format') throw error;
    throw new Error('Unable to decrypt vault; check the master password');
  }
  let data: unknown;
  try { data = JSON.parse(plaintext.toString('utf8')); }
  catch { throw new Error('Invalid vault data'); }
  assertVaultData(data);
  return data;
}
