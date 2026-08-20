import { homedir } from 'node:os';
import { join } from 'node:path';

export function safegenHome(): string { return process.env.SAFEGEN_HOME || join(homedir(), '.safegen'); }
export function vaultPath(): string { return join(safegenHome(), 'vault.enc'); }
export function accessLogPath(): string { return join(safegenHome(), 'access.log'); }
