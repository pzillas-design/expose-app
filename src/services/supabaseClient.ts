import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing from environment variables.');
}

// Capture the URL hash type synchronously BEFORE createClient() — Supabase's _initialize()
// is async and clears the hash in a microtask, which runs before any React useEffect.
// This is the only reliable way to detect a recovery redirect at page load time.
const initialHashParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.hash.substring(1))
    : null;
export const initialUrlHashType: string | null = initialHashParams?.get('type') ?? null;
// Error redirects (expired/used recovery link → #error=access_denied&error_code=otp_expired)
// must be captured synchronously too — by the time a useEffect reads
// window.location.hash, Supabase has already cleared it.
export const initialUrlErrorCode: string | null = initialHashParams?.get('error_code') ?? null;
export const initialUrlErrorDescription: string | null = initialHashParams?.get('error_description') ?? null;

export const supabase = createClient(
    supabaseUrl || '',
    (supabaseAnonKey || '').trim()
);
