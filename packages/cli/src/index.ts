#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { registerGenerate } from './commands/generate.js';
import { registerVault } from './commands/vault.js';
import { startMcpServer } from './mcp/server.js';
import { registerBroker } from './commands/broker.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };
const program = new Command().name('safegen').description('Local credential generation and approved agent actions without credential disclosure').version(version);
registerGenerate(program);
registerVault(program);
registerBroker(program);
program.command('mcp').description('Start the agent-safe stdio action client').option('--broker <url>', 'local owner broker', 'http://127.0.0.1:4767').action(flags => startMcpServer(flags.broker));
program.exitOverride();

try { await program.parseAsync(); }
catch (error) {
  if ((error as { code?: string }).code === 'commander.helpDisplayed' || (error as { code?: string }).code === 'commander.version') process.exitCode = 0;
  else if ((error as { name?: string }).name === 'ExitPromptError') process.exitCode = 130;
  else { process.stderr.write(`${(error as NodeJS.ErrnoException).code?.startsWith('E') ? 'Local operation failed; check permissions and owner configuration' : error instanceof Error ? error.message : 'SafeGen operation failed'}\n`); process.exitCode = 1; }
}
