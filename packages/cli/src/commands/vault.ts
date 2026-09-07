import { confirm, password } from '@inquirer/prompts';
import type { Command } from 'commander';
import { vaultPath } from '../paths.js';
import { VaultStore } from '../vault/store.js';

async function master(message = 'Master password:'): Promise<string> { return password({ message, mask: '*' }); }

export function registerVault(program: Command): void {
  const vault = program.command('vault').description('Manage the encrypted local vault');
  vault.command('init').action(async () => {
    const store = new VaultStore(vaultPath());
    const first = await master('Create a master password:');
    const second = await master('Confirm the master password:');
    if (first !== second) throw new Error('Master passwords do not match');
    await store.initialize(first);
    process.stdout.write('Vault initialized in the configured private directory\n');
  });
  vault.command('save').requiredOption('--service <service>').requiredOption('--username <username>').action(async (flags) => {
    const credential = await password({ message: 'Credential value:', mask: '*' });
    const masterPassword = await master();
    await new VaultStore(vaultPath()).save(flags.service, flags.username, credential, masterPassword);
    process.stdout.write(`Saved ${flags.service} (${flags.username})\n`);
  });
  vault.command('get').description('Disabled: credentials stay inside the owner broker').action(() => {
    throw new Error('Raw credential retrieval is disabled; use the local action broker to run an approved action');
  });
  vault.command('list').action(async () => {
    const entries = await new VaultStore(vaultPath()).list(await master());
    process.stdout.write(entries.length ? `${entries.map((entry) => `${entry.service}\t${entry.username}`).join('\n')}\n` : 'Vault is empty\n');
  });
  vault.command('delete').requiredOption('--service <service>').option('--username <username>').action(async (flags) => {
    if (!await confirm({ message: `Delete credential for ${flags.service}?`, default: false })) return;
    const removed = await new VaultStore(vaultPath()).delete(flags.service, flags.username, await master());
    process.stdout.write(removed ? 'Credential deleted\n' : 'No matching credential\n');
  });
  vault.command('rotate-password').action(async () => {
    const current = await master('Current master password:');
    const next = await master('New master password:');
    const repeated = await master('Confirm the new master password:');
    if (next !== repeated) throw new Error('Master passwords do not match');
    await new VaultStore(vaultPath()).rotatePassword(current, next);
    process.stdout.write('Vault password rotated\n');
  });
  vault.command('backup').requiredOption('--path <path>').action(async (flags) => {
    const destination = new VaultStore(flags.path);
    let overwrite = false;
    if (await destination.exists()) {
      overwrite = await confirm({ message: 'Overwrite the encrypted backup at the selected destination?', default: false });
      if (!overwrite) return;
    }
    await new VaultStore(vaultPath()).backup(flags.path, await master(), overwrite);
    process.stdout.write('Encrypted backup written to the selected destination\n');
  });
  vault.command('restore').requiredOption('--path <path>').action(async (flags) => {
    const store = new VaultStore(vaultPath());
    let overwrite = false;
    if (await store.exists()) {
      overwrite = await confirm({ message: 'Overwrite the current vault with this encrypted backup?', default: false });
      if (!overwrite) return;
    }
    await store.restore(flags.path, await master('Backup master password:'), overwrite);
    process.stdout.write('Encrypted backup restored\n');
  });
}
