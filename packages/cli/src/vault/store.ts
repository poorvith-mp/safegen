import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { decryptVault, encryptVault } from './encryption.js';
import type { EncryptedVault, VaultData, VaultEntry } from './types.js';

export class VaultStore {
  constructor(readonly path: string) {}

  async initialize(password: string): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    await this.write({ entries: [] }, password);
  }

  async exists(): Promise<boolean> {
    try { await readFile(this.path); return true; } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async read(password: string): Promise<VaultData> {
    const envelope = JSON.parse(await readFile(this.path, 'utf8')) as EncryptedVault;
    return decryptVault(envelope, password);
  }

  async save(service: string, username: string, credential: string, password: string): Promise<void> {
    const data = await this.read(password);
    const index = data.entries.findIndex((entry) => entry.service === service && entry.username === username);
    const entry = { service, username, credential };
    if (index >= 0) data.entries[index] = entry; else data.entries.push(entry);
    await this.write(data, password);
  }

  async get(service: string, username: string | undefined, password: string): Promise<VaultEntry> {
    const entries = (await this.read(password)).entries.filter((entry) => entry.service === service && (!username || entry.username === username));
    if (entries.length === 0) throw new Error(`No credential found for ${service}`);
    if (entries.length > 1) throw new Error(`Multiple credentials found for ${service}; specify a username`);
    return entries[0];
  }

  async list(password: string): Promise<Array<Omit<VaultEntry, 'credential'>>> {
    return (await this.read(password)).entries.map(({ service, username }) => ({ service, username }));
  }

  async delete(service: string, username: string | undefined, password: string): Promise<boolean> {
    const data = await this.read(password);
    const retained = data.entries.filter((entry) => !(entry.service === service && (!username || entry.username === username)));
    if (retained.length === data.entries.length) return false;
    await this.write({ entries: retained }, password);
    return true;
  }

  private async write(data: VaultData, password: string): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(encryptVault(data, password))}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.path);
  }
}
