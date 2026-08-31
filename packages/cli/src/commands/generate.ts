import { calculateAudit, generatePIN, generatePassphrase, generatePassword, generatePattern } from '@poorvithmp/safegen';
import type { Command } from 'commander';

function print(value: string, audit: boolean, options: Record<string, unknown> = {}, ephemeral?: boolean | string): void {
  const secretBuf = Buffer.from(value);
  process.stdout.write(`${value}\n`);
  if (audit) {
    const result = calculateAudit(value, options);
    process.stdout.write(`Rating: ${result.rating}\nEntropy: ${result.entropy} bits\nCrack time: ${result.crackTime}\n`);
  }
  if (ephemeral) {
    const ttl = typeof ephemeral === 'string' && Number(ephemeral) > 0 ? Number(ephemeral) : 10;
    process.stderr.write(`[ephemeral] Secret memory auto-zero scheduled in ${ttl}s\n`);
    setTimeout(() => {
      secretBuf.fill(0);
    }, ttl * 1000).unref();
  }
}

export function registerGenerate(program: Command): void {
  const generate = program.command('generate').description('Generate a credential locally');
  generate.command('password').option('-l, --length <number>', 'length', '16').option('--uppercase').option('--lowercase').option('--numbers').option('--symbols').option('--audit').option('-e, --ephemeral [seconds]', 'ephemeral self-destructing secret').action((flags) => {
    const anySet = flags.uppercase || flags.lowercase || flags.numbers || flags.symbols;
    const options = { length: Number(flags.length), uppercase: anySet ? !!flags.uppercase : true, lowercase: anySet ? !!flags.lowercase : true, numbers: anySet ? !!flags.numbers : true, symbols: anySet ? !!flags.symbols : true };
    print(generatePassword(options), !!flags.audit, { mode: 'random', ...options }, flags.ephemeral);
  });
  generate.command('passphrase').option('-w, --words <number>', 'word count', '4').option('-s, --separator <character>', 'separator', '-').option('--capitalize').option('--include-number').option('--audit').option('-e, --ephemeral [seconds]', 'ephemeral self-destructing secret').action((flags) => {
    const options = { words: Number(flags.words), separator: flags.separator, capitalize: !!flags.capitalize, includeNumber: !!flags.includeNumber };
    print(generatePassphrase(options), !!flags.audit, { mode: 'passphrase', ...options }, flags.ephemeral);
  });
  generate.command('pin').option('-l, --length <number>', 'length', '6').option('--audit').option('-e, --ephemeral [seconds]', 'ephemeral self-destructing secret').action((flags) => {
    const value = generatePIN({ length: Number(flags.length) });
    print(value, !!flags.audit, { mode: 'pin' }, flags.ephemeral);
  });
  generate.command('pattern').requiredOption('-t, --template <pattern>').option('--audit').option('-e, --ephemeral [seconds]', 'ephemeral self-destructing secret').action((flags) => {
    const value = generatePattern({ template: flags.template });
    print(value, !!flags.audit, { mode: 'pattern', template: flags.template }, flags.ephemeral);
  });
}
