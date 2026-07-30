import React from 'react';

interface DockNavProps {
  onGenerate: () => void;
  onCopy: () => void;
  onOpenModal: () => void;
}

export const DockNav: React.FC<DockNavProps> = ({ onGenerate, onCopy, onOpenModal }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[var(--surface)]/90 backdrop-blur-md border-crisp shadow-lg rounded-full px-5 py-2.5 flex items-center gap-4 transition-transform hover:scale-105">
        <button
          onClick={onGenerate}
          className="flex items-center gap-1.5 text-xs font-sans font-medium text-[var(--text-main)] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span>Generate</span>
          <kbd>Space</kbd>
        </button>

        <div className="w-px h-4 bg-[var(--border)]"></div>

        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-xs font-sans font-medium text-[var(--text-main)] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span>Copy</span>
          <kbd>⌘C</kbd>
        </button>

        <div className="w-px h-4 bg-[var(--border)]"></div>

        <button
          onClick={onOpenModal}
          className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <span>Help</span>
          <kbd>?</kbd>
        </button>
      </div>
    </div>
  );
};
