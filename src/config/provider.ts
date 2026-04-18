// Primary image provider. Keep in sync with supabase/functions/generate-image/index.ts.
// 'kie' = Kie.ai directly (Google skipped, 0.5K unavailable).
// 'google' = Google first, Kie as fallback on error.
export const PRIMARY_PROVIDER: 'kie' | 'google' = 'kie';
