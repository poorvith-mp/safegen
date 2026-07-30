import React from 'react';
import { ArrowLeft, Lock, Moon, Sun, Monitor } from 'lucide-react';

export interface CypherHeaderProps {
  appName: string;
  appBadge?: string;
  theme?: 'system' | 'light' | 'dark';
  onThemeChange?: (theme: 'system' | 'light' | 'dark') => void;
  backUrl?: string;
  children?: React.ReactNode;
}

export const CypherHeader: React.FC<CypherHeaderProps> = ({
  appName,
  appBadge = 'v2.0',
  theme = 'system',
  onThemeChange,
  backUrl = '#',
  children
}) => {
  const toggleTheme = () => {
    if (!onThemeChange) return;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    onThemeChange(nextTheme);
  };

  return (
    <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Back to Labs & Brand Identity */}
        <div className="flex items-center gap-4 min-w-max">
          <a
            href={backUrl}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Back to Cypher Labs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Labs</span>
          </a>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-slate-100 font-sans">
              {appName}
            </span>
            {appBadge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {appBadge}
              </span>
            )}
          </div>
        </div>

        {/* Center: Custom Navigation / Tabs */}
        {children && (
          <div className="flex-1 flex justify-center max-w-md mx-auto">
            {children}
          </div>
        )}

        {/* Right: Local-First Privacy Badge & Theme Controls */}
        <div className="flex items-center gap-3 min-w-max">
          {/* Privacy Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80">
            <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Local-First (Browser Only)</span>
            <span className="md:hidden">Local-First</span>
          </div>

          {/* Theme Switcher */}
          {onThemeChange && (
            <button
              onClick={toggleTheme}
              type="button"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              title={`Switch theme (current: ${theme})`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
