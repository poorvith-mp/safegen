import React, { createContext, useContext, useEffect, useState } from 'react';
import type { HistoryItem } from '../types';

const VAULT_STORAGE_KEY = 'safegen-history-vault';

interface HistoryContextType {
  history: HistoryItem[];
  favorites: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'isFavorite'>) => void;
  toggleFavorite: (id: string) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  exportHistory: (format: 'json' | 'csv') => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.slice(0, 50).filter((item) => item && typeof item.password === 'string');
      }
    } catch { try { localStorage.removeItem(VAULT_STORAGE_KEY); } catch { /* Storage is unavailable. */ } }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(history));
    } catch { /* Storage can be unavailable; generation still works. */ }
  }, [history]);

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp' | 'isFavorite'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: globalThis.crypto.randomUUID(),
      timestamp: Date.now(),
      isFavorite: false
    };

    setHistory((prev) => {
      // Avoid duplicate consecutive additions
      if (prev.length > 0 && prev[0].password === item.password) {
        return prev;
      }
      return [newItem, ...prev.slice(0, 49)];
    });
  };

  const toggleFavorite = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  };

  const removeHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(VAULT_STORAGE_KEY); } catch { /* Nothing else to clear. */ }
  };

  const exportHistory = (format: 'json' | 'csv') => {
    if (history.length === 0) return;

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      const dataStr = JSON.stringify(history, null, 2);
      blob = new Blob([dataStr], { type: 'application/json' });
      filename = `safegen-vault-${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      const headers = 'ID,Password,Mode,Rating,Entropy,Timestamp,IsFavorite\n';
      const rows = history
        .map(
          (h) =>
            `"${h.id}","${h.password.replace(/"/g, '""')}","${h.mode}","${h.rating}",${h.entropy},"${new Date(h.timestamp).toISOString()}",${h.isFavorite}`
        )
        .join('\n');
      blob = new Blob([headers + rows], { type: 'text/csv' });
      filename = `safegen-vault-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const favorites = history.filter((item) => item.isFavorite);

  return (
    <HistoryContext.Provider
      value={{
        history,
        favorites,
        addHistoryItem,
        toggleFavorite,
        removeHistoryItem,
        clearHistory,
        exportHistory
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
