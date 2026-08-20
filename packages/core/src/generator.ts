import { secureRandomInt } from './crypto-provider.js';
import type { PassphraseOptions, PasswordOptions, PatternOptions, PinOptions, RandomPasswordOptions } from './types.js';

export const CHARACTER_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+{}[]<>?/|~=-',
} as const;

export const PASSPHRASE_WORDS = [
  'anchor', 'beacon', 'canvas', 'cipher', 'cobalt', 'crane', 'delta', 'drift', 'echo', 'amber',
  'falcon', 'flint', 'fossil', 'glacier', 'granite', 'harbor', 'horizon', 'indigo', 'island', 'jasper',
  'lagoon', 'lunar', 'magnet', 'marble', 'matrix', 'meridian', 'meteor', 'nexus', 'noble', 'oasis',
  'obsidian', 'orbit', 'opal', 'origin', 'phantom', 'phoenix', 'prism', 'pulse', 'pyramid', 'quartz',
  'radar', 'radius', 'raven', 'ripple', 'ruby', 'safari', 'sapphire', 'saturn', 'shadow', 'shield',
  'signal', 'silicon', 'solar', 'sonic', 'spectrum', 'sphere', 'summit', 'tactic', 'timber', 'titan',
  'topaz', 'torpedo', 'trace', 'tropic', 'tundra', 'vector', 'velocity', 'velvet', 'vessel', 'vortex',
  'whisper', 'zenith', 'astral', 'breeze', 'canyon', 'cascade', 'celestial', 'citadel', 'comet', 'crest',
  'crystal', 'eclipse', 'ember', 'equinox', 'frontier', 'galaxy', 'haven', 'infinity', 'kinetic', 'lantern',
  'legacy', 'monolith', 'nebula', 'odyssey', 'pioneer', 'quantum', 'sanctuary', 'solace', 'stellar',
  'symphony', 'vanguard', 'vista', 'voyage',
] as const;

export const randomInt = secureRandomInt;

function randomChar(characters: string): string { return characters[randomInt(characters.length)]; }

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function generatePassword(options: RandomPasswordOptions = {}): string {
  const settings = { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true, ...options };
  if (!Number.isInteger(settings.length) || settings.length < 1) throw new RangeError('Password length must be a positive integer');
  const sets = [
    settings.uppercase ? CHARACTER_SETS.uppercase : '', settings.lowercase ? CHARACTER_SETS.lowercase : '',
    settings.numbers ? CHARACTER_SETS.numbers : '', settings.symbols ? CHARACTER_SETS.symbols : '',
  ].filter(Boolean);
  if (sets.length === 0) throw new Error('Select at least one character set');
  if (settings.length < sets.length) throw new RangeError('Password length is shorter than the selected character-set count');
  const result = sets.map(randomChar);
  const pool = sets.join('');
  while (result.length < settings.length) result.push(randomChar(pool));
  return shuffle(result).join('');
}

export const generateRandomPassword = generatePassword;

export function generatePassphrase(options: PassphraseOptions = {}): string {
  const count = options.words ?? options.wordCount ?? 4;
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Word count must be a positive integer');
  const words = Array.from({ length: count }, () => {
    const word = PASSPHRASE_WORDS[randomInt(PASSPHRASE_WORDS.length)];
    return options.capitalize ? word[0].toUpperCase() + word.slice(1) : word;
  });
  if (options.includeNumber) words[randomInt(words.length)] += randomInt(100);
  return words.join(options.separator ?? '-');
}

export function generatePIN(options: PinOptions = {}): string {
  const length = options.length ?? options.pinLength ?? 6;
  if (!Number.isInteger(length) || length < 1) throw new RangeError('PIN length must be a positive integer');
  return Array.from({ length }, () => randomChar(CHARACTER_SETS.numbers)).join('');
}

export function generatePattern(options: PatternOptions = {}): string {
  const template = options.template ?? options.pattern ?? 'Lnnn-Lnnn-S';
  return [...template].map((character) => {
    if (character === 'L') return randomChar(CHARACTER_SETS.uppercase);
    if (character === 'l') return randomChar(CHARACTER_SETS.lowercase);
    if (character === 'n') return randomChar(CHARACTER_SETS.numbers);
    if (character === 'S' || character === 's') return randomChar(CHARACTER_SETS.symbols);
    return character;
  }).join('');
}

export function generateCredential(options: PasswordOptions): string {
  if (options.mode === 'passphrase') return generatePassphrase(options);
  if (options.mode === 'pin') return generatePIN(options);
  if (options.mode === 'pattern') return generatePattern(options);
  return generatePassword(options);
}
