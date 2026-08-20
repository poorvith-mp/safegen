import {
  calculateAudit,
  generateCredential,
  type PasswordOptions as CorePasswordOptions,
} from '@poorvith-mp/safegen';
import type { PasswordOptions, SecurityAudit } from '../types';

export {
  CHARACTER_SETS,
  PASSPHRASE_WORDS,
  formatCrackTime,
  generatePassphrase,
  generatePIN,
  generatePattern,
  generateRandomPassword,
  randomInt,
} from '@poorvith-mp/safegen';

export function generatePassword(options: PasswordOptions): string {
  return generateCredential(options as CorePasswordOptions);
}

export function calculateDetailedAudit(password: string, options: PasswordOptions): SecurityAudit {
  return calculateAudit(password, options as CorePasswordOptions);
}
