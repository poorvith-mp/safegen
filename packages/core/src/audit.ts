import { CHARACTER_SETS, PASSPHRASE_WORDS } from './generator.js';
import type { PasswordOptions, SecurityAudit, StrengthRating } from './types.js';

export function formatCrackTime(seconds: number): string {
  if (seconds < 0.001) return 'Instantaneous (< 1 millisecond)';
  if (seconds < 1) return `${Math.round(seconds * 1000)} milliseconds`;
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3_600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86_400) return `${Math.round(seconds / 3_600)} hours`;
  if (seconds < 31_536_000) return `${Math.round(seconds / 86_400)} days`;
  if (seconds < 3_153_600_000) return `${Math.round(seconds / 31_536_000)} years`;
  if (seconds < 315_360_000_000) return `${Math.round(seconds / 3_153_600_000)} centuries`;
  return 'Over 1,000 centuries at the stated guess rate';
}

export function calculateAudit(password: string, options: PasswordOptions = {}): SecurityAudit {
  if (!password) return { entropy: 0, rating: 'Weak', timeToCrackSeconds: 0, crackTime: 'N/A', crackTimeFormatted: 'N/A', poolSize: 0, score: 0, warnings: ['No password generated'], tips: ['Generate a credential before auditing it'] };
  const hasUpper = [...password].some((char) => CHARACTER_SETS.uppercase.includes(char));
  const hasLower = [...password].some((char) => CHARACTER_SETS.lowercase.includes(char));
  const hasNumber = [...password].some((char) => CHARACTER_SETS.numbers.includes(char));
  const hasSymbol = [...password].some((char) => CHARACTER_SETS.symbols.includes(char));
  let poolSize = (hasUpper ? 26 : 0) + (hasLower ? 26 : 0) + (hasNumber ? 10 : 0) + (hasSymbol ? CHARACTER_SETS.symbols.length : 0);
  let entropy: number;
  if (options.mode === 'passphrase') {
    const words = options.words ?? options.wordCount ?? password.split(options.separator ?? '-').length;
    poolSize = PASSPHRASE_WORDS.length;
    entropy = words * Math.log2(poolSize) + (options.includeNumber ? Math.log2(words * 100) : 0);
  } else if (options.mode === 'pin') {
    poolSize = 10;
    entropy = password.length * Math.log2(10);
  } else if (options.mode === 'pattern') {
    const template = options.template ?? options.pattern ?? '';
    entropy = [...template].reduce((total, char) => total + (char === 'L' || char === 'l' ? Math.log2(26) : char === 'n' ? Math.log2(10) : char === 'S' || char === 's' ? Math.log2(CHARACTER_SETS.symbols.length) : 0), 0);
  } else {
    entropy = password.length * Math.log2(poolSize || 1);
  }
  entropy = Math.round(entropy);
  const timeToCrackSeconds = 2 ** entropy / 200_000_000_000;
  let rating: StrengthRating = entropy < 40 ? 'Weak' : entropy < 65 ? 'Medium' : entropy < 90 ? 'Strong' : 'Very strong';
  let score = Math.min(100, Math.round(entropy / 90 * 100));
  if (rating === 'Weak') score = Math.max(10, Math.min(35, score));
  if (rating === 'Medium') score = Math.max(40, Math.min(68, score));
  if (rating === 'Strong') score = Math.max(70, Math.min(88, score));
  const warnings: string[] = [];
  const tips: string[] = [];
  if (password.length < 12) warnings.push('Length is under 12 characters');
  if (!hasSymbol && (options.mode ?? 'random') === 'random') warnings.push('No special symbols included');
  if (!hasNumber && (options.mode ?? 'random') === 'random') warnings.push('No numeric digits included');
  if (entropy >= 80) tips.push('Excellent entropy for high-value accounts');
  if (options.mode === 'passphrase') tips.push('Passphrases offer high security while remaining easy to type and remember');
  if ((options.mode ?? 'random') === 'random' && password.length >= 16) tips.push('Resistant to offline dictionary and rainbow table attacks');
  const crackTime = formatCrackTime(timeToCrackSeconds);
  return { entropy, rating, timeToCrackSeconds, crackTime, crackTimeFormatted: crackTime, poolSize, score, warnings, tips };
}

export const calculateDetailedAudit = calculateAudit;
