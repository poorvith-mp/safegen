import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AccentColor, Preferences, ThemeMode } from '../types';

const STORAGE_KEY = 'safegen-preferences';

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  accent: 'indigo',
  radius: 22,
  motion: 70,
  autoCopy: true,
  maskVault: true
};

interface ThemeContextType extends Preferences {
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setRadius: (radius: number) => void;
  setMotion: (motion: number) => void;
  resetPreferences: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    body.setAttribute('data-theme', preferences.theme);
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    body.setAttribute('data-accent', preferences.accent);
    root.style.setProperty('--radius', `${preferences.radius}px`);
    root.style.setProperty('--motion-factor', (preferences.motion / 100).toString());

    if (preferences.motion === 0) {
      body.classList.add('low-motion');
    } else {
      body.classList.remove('low-motion');
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
  }, [preferences]);

  const setTheme = (theme: ThemeMode) => setPreferences((prev) => ({ ...prev, theme }));
  const setAccent = (accent: AccentColor) => setPreferences((prev) => ({ ...prev, accent }));
  const setRadius = (radius: number) => setPreferences((prev) => ({ ...prev, radius }));
  const setMotion = (motion: number) => setPreferences((prev) => ({ ...prev, motion }));

  const resetPreferences = () => setPreferences(DEFAULT_PREFERENCES);

  return (
    <ThemeContext.Provider
      value={{
        ...preferences,
        setTheme,
        setAccent,
        setRadius,
        setMotion,
        resetPreferences
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
