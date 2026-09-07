import React, { createContext, useContext, useEffect, useState } from 'react';
import type { HistoryItem } from '../types';
import {
  HISTORY_STORAGE_KEY,
  parseStoredHistory,
  removeStoredHistory,
  serializeHistory,
  type StoredHistory,
} from '../utils/history';

interface HistoryContextType {
  history: HistoryItem[];
  favorites: HistoryItem[];
  persistenceEnabled: boolean;
  storageError: 'unavailable' | 'delete-failed' | null;
  storedHistory: StoredHistory;
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'isFavorite'>) => void;
  toggleFavorite: (id: string) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  exportHistory: (format: 'json' | 'csv') => void;
  enablePersistence: () => void;
  disablePersistence: () => void;
  deleteStoredHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialStorage] = useState(() => {
    try {
      return { stored: parseStoredHistory(localStorage.getItem(HISTORY_STORAGE_KEY)), error: null };
    } catch {
      return { stored: { status: 'none', items: [] } as StoredHistory, error: 'unavailable' as const };
    }
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [storedHistory, setStoredHistory] = useState<StoredHistory>(initialStorage.stored);
  const [storageError, setStorageError] = useState<'unavailable' | 'delete-failed' | null>(initialStorage.error);

  useEffect(() => {
    if (!persistenceEnabled) return;
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      setStoredHistory({ status: 'available', items: history });
      setStorageError(null);
    } catch {
      setPersistenceEnabled(false);
      setStorageError('unavailable');
    }
  }, [history, persistenceEnabled]);

  const enablePersistence = () => {
    if (storageError || storedHistory.status === 'invalid') return;
    setHistory((current) => {
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...storedHistory.items.filter((item) => !seen.has(item.id))].slice(0, 50);
    });
    setPersistenceEnabled(true);
  };

  const disablePersistence = () => setPersistenceEnabled(false);

  const deleteStoredHistory = () => {
    let deleted = false;
    try { deleted = removeStoredHistory(localStorage); } catch { /* Access itself can be denied. */ }
    if (!deleted) {
      setStorageError('delete-failed');
      return;
    }
    setStorageError(null);
    setPersistenceEnabled(false);
    setStoredHistory({ status: 'none', items: [] });
  };

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
  };

  const exportHistory = (format: 'json' | 'csv') => {
    if (history.length === 0) return;

    const exported = serializeHistory(history, format);
    const blob = new Blob([exported.data], { type: exported.type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `safegen-history-${new Date().toISOString().slice(0, 10)}.${exported.extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const favorites = history.filter((item) => item.isFavorite);

  return (
    <HistoryContext.Provider
      value={{
        history,
        favorites,
        persistenceEnabled,
        storageError,
        storedHistory,
        addHistoryItem,
        toggleFavorite,
        removeHistoryItem,
        clearHistory,
        exportHistory,
        enablePersistence,
        disablePersistence,
        deleteStoredHistory,
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
