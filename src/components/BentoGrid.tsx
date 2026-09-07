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
            Local tools with explicit boundaries
        </h2>
        <p className="text-xs font-mono text-[var(--text-muted)] max-w-md mx-auto">
          Generate credentials in your browser, or let an owner-controlled broker perform narrow account actions for agents.
        </p>
      </div>

      <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 - Large Span 2 */}
        <div className="bento-card md:col-span-2 p-6 bg-[var(--surface)] border-crisp rounded-xl hover:border-[var(--text-subtle)] transition-all">
          <div className="w-8 h-8 rounded-lg badge-green flex items-center justify-center font-mono font-bold text-sm mb-4">
            01
          </div>
          <h3 className="text-lg font-sans font-semibold text-[var(--text-main)] mb-2">
            Browser-local generation
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Passwords, passphrases, and PINs use the browser’s native{' '}
            <code className="font-mono text-[11px]">crypto.getRandomValues</code> API. SafeGen does not send generated values to a server or analytics service.
          </p>
        </div>

        {/* Card 2 - Single Span */}
        <div className="bento-card p-6 bg-[var(--surface)] border-crisp rounded-xl hover:border-[var(--text-subtle)] transition-all">
          <div className="w-8 h-8 rounded-lg badge-blue flex items-center justify-center font-mono font-bold text-sm mb-4">
            02
          </div>
          <h3 className="text-base font-sans font-semibold text-[var(--text-main)] mb-2">
            Transparent estimates
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Shows a generated search-space estimate using <code className="font-mono text-[11px]">E = L × log₂(N)</code> and a stated 100B guesses-per-second model. These figures are estimates, not guarantees.
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
            Selects uniformly from EFF’s 7,776-word long list, bundled locally under CC BY 3.0 US, with custom separators and capitalization.
          </p>
        </div>

        {/* Card 4 - Span 2 */}
        <div className="bento-card md:col-span-2 p-6 bg-[var(--surface)] border-crisp rounded-xl hover:border-[var(--text-subtle)] transition-all flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg badge-red flex items-center justify-center font-mono font-bold text-sm mb-4">
              04
            </div>
            <h3 className="text-lg font-sans font-semibold text-[var(--text-main)] mb-2">
              Agent actions without shared credentials
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              The local action broker keeps provider credentials outside the agent boundary. Each fixed GitHub or Cloudflare action needs fresh owner approval before the broker performs it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
            Deployment requires a separate OS user for real isolation; same-user mode is for synthetic development only.
          </div>
        </div>
      </div>
    </section>
  );
};
