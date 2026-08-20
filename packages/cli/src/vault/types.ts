export interface VaultEntry { service: string; username: string; credential: string }
export interface VaultData { entries: VaultEntry[] }
export interface EncryptedVault {
  version: 1;
  kdf: { name: 'PBKDF2-HMAC-SHA256'; iterations: number; salt: string };
  cipher: { name: 'AES-256-GCM'; iv: string; tag: string; data: string };
}
