import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BentoGrid } from './components/BentoGrid';
import { CreditsModal } from './components/CreditsModal';
import { DockNav } from './components/DockNav';
import { GeneratorControls } from './components/GeneratorControls';
import { Header } from './components/Header';
import { HistoryVault } from './components/HistoryVault';
import { PasswordDisplay } from './components/PasswordDisplay';
import { StrengthAuditor } from './components/StrengthAuditor';
import { useHistory } from './context/HistoryContext';
import { useToast } from './context/ToastContext';
import type { PasswordOptions, ViewType } from './types';
import { calculateDetailedAudit, generatePassword } from './utils/generator';
import { animateViewTransition } from './utils/gsapUtils';

const DEFAULT_OPTIONS: PasswordOptions = {
  mode: 'random',
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  wordCount: 4,
  separator: '-',
  capitalize: true,
  includeNumber: true,
  pinLength: 6,
  pattern: 'Lnnn-Lnnn-S'
};

import { syncEcosystemAuth } from './lib/ecosystemAuth';

export function App() {
  const { showToast } = useToast();
  const { addHistoryItem } = useHistory();

  const [currentView, setCurrentView] = useState<ViewType>('generator');
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState<string>('');
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    syncEcosystemAuth((user) => {
      setCurrentUser(user);
    });
  }, []);

  const viewContainerRef = useRef<HTMLDivElement>(null);

  // Generate password on options change or trigger
  const handleGenerate = useCallback(() => {
    const newPwd = generatePassword(options);
    setPassword(newPwd);
  }, [options]);

  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  const audit = useMemo(() => {
    return calculateDetailedAudit(password, options);
  }, [password, options]);

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    if (viewContainerRef.current) {
      animateViewTransition(viewContainerRef.current);
    }
  };

  const handleSurprise = () => {
    const lengths = [12, 16, 20, 24];
    const newLength = lengths[Math.floor(Math.random() * lengths.length)];
    const modes = ['random', 'passphrase', 'pin'] as const;
    const newMode = modes[Math.floor(Math.random() * modes.length)];

    setOptions((prev) => ({
      ...prev,
      mode: newMode,
      length: newLength,
      wordCount: 4,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true
    }));
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when focused inside inputs or textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleGenerate();
        showToast('New password generated', 'success');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        if (password) {
          navigator.clipboard.writeText(password);
          addHistoryItem({
            password,
            mode: options.mode,
            rating: audit.rating,
            entropy: audit.entropy
          });
          showToast('Password copied to clipboard', 'success');
        }
      } else if (e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleSurprise();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, password, options, audit, addHistoryItem, showToast]);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-main)] flex flex-col font-sans selection:bg-[var(--text-main)] selection:text-[var(--surface)]">
      {/* Header Bar */}
      <Header currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main ref={viewContainerRef} className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-32">
        {currentView === 'generator' && (
          <>
            {/* Hero Heading */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic tracking-tight mb-3">
                Utilitarian Password Engine
              </h1>
              <p className="text-xs sm:text-sm font-mono text-[var(--text-muted)] leading-relaxed">
                Browser-native cryptographically secure random generator, passphrases, and local vault.
              </p>
            </div>

            {/* Core Generator Components */}
            <PasswordDisplay
              password={password}
              options={options}
              audit={audit}
              onGenerate={handleGenerate}
              onSurprise={handleSurprise}
            />

            <GeneratorControls options={options} onChange={setOptions} />

            <StrengthAuditor audit={audit} />

            <BentoGrid />
          </>
        )}

        {currentView === 'vault' && <HistoryVault />}

        {currentView === 'audit' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h1 className="text-3xl font-serif italic mb-2">Cryptographic Auditor</h1>
              <p className="text-xs font-mono text-[var(--text-muted)]">
                In-depth mathematical breakdown of password strength metrics and vulnerability analysis.
              </p>
            </div>
            <StrengthAuditor audit={audit} />
          </div>
        )}
      </main>

      {/* Floating Bottom Dock Navigation */}
      <DockNav
        onGenerate={handleGenerate}
        onCopy={() => {
          if (password) {
            navigator.clipboard.writeText(password);
            showToast('Password copied', 'success');
          }
        }}
        onOpenModal={() => setIsCreditsOpen(true)}
      />

      {/* Credits & Keyboard Shortcuts Modal */}
      <CreditsModal isOpen={isCreditsOpen} onClose={() => setIsCreditsOpen(false)} />
      <Analytics />
    </div>
  );
}

export default App;
