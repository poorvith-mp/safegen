import React, { useState } from 'react';
import { useHistory } from '../context/HistoryContext';
import { useToast } from '../context/ToastContext';
import { copyText } from '../utils/clipboard';

export const HistoryVault: React.FC = () => {
  const {
    history,
    persistenceEnabled,
    storageError,
    storedHistory,
    toggleFavorite,
    removeHistoryItem,
    clearHistory,
    exportHistory,
    enablePersistence,
    disablePersistence,
    deleteStoredHistory,
  } = useHistory();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [unmaskedIds, setUnmaskedIds] = useState<Record<string, boolean>>({});

  const toggleMask = (id: string) => {
    setUnmaskedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyItem = async (password: string) => {
    try {
      await copyText(password);
      showToast('Password copied to clipboard', 'success');
    } catch {
      showToast('Clipboard permission was denied', 'error');
    }
  };

  const exportWithWarning = (format: 'json' | 'csv') => {
    const confirmed = window.confirm(`Export ${format.toUpperCase()} as plaintext? Anyone with the file can read every saved secret.`);
    if (!confirmed) return;
    exportHistory(format);
    showToast(`Plaintext ${format.toUpperCase()} exported`, 'info');
  };

  const filteredHistory = history.filter((item) => {
    if (showFavoritesOnly && !item.isFavorite) return false;
    if (search.trim()) {
      return (
        item.password.toLowerCase().includes(search.toLowerCase()) ||
        item.mode.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-4xl mx-auto bg-[var(--surface)] border-crisp rounded-xl p-6 sm:p-8 mt-6">
      {/* Vault Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border)] mb-6">
        <div>
          <h3 className="text-xl font-serif italic text-[var(--text-main)]">Local history</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Copied secrets stay in memory for this session. Browser persistence is optional, plaintext, and limited to 50 items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportWithWarning('csv')}
            disabled={history.length === 0}
            className="px-3 py-1.5 bg-[var(--canvas)] hover:bg-[var(--border)] border-crisp text-xs font-mono rounded-md transition-all disabled:opacity-40 cursor-pointer"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportWithWarning('json')}
            disabled={history.length === 0}
            className="px-3 py-1.5 bg-[var(--canvas)] hover:bg-[var(--border)] border-crisp text-xs font-mono rounded-md transition-all disabled:opacity-40 cursor-pointer"
          >
            Export JSON
          </button>
          <button
            onClick={() => {
              if (window.confirm('Clear every item from the current session?')) {
                clearHistory();
                showToast('Session history cleared', 'info');
              }
            }}
            disabled={history.length === 0}
            className="px-3 py-1.5 badge-red border-crisp text-xs font-mono rounded-md transition-all disabled:opacity-40 cursor-pointer"
          >
            Clear Session
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 bg-[var(--canvas)] border-crisp rounded-lg text-xs text-[var(--text-muted)]" role="status">
        {storageError === 'delete-failed' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert"><strong className="text-[var(--text-main)]">The stored plaintext copy could not be deleted.</strong> It may still be present in browser storage.</p>
            <button type="button" onClick={deleteStoredHistory} className="px-3 py-2 badge-red border-crisp rounded-md">Retry delete</button>
          </div>
        ) : storageError === 'unavailable' ? (
          <p role="alert"><strong className="text-[var(--text-main)]">Browser storage is unavailable.</strong> History will remain in memory for this session; persistence cannot be enabled.</p>
        ) : persistenceEnabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p><strong className="text-[var(--text-main)]">Persistence on.</strong> History is stored unencrypted in this browser.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={disablePersistence} className="px-3 py-2 border-crisp rounded-md bg-[var(--surface)]">Use session only</button>
              <button type="button" onClick={deleteStoredHistory} className="px-3 py-2 badge-red border-crisp rounded-md">Delete stored copy</button>
            </div>
          </div>
        ) : storedHistory.status === 'available' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p><strong className="text-[var(--text-main)]">Stored history found ({storedHistory.items.length}).</strong> It has not been loaded into this session.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={enablePersistence} className="px-3 py-2 border-crisp rounded-md bg-[var(--surface)]">Load and keep it</button>
              <button type="button" onClick={deleteStoredHistory} className="px-3 py-2 badge-red border-crisp rounded-md">Delete stored copy</button>
            </div>
          </div>
        ) : storedHistory.status === 'invalid' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p><strong className="text-[var(--text-main)]">Unreadable stored history found.</strong> SafeGen left it untouched so you can choose what to do.</p>
            <button type="button" onClick={deleteStoredHistory} className="px-3 py-2 badge-red border-crisp rounded-md">Delete stored copy</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>History disappears when this tab session ends unless you explicitly keep a plaintext browser copy.</p>
            <button type="button" onClick={enablePersistence} className="px-3 py-2 border-crisp rounded-md bg-[var(--surface)]">Keep history on this device</button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <label htmlFor="history-search" className="sr-only">Search history</label>
          <input
            id="history-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search passwords or modes..."
            className="w-full pl-9 pr-4 py-2 bg-[var(--canvas)] border-crisp rounded-lg font-sans text-xs"
          />
          <svg
            className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>

        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          aria-pressed={showFavoritesOnly}
          className={`px-3 py-2 border-crisp rounded-lg text-xs font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
            showFavoritesOnly ? 'bg-[var(--text-main)] text-[var(--surface)]' : 'bg-[var(--canvas)] text-[var(--text-muted)]'
          }`}
        >
          <span>★ Favorites Only</span>
        </button>
      </div>

      {/* Vault Items List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm border-crisp rounded-lg border-dashed p-8">
          <p className="font-serif italic mb-1">No passwords in vault</p>
          <p className="text-xs text-[var(--text-subtle)]">Successfully copied credentials appear here for this session.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredHistory.map((item) => {
            const isUnmasked = Boolean(unmaskedIds[item.id]);

            return (
              <div
                key={item.id}
                className="p-3.5 bg-[var(--canvas)] border-crisp rounded-lg flex items-center justify-between gap-3 hover:border-[var(--text-subtle)] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`text-base transition-transform hover:scale-110 cursor-pointer ${
                      item.isFavorite ? 'text-amber-500' : 'text-[var(--text-subtle)] hover:text-amber-500'
                    }`}
                  >
                    ★
                  </button>

                  <div className="min-w-0">
                    <div className="font-mono text-sm tracking-wider text-[var(--text-main)] truncate select-all">
                      {isUnmasked ? item.password : '•'.repeat(Math.min(item.password.length, 24))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                      <span className="capitalize">{item.mode}</span>
                      <span>•</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span className="uppercase">{item.rating}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleMask(item.id)}
                    className="p-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition-all cursor-pointer"
                    title={isUnmasked ? 'Mask Password' : 'Unmask Password'}
                    aria-label={isUnmasked ? 'Mask password' : 'Reveal password'}
                  >
                    {isUnmasked ? '🙈' : '👁️'}
                  </button>
                  <button
                    onClick={() => copyItem(item.password)}
                    className="px-2.5 py-1 text-xs bg-[var(--surface)] border-crisp text-[var(--text-main)] rounded hover:bg-[var(--border)] transition-all cursor-pointer"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => removeHistoryItem(item.id)}
                    className="p-1 text-xs text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer"
                    title="Delete item"
                    aria-label="Delete history item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
