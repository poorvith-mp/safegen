import React, { useState } from 'react';
import { useHistory } from '../context/HistoryContext';
import { useToast } from '../context/ToastContext';

export const HistoryVault: React.FC = () => {
  const { history, toggleFavorite, removeHistoryItem, clearHistory, exportHistory } = useHistory();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [unmaskedIds, setUnmaskedIds] = useState<Record<string, boolean>>({});

  const toggleMask = (id: string) => {
    setUnmaskedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyItem = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      showToast('Vault password copied!', 'success');
    } catch {
      showToast('Failed to copy', 'error');
    }
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
            Stores up to 50 copied secrets, their mode, estimated strength and time in this browser's local storage. It is not encrypted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportHistory('csv')}
            disabled={history.length === 0}
            className="px-3 py-1.5 bg-[var(--canvas)] hover:bg-[var(--border)] border-crisp text-xs font-mono rounded-md transition-all disabled:opacity-40 cursor-pointer"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportHistory('json')}
            disabled={history.length === 0}
            className="px-3 py-1.5 bg-[var(--canvas)] hover:bg-[var(--border)] border-crisp text-xs font-mono rounded-md transition-all disabled:opacity-40 cursor-pointer"
          >
            Export JSON
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all history items?')) {
                clearHistory();
                showToast('History vault cleared', 'info');
              }
            }}
            disabled={history.length === 0}
            className="px-3 py-1.5 badge-red border-crisp text-xs font-mono rounded-md transition-all disabled:opacity-40 cursor-pointer"
          >
            Clear Vault
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <input
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
          <p className="text-xs text-[var(--text-subtle)]">Generated passwords will automatically record here locally.</p>
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
