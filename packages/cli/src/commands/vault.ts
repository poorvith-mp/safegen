import { confirm, password } from '@inquirer/prompts';
import type { Command } from 'commander';
import { vaultPath } from '../paths.js';
import { VaultStore } from '../vault/store.js';

async function master(message = 'Master password:'): Promise<string> { return password({ message, mask: '*' }); }

export function registerVault(program: Command): void {
  const vault = program.command('vault').description('Manage the encrypted local vault');
  vault.command('init').action(async () => {
    const store = new VaultStore(vaultPath());
    if (await store.exists()) throw new Error('Vault already exists');
    const first = await master('Create a master password:');
    const second = await master('Confirm the master password:');
    if (first !== second) throw new Error('Master passwords do not match');
    await store.initialize(first);
    process.stdout.write(`Vault initialized at ${store.path}\n`);
  });
  vault.command('save').requiredOption('--service <service>').requiredOption('--username <username>').action(async (flags) => {
    const credential = await password({ message: 'Credential value:', mask: '*' });
    const masterPassword = await master();
    await new VaultStore(vaultPath()).save(flags.service, flags.username, credential, masterPassword);
    process.stdout.write(`Saved ${flags.service} (${flags.username})\n`);
  });
  vault.command('get').requiredOption('--service <service>').option('--username <username>').action(async (flags) => {
    const entry = await new VaultStore(vaultPath()).get(flags.service, flags.username, await master());
    process.stdout.write(`${entry.credential}\n`);
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
}
