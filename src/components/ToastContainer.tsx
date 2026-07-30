import React from 'react';
import { useToast } from '../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let badgeClass = 'badge-green';

        if (toast.type === 'error') {
          badgeClass = 'badge-red';
        } else if (toast.type === 'celebrate') {
          badgeClass = 'badge-blue';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border-crisp shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${badgeClass}`}
          >
            <span className="text-sm font-sans font-medium">{toast.text}</span>
          </div>
        );
      })}
    </div>
  );
};
