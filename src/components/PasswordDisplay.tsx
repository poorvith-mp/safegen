import React, { useRef } from 'react';
import { useHistory } from '../context/HistoryContext';
import { useToast } from '../context/ToastContext';
import type { PasswordOptions, SecurityAudit } from '../types';
import { animateCopyBurst, animatePasswordRefresh } from '../utils/gsapUtils';
import { Copy, RefreshCw, Sparkles, Check } from 'lucide-react';

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
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!password) {
      showToast('Generate a password first', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      animateCopyBurst(copyBtnRef.current);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Password copied to clipboard', 'success');

      // Save to history vault
      addHistoryItem({
        password,
        mode: options.mode,
        rating: audit.rating,
        entropy: audit.entropy
      });
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = password;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Password copied to clipboard', 'success');
    }
  };

  const handleRefresh = () => {
    onGenerate();
    animatePasswordRefresh(passwordTextRef.current);
  };

  const handleSurprise = () => {
    onSurprise();
    showToast('Generator options shuffled', 'info');
  };

  const renderColoredPassword = (pwd: string) => {
    if (!pwd) return <span className="text-slate-400 italic">Click Generate to start</span>;

    return pwd.split('').map((char, index) => {
      let colorClass = 'text-slate-900';
      if (/[0-9]/.test(char)) colorClass = 'text-blue-600 font-semibold';
      else if (/[!@#$%^&*()_+{}[\]<>?/|~=-]/.test(char)) colorClass = 'text-amber-600 font-bold';
      else if (/[A-Z]/.test(char)) colorClass = 'text-emerald-700 font-semibold';

      return (
        <span key={index} className={colorClass}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs transition-all">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 text-xs font-mono uppercase tracking-wider text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-800">{options.mode} Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{audit.entropy} bits entropy</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
              audit.rating === 'Weak'
                ? 'bg-red-100 text-red-700 border border-red-200'
                : audit.rating === 'Medium'
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : audit.rating === 'Strong'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
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
          className="w-full min-h-[72px] sm:min-h-[84px] bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 flex items-center justify-between gap-4 font-mono text-xl sm:text-2xl md:text-3xl tracking-wider break-all select-all transition-all"
        >
          <div className="leading-relaxed">{renderColoredPassword(password)}</div>
          <div className="text-xs text-slate-400 shrink-0 hidden sm:block font-sans">
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
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold text-sm rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Password'}</span>
            <kbd className="ml-1 opacity-80 text-[10px] bg-emerald-700 border-0 px-1.5 py-0.5 rounded text-white">⌘C</kbd>
          </button>

          <button
            onClick={handleRefresh}
            type="button"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-sans font-medium text-sm rounded-md active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            title="Generate new password"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span>Regenerate</span>
            <kbd className="hidden sm:inline-flex text-[10px] bg-slate-200 text-slate-700 border-0">Space</kbd>
          </button>
        </div>

        <button
          onClick={handleSurprise}
          type="button"
          className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 border border-slate-200 text-xs font-mono rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Shuffle options</span>
        </button>
      </div>
    </div>
  );
};
