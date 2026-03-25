import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing from environment variables.');
}

// Capture the URL hash type synchronously BEFORE createClient() — Supabase's _initialize()
// is async and clears the hash in a microtask, which runs before any React useEffect.
// This is the only reliable way to detect a recovery redirect at page load time.
export const initialUrlHashType: string | null = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.hash.substring(1)).get('type')
    : null;

export const supabase = createClient(
    supabaseUrl || '',
    (supabaseAnonKey || '').trim()
);
