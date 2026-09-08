import type { GeneratorMode, StrengthRating } from '@poorvithmp/safegen';
export type { GeneratorMode, StrengthRating, SecurityAudit } from '@poorvithmp/safegen';

export interface PasswordOptions {
  mode: GeneratorMode;
  // Random Password Options
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  // Passphrase Options
  wordCount: number;
  separator: '-' | '_' | '.' | ' ';
  capitalize: boolean;
  includeNumber: boolean;
  // PIN Options
  pinLength: number;
  // Pattern Options
  pattern: string; // e.g. 'Lnnn-Lnnn-S' where L=letter, n=number, S=symbol
}

export interface HistoryItem {
  id: string;
  password: string;
  timestamp: number;
  mode: GeneratorMode;
  rating: StrengthRating;
  entropy: number;
  isFavorite: boolean;
}

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'celebrate' | 'info';
}
