import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { BentoGrid } from './components/BentoGrid';
import { GeneratorControls } from './components/GeneratorControls';
import { DocumentationHub } from './components/DocumentationHub';
import { AgentSetup } from './components/AgentSetup';
import { LandingPage } from './components/LandingPage';
import { AboutPage } from './components/AboutPage';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HistoryVault } from './components/HistoryVault';
import { PasswordDisplay } from './components/PasswordDisplay';
import { StrengthAuditor } from './components/StrengthAuditor';
import { useHistory } from './context/HistoryContext';
import { useToast } from './context/ToastContext';
import type { PasswordOptions } from './types';
import { calculateDetailedAudit, generatePassword } from './utils/generator';
import { randomInt } from './utils/generator';
import { copyText } from './utils/clipboard';

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

const ROUTES: Record<string, string> = {
  '/': 'Local credentials and approved agent actions', '/generator': 'Password generator',
  '/generator/history': 'Copied history', '/generator/estimate': 'Strength estimate',
  '/setup': 'Agent setup', '/docs': 'Documentation', '/about': 'About',
};
const currentUrl = () => window.location.pathname + window.location.search + window.location.hash;

export function App() {
  const { showToast } = useToast();
  const { addHistoryItem } = useHistory();

  const [url, setUrl] = useState(currentUrl);
  const currentPath = new URL(url, window.location.origin).pathname.replace(/\/$/, '') || '/';
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState<string>('');

  const viewContainerRef = useRef<HTMLElement>(null);
  const navigationFocus = useRef(false);

  useEffect(() => {
    const update = () => { navigationFocus.current = true; setUrl(currentUrl()); };
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    return () => { window.removeEventListener('popstate', update); window.removeEventListener('hashchange', update); };
  }, []);

  useEffect(() => {
    document.title = `${ROUTES[currentPath] ?? 'Page not found'} · SafeGen`;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `https://safegen.poorvithmp.com${ROUTES[currentPath] ? currentPath : '/'}`;
    const frame = requestAnimationFrame(() => {
      let target: HTMLElement | null = null;
      try { target = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); } catch { /* Malformed fragments have no target. */ }
      if (target) target.scrollIntoView();
      else if (navigationFocus.current) window.scrollTo(0, 0);
      if (navigationFocus.current) {
        const focusTarget = target ?? viewContainerRef.current;
        focusTarget?.setAttribute('tabindex', '-1');
        focusTarget?.focus({ preventScroll: true });
      }
      navigationFocus.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [url, currentPath]);

  const handleLink = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    const destination = new URL(anchor.href);
    const path = destination.pathname.replace(/\/$/, '') || '/';
    if (destination.origin !== window.location.origin || !ROUTES[path]) return;
    const next = destination.pathname + destination.search + destination.hash;
    event.preventDefault();
    if (next === currentUrl()) {
      if (destination.hash) document.getElementById(destination.hash.slice(1))?.scrollIntoView();
      else window.scrollTo(0, 0);
      return;
    }
    window.history.pushState(null, '', next);
    navigationFocus.current = true;
    setUrl(next);
  };

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

  const handleSurprise = () => {
    const lengths = [12, 16, 20, 24];
    const newLength = lengths[randomInt(lengths.length)];
    const modes = ['random', 'passphrase', 'pin'] as const;
    const newMode = modes[randomInt(modes.length)];

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
      if (currentPath !== '/generator') return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c' && window.getSelection()?.toString()) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleGenerate();
        showToast('New password generated', 'success');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (password) {
          void copyText(password).then(() => {
            addHistoryItem({
              password,
              mode: options.mode,
              rating: audit.rating,
              entropy: audit.entropy
            });
            showToast('Password copied to clipboard', 'success');
          }).catch(() => showToast('Clipboard permission was denied', 'error'));
        }
      } else if (e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleSurprise();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, password, options, audit, addHistoryItem, showToast, currentPath]);

  return (
    <div onClick={handleLink} className="app-shell bg-[var(--canvas)] text-[var(--text-main)] flex flex-col font-sans selection:bg-[var(--text-main)] selection:text-[var(--surface)]">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {/* Header Bar */}
      <Header currentPath={currentPath} />

      {/* Main Content Area */}
      <main id="main-content" ref={viewContainerRef} tabIndex={-1} className="site-main">
        {currentPath === '/' && <LandingPage />}
        {currentPath === '/about' && <AboutPage />}
        {currentPath === '/setup' && <AgentSetup />}
        {currentPath.startsWith('/generator') && <nav className="generator-nav" aria-label="Generator tools">{[
          { href: '/generator', label: 'Generate' }, { href: '/generator/history', label: 'Copied history' }, { href: '/generator/estimate', label: 'Strength estimate' },
        ].map(({ href, label }) => <a key={href} href={href} aria-current={currentPath === href ? 'page' : undefined}>{label}</a>)}</nav>}
        {currentPath === '/generator' && (
          <>
            {/* Hero Heading */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic tracking-tight mb-3">
                Make a strong password. Keep it on your device.
              </h1>
              <p className="text-xs sm:text-sm font-mono text-[var(--text-muted)] leading-relaxed">
                Four browser-local generation modes using the Web Crypto API. No account and no secret upload.
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

        {currentPath === '/generator/history' && <HistoryVault />}

        {currentPath === '/docs' && <DocumentationHub />}

        {currentPath === '/generator/estimate' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h1 className="text-3xl font-serif italic mb-2">Strength estimate</h1>
              <p className="text-xs font-mono text-[var(--text-muted)]">
                For your current generated credential. Entropy and crack time are estimates, assuming uniform generation and 100 billion offline guesses per second. Real attacks and password rules vary.
              </p>
              <a className="text-link" href="/generator">Change generation options</a>
            </div>
            <StrengthAuditor audit={audit} />
          </div>
        )}
        {!ROUTES[currentPath] && <section className="not-found"><p className="eyebrow">Page not found</p><h1>This path doesn’t lead to SafeGen.</h1><a className="button-primary" href="/">Return home</a></section>}
      </main>

      <Footer />
    </div>
  );
}

export default App;
