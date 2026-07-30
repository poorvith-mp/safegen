import React, { useRef } from 'react';
import { useHistory } from '../context/HistoryContext';
import { useToast } from '../context/ToastContext';
import type { PasswordOptions, SecurityAudit } from '../types';
import { triggerConfetti } from '../utils/generator';
import { animateCopyBurst, animatePasswordRefresh } from '../utils/gsapUtils';

interface PasswordDisplayProps {
  password: string;
  options: PasswordOptions;
  audit: SecurityAudit;
  onGenerate: () => void;
  onSurprise: () => void;
}

export const PasswordDisplay: React.FC<PasswordDisplayProps> = ({
  password,
  options,
  audit,
  onGenerate,
  onSurprise
}) => {
  const { showToast } = useToast();
  const { addHistoryItem } = useHistory();
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const passwordTextRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (!password) {
      showToast('Generate a password first', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      animateCopyBurst(copyBtnRef.current);
      showToast('Password copied to clipboard', 'success');

      // Save to history vault
      addHistoryItem({
        password,
        mode: options.mode,
        rating: audit.rating,
        entropy: audit.entropy
      });
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = password;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Password copied to clipboard', 'success');
    }
  };

  const handleRefresh = () => {
    onGenerate();
    animatePasswordRefresh(passwordTextRef.current);
  };

  const handleSurprise = () => {
    onSurprise();
    triggerConfetti();
    showToast('Randomized surprise password!', 'celebrate');
  };

  const renderColoredPassword = (pwd: string) => {
    if (!pwd) return <span className="text-[var(--text-muted)] italic">Click Generate to start</span>;

    return pwd.split('').map((char, index) => {
      let colorClass = 'text-[var(--text-main)]';
      if (/[0-9]/.test(char)) colorClass = 'text-blue-600 dark:text-blue-400 font-semibold';
      else if (/[!@#$%^&*()_+{}[\]<>?/|~=-]/.test(char)) colorClass = 'text-amber-600 dark:text-amber-400 font-bold';
      else if (/[A-Z]/.test(char)) colorClass = 'text-[var(--text-main)] font-semibold';

      return (
        <span key={index} className={colorClass}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-[var(--surface)] border-crisp rounded-xl p-6 sm:p-8 shadow-xs transition-all">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--border)] text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{options.mode} Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{audit.entropy} bits entropy</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
              audit.rating === 'Weak'
                ? 'badge-red'
                : audit.rating === 'Medium'
                ? 'badge-yellow'
                : audit.rating === 'Strong'
                ? 'badge-blue'
                : 'badge-green'
            }`}
          >
            {audit.rating}
          </span>
        </div>
      </div>

      {/* Main Password Output Box */}
      <div className="relative group my-2">
        <div
          ref={passwordTextRef}
          className="w-full min-h-[72px] sm:min-h-[84px] bg-[var(--canvas)] border-crisp rounded-lg px-5 py-4 flex items-center justify-between gap-4 font-mono text-xl sm:text-2xl md:text-3xl tracking-wider break-all select-all transition-all"
        >
          <div className="leading-relaxed">{renderColoredPassword(password)}</div>
          <div className="text-xs text-[var(--text-subtle)] shrink-0 hidden sm:block">
            {password.length} chars
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            ref={copyBtnRef}
            onClick={handleCopy}
            type="button"
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-[var(--text-main)] text-[var(--surface)] hover:opacity-90 active:scale-[0.98] font-sans font-medium text-sm rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy Password</span>
            <kbd className="ml-1 opacity-80">⌘C</kbd>
          </button>

          <button
            onClick={handleRefresh}
            type="button"
            className="px-4 py-2.5 bg-[var(--canvas)] hover:bg-[var(--border)] border-crisp text-[var(--text-main)] font-sans font-medium text-sm rounded-md active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            title="Generate new password"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
            <span>Regenerate</span>
            <kbd className="hidden sm:inline-flex">Space</kbd>
          </button>
        </div>

        <button
          onClick={handleSurprise}
          type="button"
          className="w-full sm:w-auto px-4 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--canvas)] border-crisp text-xs font-mono rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>✨ Surprise Preset</span>
        </button>
      </div>
    </div>
  );
};
