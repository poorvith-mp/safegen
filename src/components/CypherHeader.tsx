import React from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

export interface CypherHeaderProps {
  appName: string;
  appBadge?: string;
  backUrl?: string;
  children?: React.ReactNode;
}

export const CypherHeader: React.FC<CypherHeaderProps> = ({
  appName,
  appBadge = 'v2.0',
  backUrl = '/',
  children
}) => {
  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Back to Labs & Brand Identity */}
        <div className="flex items-center gap-4 min-w-max">
          <a
            href={backUrl}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 transition-colors px-2.5 py-1.5 rounded-md hover:bg-slate-100"
            title="Back to PoorvithMP Tools"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">← Back to PoorvithMP Tools</span>
            <span className="sm:hidden">← Back</span>
          </a>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-semibold text-base tracking-tight text-slate-900 font-sans">
              {appName}
            </span>
            {appBadge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
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

        {/* Right: Local-First Privacy Badge */}
        <div className="flex items-center gap-3 min-w-max">
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">🔒 Local-First (Browser Only)</span>
            <span className="md:hidden">🔒 Local-First</span>
          </div>
        </div>
      </div>
    </header>
  );
};
