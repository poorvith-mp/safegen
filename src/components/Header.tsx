import React from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import type { ViewType } from '../types';
import { AppLauncherDropdown } from './AppLauncherDropdown';

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Back to Main Hub & Brand Identity */}
        <div className="flex items-center gap-4 min-w-max">
          <a
            href="https://poorvithmp.com"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 transition-colors px-2.5 py-1.5 rounded-md hover:bg-slate-100"
            title="Back to Main Hub"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">← Back to Main Hub</span>
            <span className="sm:hidden">← Back</span>
          </a>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div
            onClick={() => onNavigate('generator')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-slate-900 font-sans">
                SafeGen
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                v2.0
              </span>
            </div>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
          {(
            [
              { id: 'generator', label: 'Generator' },
              { id: 'vault', label: 'Vault' },
              { id: 'audit', label: 'Security Audit' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-all cursor-pointer ${
                currentView === tab.id
                  ? 'bg-white text-emerald-700 border border-slate-200/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Controls: Local-First Badge & App Launcher */}
        <div className="flex items-center gap-3 min-w-max">
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">🔒 Local-First</span>
          </div>
          <AppLauncherDropdown />
        </div>
      </div>
    </header>
  );
};

