import React, { useEffect, useRef } from 'react';
import type { SecurityAudit } from '../types';
import { animateEntropyGauge } from '../utils/gsapUtils';

interface StrengthAuditorProps {
  audit: SecurityAudit;
}

export const StrengthAuditor: React.FC<StrengthAuditorProps> = ({ audit }) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animateEntropyGauge(barRef.current, audit.score);
  }, [audit.score]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-[var(--surface)] border-crisp rounded-xl p-6 sm:p-8 mt-6">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-6">
        <div>
          <h3 className="text-lg font-serif italic text-[var(--text-main)]">Security Audit & Analytics</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Cryptographic strength analysis & GPU cluster crack-time estimation
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-[var(--text-main)]">{audit.score}/100</div>
          <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
            Security Score
          </div>
        </div>
      </div>

      {/* GSAP Animated Strength Gauge Bar */}
      <div className="mb-8">
        <div className="h-3 w-full bg-[var(--canvas)] border-crisp rounded-full overflow-hidden p-0.5">
          <div
            ref={barRef}
            style={{ width: '0%' }}
            className={`h-full rounded-full transition-colors ${
              audit.rating === 'Weak'
                ? 'bg-rose-500'
                : audit.rating === 'Medium'
                ? 'bg-amber-500'
                : audit.rating === 'Strong'
                ? 'bg-sky-500'
                : 'bg-emerald-500'
            }`}
          ></div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-[var(--canvas)] border-crisp rounded-lg">
          <div className="text-xs font-mono text-[var(--text-muted)] uppercase mb-1">Time to Crack</div>
          <div className="text-sm font-sans font-semibold text-[var(--text-main)] break-words">
            {audit.crackTimeFormatted}
          </div>
          <div className="text-[10px] text-[var(--text-subtle)] mt-1">@ 100B guesses/sec GPU farm</div>
        </div>

        <div className="p-4 bg-[var(--canvas)] border-crisp rounded-lg">
          <div className="text-xs font-mono text-[var(--text-muted)] uppercase mb-1">Entropy</div>
          <div className="text-sm font-sans font-semibold text-[var(--text-main)]">
            {audit.entropy} bits
          </div>
          <div className="text-[10px] text-[var(--text-subtle)] mt-1">Information density score</div>
        </div>

        <div className="p-4 bg-[var(--canvas)] border-crisp rounded-lg">
          <div className="text-xs font-mono text-[var(--text-muted)] uppercase mb-1">Character Pool</div>
          <div className="text-sm font-sans font-semibold text-[var(--text-main)]">
            {audit.poolSize} unique chars
          </div>
          <div className="text-[10px] text-[var(--text-subtle)] mt-1">Total search space size</div>
        </div>
      </div>

      {/* Warnings & Security Tips */}
      <div className="space-y-3">
        {audit.warnings.length > 0 && (
          <div className="p-3.5 badge-red border-crisp rounded-lg text-xs flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
            <div>
              <span className="font-semibold">Security Warnings: </span>
              {audit.warnings.join(' • ')}
            </div>
          </div>
        )}

        {audit.tips.length > 0 && (
          <div className="p-3.5 badge-green border-crisp rounded-lg text-xs flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <span className="font-semibold">Audit Recommendation: </span>
              {audit.tips.join(' • ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
