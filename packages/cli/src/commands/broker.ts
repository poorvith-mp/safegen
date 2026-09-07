import { password, confirm } from '@inquirer/prompts';
import type { Command } from 'commander';
import { join } from 'node:path';
import { connectionSchema } from '../broker/actions.js';
import { BrokerClient } from '../broker/client.js';
import { acquireOwnerLock, assertOwnerIsolation, readConnections, writeConnections } from '../broker/config.js';
import { startBroker } from '../broker/server.js';
import { safegenHome, vaultPath } from '../paths.js';
import { VaultStore } from '../vault/store.js';

export function registerBroker(program: Command): void {
  const broker = program.command('broker').description('Owner-only local action broker (separate OS account required)');
  broker.command('connect').requiredOption('--provider <provider>').requiredOption('--name <alias>').option('--repository <owner/repo>').option('--account-id <id>').option('--worker <name>').action(async flags => {
    const parsed = connectionSchema.safeParse(flags.provider === 'github' ? { id: flags.name, provider: 'github', repository: flags.repository } : { id: flags.name, provider: flags.provider, accountId: flags.accountId, worker: flags.worker });
    if (!parsed.success) throw new Error('Invalid connection. Use github with --repository or cloudflare with --account-id and --worker');
    const home = safegenHome();
    const release = await acquireOwnerLock(home);
    try {
      const connections = await readConnections(home);
      const previous = connections.find(connection => connection.id === parsed.data.id);
      if (previous && !await confirm({ message: 'Replace this connection and its credential?', default: false })) return;
      if (!previous && connections.length >= 50) throw new Error('Connection limit reached');
      const credential = await password({ message: 'Scoped provider token (owner terminal only):', mask: '*' });
      const master = await password({ message: 'Vault master password:', mask: '*' });
      await new VaultStore(vaultPath()).save(`safegen:${parsed.data.provider}`, parsed.data.id, credential, master);
      await writeConnections(home, [...connections.filter(connection => connection.id !== parsed.data.id), parsed.data]);
      process.stdout.write('Connection saved. Start or restart the owner broker to use it.\n');
    } finally { await release(); }
  });
  broker.command('start').requiredOption('--agent-user <username>', 'separate standard OS account running the agent').option('--port <port>', 'loopback port', '4767').action(async flags => {
    const port = Number(flags.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Broker port must be between 1024 and 65535');
    const home = safegenHome();
    await assertOwnerIsolation(flags.agentUser, home);
    const release = await acquireOwnerLock(home);
    try {
      const instance = await startBroker({ connections: await readConnections(home), vault: new VaultStore(vaultPath()), logPath: join(home, 'activity.jsonl'), port,
        revokeConnection: async id => writeConnections(home, (await readConnections(home)).filter(connection => connection.id !== id)),
      });
      process.stdout.write(`Agent endpoint: ${instance.url}\nPrivate owner page (never share with an agent): ${instance.controlUrl}\n`);
      await new Promise<void>(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
      await instance.close();
    } finally { await release(); }
  });

  const action = program.command('action').description('Agent-safe action client; never receives credentials').option('--broker <url>', 'local owner broker', 'http://127.0.0.1:4767');
  const client = () => new BrokerClient(action.opts().broker);
  action.command('connections').action(async () => { process.stdout.write(`${JSON.stringify(await client().connections())}\n`); });
  action.command('request').requiredOption('--connection <alias>').requiredOption('--action <action>').option('--run-id <id>').option('--version-id <uuid>').action(async flags => {
    const request = { connection: flags.connection, action: flags.action, ...(flags.runId === undefined ? {} : { runId: Number(flags.runId) }), ...(flags.versionId === undefined ? {} : { versionId: flags.versionId }) };
    process.stdout.write(`${JSON.stringify(await client().request(request))}\n`);
  });
  action.command('status').argument('<request-id>').action(async id => { process.stdout.write(`${JSON.stringify(await client().status(id))}\n`); });
}
