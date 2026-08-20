export type GeneratorMode = 'random' | 'passphrase' | 'pin' | 'pattern';
export type StrengthRating = 'Weak' | 'Medium' | 'Strong' | 'Very strong';

export interface RandomPasswordOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

export interface PassphraseOptions {
  words?: number;
  wordCount?: number;
  separator?: '-' | '_' | '.' | ' ' | string;
  capitalize?: boolean;
  includeNumber?: boolean;
}

export interface PinOptions { length?: number; pinLength?: number }
export interface PatternOptions { template?: string; pattern?: string }

export interface PasswordOptions extends RandomPasswordOptions, PassphraseOptions, PinOptions, PatternOptions {
  mode?: GeneratorMode;
}

export interface SecurityAudit {
  entropy: number;
  rating: StrengthRating;
  timeToCrackSeconds: number;
  crackTime: string;
  crackTimeFormatted: string;
  poolSize: number;
  score: number;
  warnings: string[];
  tips: string[];
}
