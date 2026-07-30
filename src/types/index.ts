export type ViewType = 'generator' | 'vault' | 'audit' | 'settings';

export type ThemeMode = 'light' | 'dark';

export type AccentColor = 'indigo' | 'emerald' | 'rose' | 'amber';

export type GeneratorMode = 'random' | 'passphrase' | 'pin' | 'pattern';

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

export type StrengthRating = 'Weak' | 'Medium' | 'Strong' | 'Unbreakable';

export interface SecurityAudit {
  entropy: number;
  rating: StrengthRating;
  timeToCrackSeconds: number;
  crackTimeFormatted: string;
  poolSize: number;
  score: number; // 0-100
  warnings: string[];
  tips: string[];
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

export interface Preferences {
  theme: ThemeMode;
  accent: AccentColor;
  radius: number;
  motion: number;
  autoCopy: boolean;
  maskVault: boolean;
}

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'celebrate' | 'info';
}
