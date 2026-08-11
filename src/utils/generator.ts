import type { PasswordOptions, SecurityAudit, StrengthRating } from '../types';

export const CHARACTER_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+{}[]<>?/|~=-'
};

// Curated EFF Passphrase Wordlist
export const PASSPHRASE_WORDS = [
  'anchor', 'beacon', 'canvas', 'cipher', 'cobalt', 'crane', 'delta', 'drift',
  'echo', 'amber', 'falcon', 'flint', 'fossil', 'glacier', 'granite', 'harbor',
  'horizon', 'indigo', 'island', 'jasper', 'lagoon', 'lunar', 'magnet', 'marble',
  'matrix', 'meridian', 'meteor', 'nexus', 'noble', 'oasis', 'obsidian', 'orbit',
  'opal', 'origin', 'phantom', 'phoenix', 'prism', 'pulse', 'pyramid', 'quartz',
  'radar', 'radius', 'raven', 'ripple', 'ruby', 'safari', 'sapphire', 'saturn',
  'shadow', 'shield', 'signal', 'silicon', 'solar', 'sonic', 'spectrum', 'sphere',
  'summit', 'tactic', 'timber', 'titan', 'topaz', 'torpedo', 'trace', 'tropic',
  'tundra', 'vector', 'velocity', 'velvet', 'vessel', 'vortex', 'whisper', 'zenith',
  'astral', 'breeze', 'canyon', 'cascade', 'celestial', 'citadel', 'comet', 'crest',
  'crystal', 'eclipse', 'ember', 'equinox', 'frontier', 'galaxy', 'haven', 'infinity',
  'kinetic', 'lantern', 'legacy', 'monolith', 'nebula', 'odyssey', 'pioneer', 'quantum',
  'sanctuary', 'solace', 'spectrum', 'stellar', 'symphony', 'vanguard', 'vista', 'voyage'
];

export function randomInt(max: number): number {
  if (!Number.isSafeInteger(max) || max <= 0 || max > 0x100000000) throw new RangeError('Random range is invalid');
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random generation is unavailable in this browser');
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do { globalThis.crypto.getRandomValues(array); } while (array[0] >= limit);
  return array[0] % max;
}

function getRandomChar(chars: string): string {
  return chars[randomInt(chars.length)];
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateRandomPassword(options: PasswordOptions): string {
  const selectedSets: string[] = [];
  if (options.uppercase) selectedSets.push(CHARACTER_SETS.uppercase);
  if (options.lowercase) selectedSets.push(CHARACTER_SETS.lowercase);
  if (options.numbers) selectedSets.push(CHARACTER_SETS.numbers);
  if (options.symbols) selectedSets.push(CHARACTER_SETS.symbols);

  if (selectedSets.length === 0) {
    return '';
  }

  const passwordChars: string[] = [];
  let allChars = '';

  selectedSets.forEach((set) => {
    passwordChars.push(getRandomChar(set));
    allChars += set;
  });

  while (passwordChars.length < options.length) {
    passwordChars.push(getRandomChar(allChars));
  }

  return shuffle(passwordChars).join('');
}

export function generatePassphrase(options: PasswordOptions): string {
  const wordCount = options.wordCount || 4;
  const words: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    let word = PASSPHRASE_WORDS[randomInt(PASSPHRASE_WORDS.length)];
    if (options.capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  if (options.includeNumber) {
    const randomIdx = randomInt(words.length);
    words[randomIdx] += randomInt(99);
  }

  return words.join(options.separator || '-');
}

export function generatePIN(options: PasswordOptions): string {
  const length = options.pinLength || 6;
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += getRandomChar(CHARACTER_SETS.numbers);
  }
  return pin;
}

export function generatePattern(options: PasswordOptions): string {
  const patternStr = options.pattern || 'Lnnn-Lnnn-S';
  let result = '';

  for (const char of patternStr) {
    if (char === 'L') {
      result += getRandomChar(CHARACTER_SETS.uppercase);
    } else if (char === 'l') {
      result += getRandomChar(CHARACTER_SETS.lowercase);
    } else if (char === 'n') {
      result += getRandomChar(CHARACTER_SETS.numbers);
    } else if (char === 'S' || char === 's') {
      result += getRandomChar(CHARACTER_SETS.symbols);
    } else {
      result += char;
    }
  }

  return result;
}

export function generatePassword(options: PasswordOptions): string {
  switch (options.mode) {
    case 'passphrase':
      return generatePassphrase(options);
    case 'pin':
      return generatePIN(options);
    case 'pattern':
      return generatePattern(options);
    case 'random':
    default:
      return generateRandomPassword(options);
  }
}

export function formatCrackTime(seconds: number): string {
  if (seconds < 0.001) return 'Instantaneous (< 1 millisecond)';
  if (seconds < 1) return `${Math.round(seconds * 1000)} milliseconds`;
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 315360000000) return `${Math.round(seconds / 3153600000)} centuries`;
  return 'Over 1,000 centuries at the stated guess rate';
}

