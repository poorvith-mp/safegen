import React from 'react';
import type { GeneratorMode, PasswordOptions } from '../types';

interface GeneratorControlsProps {
  options: PasswordOptions;
  onChange: (newOptions: PasswordOptions) => void;
}

export const GeneratorControls: React.FC<GeneratorControlsProps> = ({ options, onChange }) => {
  const setMode = (mode: GeneratorMode) => {
    onChange({ ...options, mode });
  };

  const updateOption = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-[var(--surface)] border-crisp rounded-xl p-6 sm:p-8 mt-6">
      {/* Mode Tabs */}
      <div className="mb-6">
        <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Generator Mode
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-[var(--canvas)] border-crisp rounded-lg">
          {(
            [
              { id: 'random', label: 'Random', desc: 'High Entropy' },
              { id: 'passphrase', label: 'Passphrase', desc: 'Memorable Words' },
              { id: 'pin', label: 'PIN Code', desc: 'Numeric Only' },
              { id: 'pattern', label: 'Pattern', desc: 'Custom Mask' }
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setMode(mode.id)}
              className={`px-3 py-2.5 rounded-md text-left transition-all cursor-pointer ${
                options.mode === mode.id
                  ? 'bg-[var(--surface)] border-crisp text-[var(--text-main)] shadow-2xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <div className="text-sm font-sans">{mode.label}</div>
              <div className="text-[10px] font-mono opacity-70">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Specific Controls */}
      {options.mode === 'random' && (
        <div className="space-y-6">
          {/* Length Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-sans font-medium text-[var(--text-main)]">
                Password Length
              </label>
              <span className="font-mono text-base font-semibold px-2.5 py-0.5 bg-[var(--canvas)] border-crisp rounded-md">
                {options.length} chars
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="64"
              value={options.length}
              onChange={(e) => updateOption('length', Number(e.target.value))}
              className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--text-main)]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-subtle)] mt-1">
              <span>6</span>
              <span>16</span>
              <span>32</span>
              <span>64</span>
            </div>
          </div>

          {/* Character Sets Toggles */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Included Characters
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'uppercase', label: 'Uppercase (A-Z)' },
                { key: 'lowercase', label: 'Lowercase (a-z)' },
                { key: 'numbers', label: 'Numbers (0-9)' },
                { key: 'symbols', label: 'Symbols (!@#$)' }
              ].map((item) => {
                const isChecked = Boolean(options[item.key as keyof PasswordOptions]);
                return (
                  <label
                    key={item.key}
                    className={`flex items-center gap-3 p-3 border-crisp rounded-lg cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-[var(--canvas)] border-[var(--text-main)] text-[var(--text-main)] font-medium'
                        : 'text-[var(--text-muted)] hover:bg-[var(--canvas)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        updateOption(item.key as keyof PasswordOptions, e.target.checked)
                      }
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--text-main)] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-sans">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {options.mode === 'passphrase' && (
        <div className="space-y-6">
          {/* Word Count Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-sans font-medium text-[var(--text-main)]">
                Number of Words
              </label>
              <span className="font-mono text-base font-semibold px-2.5 py-0.5 bg-[var(--canvas)] border-crisp rounded-md">
                {options.wordCount} words
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="8"
              value={options.wordCount}
              onChange={(e) => updateOption('wordCount', Number(e.target.value))}
              className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--text-main)]"
            />
          </div>

          {/* Separator & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-[var(--text-muted)] mb-1">
                Word Separator
              </label>
              <select
                value={options.separator}
                onChange={(e) => updateOption('separator', e.target.value as any)}
                className="w-full p-2.5 bg-[var(--canvas)] border-crisp rounded-lg font-mono text-sm"
              >
                <option value="-">Hyphen (-)</option>
                <option value="_">Underscore (_)</option>
                <option value=".">Period (.)</option>
                <option value=" ">Space ( )</option>
              </select>
            </div>

            <label className="flex items-center gap-3 p-3 bg-[var(--canvas)] border-crisp rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={options.capitalize}
                onChange={(e) => updateOption('capitalize', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--text-main)] cursor-pointer"
              />
              <span className="text-xs font-sans">Capitalize Words</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-[var(--canvas)] border-crisp rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeNumber}
                onChange={(e) => updateOption('includeNumber', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--text-main)] cursor-pointer"
              />
              <span className="text-xs font-sans">Include Number</span>
            </label>
          </div>
        </div>
      )}

      {options.mode === 'pin' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-sans font-medium text-[var(--text-main)]">
                PIN Digits Length
              </label>
              <span className="font-mono text-base font-semibold px-2.5 py-0.5 bg-[var(--canvas)] border-crisp rounded-md">
                {options.pinLength} digits
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              value={options.pinLength}
              onChange={(e) => updateOption('pinLength', Number(e.target.value))}
              className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--text-main)]"
            />
          </div>
        </div>
      )}

      {options.mode === 'pattern' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[var(--text-muted)] mb-1">
              Pattern Definition (L = Letter, n = Number, S = Symbol)
            </label>
            <input
              type="text"
              value={options.pattern}
              onChange={(e) => updateOption('pattern', e.target.value)}
              placeholder="Lnnn-Lnnn-S"
              className="w-full p-3 bg-[var(--canvas)] border-crisp rounded-lg font-mono text-sm"
            />
          </div>
          <div className="flex gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => updateOption('pattern', 'Lnnn-Lnnn-S')}
              className="px-2.5 py-1 bg-[var(--canvas)] border-crisp rounded hover:bg-[var(--border)]"
            >
              Lnnn-Lnnn-S
            </button>
            <button
              type="button"
              onClick={() => updateOption('pattern', 'LL-nnn-SS')}
              className="px-2.5 py-1 bg-[var(--canvas)] border-crisp rounded hover:bg-[var(--border)]"
            >
              LL-nnn-SS
            </button>
            <button
              type="button"
              onClick={() => updateOption('pattern', 'nnnn-nnnn-nnnn')}
              className="px-2.5 py-1 bg-[var(--canvas)] border-crisp rounded hover:bg-[var(--border)]"
            >
              nnnn-nnnn-nnnn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
