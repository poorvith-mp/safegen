import React from 'react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-[var(--surface)] border-crisp rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm p-1 rounded-md transition-colors cursor-pointer"
        >
          ✕
        </button>

        <h3 className="text-xl font-serif italic text-[var(--text-main)] mb-1">
          SafeGen Utilitarian Architecture
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-6">
          System documentation, shortcuts, and license detail.
        </p>

        {/* Shortcuts Guide */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Keyboard Shortcuts
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-sans">
            <div className="flex items-center justify-between p-2 bg-[var(--canvas)] border-crisp rounded-md">
              <span>Generate Password</span>
              <kbd>Space</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-[var(--canvas)] border-crisp rounded-md">
              <span>Copy to Clipboard</span>
              <kbd>⌘C</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-[var(--canvas)] border-crisp rounded-md">
              <span>Surprise Preset</span>
              <kbd>Shift+R</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-[var(--canvas)] border-crisp rounded-md">
              <span>Toggle Dark Theme</span>
              <kbd>Shift+D</kbd>
            </div>
          </div>
        </div>

        {/* Tech Stack Info */}
        <div className="p-4 bg-[var(--canvas)] border-crisp rounded-lg mb-6 text-xs text-[var(--text-muted)] space-y-1">
          <div className="flex justify-between">
            <span>Engine:</span> <span className="font-mono text-[var(--text-main)]">React 19 + TypeScript</span>
          </div>
          <div className="flex justify-between">
            <span>Animations:</span> <span className="font-mono text-[var(--text-main)]">GSAP Core (GreenSock)</span>
          </div>
          <div className="flex justify-between">
            <span>Styling Protocol:</span> <span className="font-mono text-[var(--text-main)]">Minimalist Utilitarian UI</span>
          </div>
          <div className="flex justify-between">
            <span>Crypto Standard:</span> <span className="font-mono text-[var(--text-main)]">Web Crypto API (RNG)</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--text-main)] text-[var(--surface)] text-xs font-sans font-medium rounded-md hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
