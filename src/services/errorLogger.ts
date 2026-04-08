import { supabase } from './supabaseClient';

export type ErrorSource = 'toast' | 'silent' | 'edge-function';

interface LogErrorOptions {
    context?: string;   // e.g. "handleGenerate", "loadImages"
    source?: ErrorSource;
}

/**
 * Fire-and-forget error logger.
 * Writes to error_logs table using the current auth session.
 * Safe to call anywhere — never throws.
 */
export async function logError(message: string, options: LogErrorOptions = {}): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        // Don't log if not authenticated — no session means we can't satisfy RLS
        if (!session?.user?.id) return;

        await supabase.from('error_logs').insert({
            user_id: session.user.id,
            message: String(message).slice(0, 1000), // cap length
            context: options.context ?? null,
            url: typeof window !== 'undefined' ? window.location.pathname : null,
            source: options.source ?? 'toast',
        });
    } catch {
        // Truly silent — never let logging break the app
    }
}
