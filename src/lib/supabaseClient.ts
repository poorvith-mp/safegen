import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('xyzcompany.supabase.co') &&
  !supabaseUrl.includes('your-project.supabase.co');

const getCookieDomain = () => {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.endsWith('poorvithmp.com') ? '.poorvithmp.com' : '';
};

export const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null;
    const name = encodeURIComponent(key) + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(name) === 0) return decodeURIComponent(c.substring(name.length));
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return;
    const domain = getCookieDomain();
    const domainStr = domain ? `; domain=${domain}` : '';
    const secureStr = window.location.protocol === 'https:' ? '; Secure' : '';
    const maxAge = 30 * 24 * 60 * 60;
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/${domainStr}; max-age=${maxAge}; SameSite=Lax${secureStr}`;
  },
  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return;
    const domain = getCookieDomain();
    const domainStr = domain ? `; domain=${domain}` : '';
    document.cookie = `${encodeURIComponent(key)}=; path=/${domainStr}; max-age=0; SameSite=Lax`;
  }
};

export const supabase = createClient(
  supabaseUrl || 'https://xyzcompany.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
  {
    auth: {
      storage: cookieStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
