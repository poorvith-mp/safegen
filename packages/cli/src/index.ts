#!/usr/bin/env node
import { Command } from 'commander';
import { registerGenerate } from './commands/generate.js';
import { registerVault } from './commands/vault.js';
import { startMcpServer } from './mcp/server.js';

const program = new Command().name('safegen').description('Local credential generation, encrypted storage, and agent approval').version('2.0.0');
registerGenerate(program);
registerVault(program);
program.command('mcp').description('Start the approval-gated stdio MCP server').action(startMcpServer);
program.exitOverride();

try { await program.parseAsync(); }
catch (error) {
  if ((error as { code?: string }).code === 'commander.helpDisplayed' || (error as { code?: string }).code === 'commander.version') process.exitCode = 0;
  else if ((error as { name?: string }).name === 'ExitPromptError') process.exitCode = 130;
  else { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
