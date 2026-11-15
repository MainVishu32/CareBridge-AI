import { createClient } from '@supabase/supabase-js';

const normalizeSupabaseUrl = (url: string): string => {
  if (!url) return '';
  // Strips trailing /rest/v1 or trailing slashes to guarantee clean base URL
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
};

const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
  '';

export const supabaseUrl = normalizeSupabaseUrl(rawUrl);

export const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
  '';

// Detect if valid live Supabase credentials have been configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
