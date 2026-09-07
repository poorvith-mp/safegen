import { link, mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';
import { decryptVault, encryptVault } from './encryption.js';
import { assertVaultEntry, MAX_VAULT_BYTES, type EncryptedVault, type VaultData, type VaultEntry } from './types.js';

const LOCK_WAIT_MS = 30_000;
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class VaultStore {
  constructor(readonly path: string) {}

  async initialize(password: string): Promise<void> {
    try {
      await this.writeContents(this.path, this.serialize({ entries: [] }, password), false);
    } catch (error) {
      if (error instanceof Error && /already exists/i.test(error.message)) throw new Error('Vault already exists');
      throw error;
    }
  }

  async exists(): Promise<boolean> {
    try { await stat(this.path); return true; } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async read(password: string): Promise<VaultData> {
    const { envelope } = await this.readVaultFile(this.path);
    return decryptVault(envelope, password);
  }

  async save(service: string, username: string, credential: string, password: string): Promise<void> {
    const entry = { service, username, credential };
    assertVaultEntry(entry);
    await this.withMutationLock(async () => {
      const data = await this.read(password);
      const index = data.entries.findIndex((item) => item.service === service && item.username === username);
      if (index >= 0) data.entries[index] = entry; else data.entries.push(entry);
      await this.write(data, password);
    });
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
    return this.withMutationLock(async () => {
      const data = await this.read(password);
      const matches = data.entries.filter((entry) => entry.service === service && (!username || entry.username === username));
      if (matches.length === 0) return false;
      if (!username && matches.length > 1) throw new Error(`Multiple credentials found for ${service}; specify a username`);
      const target = matches[0];
      await this.write({ entries: data.entries.filter((entry) => entry !== target) }, password);
      return true;
    });
  }

  async rotatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.withMutationLock(async () => this.write(await this.read(currentPassword), newPassword));
  }

  async backup(destination: string, password: string, overwrite = false): Promise<void> {
    await this.withMutationLock(async () => {
      const { contents, envelope } = await this.readVaultFile(this.path);
      decryptVault(envelope, password);
      await this.writeContents(destination, contents, overwrite);
    });
  }

  async restore(source: string, password: string, overwrite = false): Promise<void> {
    const { contents, envelope } = await this.readVaultFile(source);
    decryptVault(envelope, password);
    await this.withMutationLock(async () => this.writeContents(this.path, contents, overwrite));
  }

  private async write(data: VaultData, password: string): Promise<void> {
    await this.writeContents(this.path, this.serialize(data, password), true);
  }

  private serialize(data: VaultData, password: string): string {
    const contents = `${JSON.stringify(encryptVault(data, password))}\n`;
    if (Buffer.byteLength(contents, 'utf8') > MAX_VAULT_BYTES) throw new Error('Vault exceeds maximum size');
    return contents;
  }

  private async readVaultFile(path: string): Promise<{ contents: string; envelope: EncryptedVault }> {
    const handle = await open(path, 'r');
    try {
      const size = (await handle.stat()).size;
      if (size === 0 || size > MAX_VAULT_BYTES) throw new Error('Vault file size is invalid or too large');
      const contents = await handle.readFile('utf8');
      try { return { contents, envelope: JSON.parse(contents) as EncryptedVault }; }
      catch (error) {
        if (error instanceof SyntaxError) throw new Error('Invalid vault envelope');
        throw error;
      }
    } finally { await handle.close(); }
  }

  private async writeContents(path: string, contents: string, overwrite: boolean): Promise<void> {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
    try {
      const handle = await open(temporary, 'wx', 0o600);
      try { await handle.writeFile(contents, 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      if (overwrite) await rename(temporary, path);
      else {
        try { await link(temporary, path); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('File already exists; explicit overwrite confirmation is required');
          throw error;
        }
      }
    } finally {
      await rm(temporary, { force: true });
    }
  }

  private async withMutationLock<T>(action: () => Promise<T>): Promise<T> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const lockPath = `${this.path}.lock`;
    const deadline = Date.now() + LOCK_WAIT_MS;
    let handle;
    while (!handle) {
      try {
        const candidate = await open(lockPath, 'wx', 0o600);
        try {
          await candidate.writeFile(`${process.pid}\n`, 'utf8');
          handle = candidate;
        } catch (error) {
          await candidate.close();
          await rm(lockPath, { force: true });
          throw error;
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        // Windows may report a sharing violation while a competing process closes/removes its lock.
        if (code !== 'EEXIST' && !(process.platform === 'win32' && code === 'EPERM')) throw error;
        if (Date.now() >= deadline) throw new Error('Vault is busy. Stop all vault processes before manually recovering a leftover lock');
        await pause(25);
      }
    }
    try { return await action(); }
    finally {
      await handle.close();
      await rm(lockPath, { force: true });
    }
  }
}
