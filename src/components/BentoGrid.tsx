import React, { useEffect, useRef } from 'react';
import { animateBentoStagger } from '../utils/gsapUtils';

export const BentoGrid: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.bento-card');
      animateBentoStagger(cards);
    }
  }, []);

  return (
    <section className="w-full max-w-4xl mx-auto mt-16 mb-24 px-2">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-serif italic text-[var(--text-main)] mb-2">
          Engineered for Utilitarian Security
        </h2>
        <p className="text-xs font-mono text-[var(--text-muted)] max-w-md mx-auto">
          Minimalist design principles combined with uncompromising browser-native cryptographic safety.
        </p>
      </div>

      <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 - Large Span 2 */}
        <div className="bento-card md:col-span-2 p-6 bg-[var(--surface)] border-crisp rounded-xl hover:border-[var(--text-subtle)] transition-all">
          <div className="w-8 h-8 rounded-lg badge-green flex items-center justify-center font-mono font-bold text-sm mb-4">
            01
          </div>
          <h3 className="text-lg font-sans font-semibold text-[var(--text-main)] mb-2">
            100% Offline & Zero Telemetry
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            All passwords, passphrases, and PINs are computed using the browser’s native{' '}
            <code className="font-mono text-[11px]">window.crypto.getRandomValues</code> API. Your generated keys never touch a remote server or analytics engine.
          </p>
        </div>

        {/* Card 2 - Single Span */}
        <div className="bento-card p-6 bg-[var(--surface)] border-crisp rounded-xl hover:border-[var(--text-subtle)] transition-all">
          <div className="w-8 h-8 rounded-lg badge-blue flex items-center justify-center font-mono font-bold text-sm mb-4">
            02
          </div>
          <h3 className="text-base font-sans font-semibold text-[var(--text-main)] mb-2">
            High-Entropy Mathematics
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Measures exact entropy bits using <code className="font-mono text-[11px]">E = L × log₂(N)</code>. Calculates real-time time-to-crack values against 100B guess/sec GPU clusters.
          </p>
        </div>

        {/* Card 3 - Single Span */}
        <div className="bento-card p-6 bg-[var(--surface)] border-crisp rounded-xl hover:border-[var(--text-subtle)] transition-all">
          <div className="w-8 h-8 rounded-lg badge-yellow flex items-center justify-center font-mono font-bold text-sm mb-4">
            03
          </div>
          <h3 className="text-base font-sans font-semibold text-[var(--text-main)] mb-2">
            Diceware Passphrases
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Uses curated wordlists to form memorable human-friendly passphrases with custom separators and capitalization.
          </p>
        </div>

        {/* Card 4 - Span 2 */}
        <div className="bento-card md:col-span-2 p-6 bg-[var(--surface)] border-crisp rounded-xl hover:border-[var(--text-subtle)] transition-all flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg badge-red flex items-center justify-center font-mono font-bold text-sm mb-4">
              04
            </div>
            <h3 className="text-lg font-sans font-semibold text-[var(--text-main)] mb-2">
              Physical Micro-UIs & Hotkeys
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Control the generator without touching your mouse using physical hardware keystrokes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
            <span className="text-[10px] font-mono text-[var(--text-subtle)]">Shortcuts:</span>
            <kbd>Space</kbd> <span className="text-[11px] text-[var(--text-muted)]">Generate</span>
            <kbd>⌘C</kbd> <span className="text-[11px] text-[var(--text-muted)]">Copy</span>
            <kbd>Shift+R</kbd> <span className="text-[11px] text-[var(--text-muted)]">Surprise</span>
          </div>
        </div>
      </div>
    </section>
  );
};