export function calculateDetailedAudit(password: string, options: PasswordOptions): SecurityAudit {
  if (!password) {
    return {
      entropy: 0,
      rating: 'Weak',
      timeToCrackSeconds: 0,
      crackTimeFormatted: 'N/A',
      poolSize: 0,
      score: 0,
      warnings: ['No password generated'],
      tips: ['Select character sets or increase length']
    };
  }

  let poolSize = 0;
  let hasUpper = false;
  let hasLower = false;
  let hasNumber = false;
  let hasSymbol = false;

  for (const char of password) {
    if (CHARACTER_SETS.uppercase.includes(char)) hasUpper = true;
    else if (CHARACTER_SETS.lowercase.includes(char)) hasLower = true;
    else if (CHARACTER_SETS.numbers.includes(char)) hasNumber = true;
    else if (CHARACTER_SETS.symbols.includes(char)) hasSymbol = true;
  }

  if (hasUpper) poolSize += 26;
  if (hasLower) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSymbol) poolSize += 24;

  if (options.mode === 'passphrase') {
    poolSize = PASSPHRASE_WORDS.length;
  } else if (poolSize === 0) {
    poolSize = 64;
  }

  const length = password.length;
  let entropy: number;
  if (options.mode === 'passphrase') {
    entropy = options.wordCount * Math.log2(PASSPHRASE_WORDS.length) + (options.includeNumber ? Math.log2(options.wordCount * 99) : 0);
  } else if (options.mode === 'pin') {
    entropy = options.pinLength * Math.log2(10);
  } else if (options.mode === 'pattern') {
    entropy = [...options.pattern].reduce((bits, character) => bits + (character === 'L' || character === 'l' ? Math.log2(26) : character === 'n' ? Math.log2(10) : character === 'S' || character === 's' ? Math.log2(CHARACTER_SETS.symbols.length) : 0), 0);
  } else {
    entropy = length * Math.log2(poolSize || 1);
  }
  entropy = Math.round(entropy);

  // GPU Farm speed: 100 Billion guesses/sec
  const guessesPerSecond = 100_000_000_000;
  const totalCombinations = Math.pow(2, entropy);
  const timeToCrackSeconds = totalCombinations / (2 * guessesPerSecond);

  let rating: StrengthRating = 'Strong';
  let score = Math.min(100, Math.round((entropy / 90) * 100));

  if (entropy < 40) {
    rating = 'Weak';
    score = Math.max(10, Math.min(35, score));
  } else if (entropy < 65) {
    rating = 'Medium';
    score = Math.max(40, Math.min(68, score));
  } else if (entropy < 90) {
    rating = 'Strong';
    score = Math.max(70, Math.min(88, score));
  } else {
    rating = 'Very strong';
    score = Math.min(100, score);
  }

  const warnings: string[] = [];
  const tips: string[] = [];

  if (length < 12) warnings.push('Length is under 12 characters');
  if (!hasSymbol && options.mode === 'random') warnings.push('No special symbols included');
  if (!hasNumber && options.mode === 'random') warnings.push('No numeric digits included');

  if (entropy >= 80) tips.push('Excellent entropy for high-value accounts');
  if (options.mode === 'passphrase') tips.push('Passphrases offer high security while remaining easy to type and remember');
  if (options.mode === 'random' && length >= 16) tips.push('Resistant to offline dictionary and rainbow table attacks');

  return {
    entropy,
    rating,
    timeToCrackSeconds,
    crackTimeFormatted: formatCrackTime(timeToCrackSeconds),
    poolSize,
    score,
    warnings,
    tips
  };
}
