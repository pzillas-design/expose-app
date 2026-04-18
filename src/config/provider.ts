// Primary image generation provider. Keep in sync with supabase/functions/generate-image/index.ts.
// 'kie'    → Kie.ai is used directly (Google skipped, 0.5K unavailable)
// 'google' → Google Gemini is used first, Kie.ai as fallback on error
export const PRIMARY_PROVIDER: 'kie' | 'google' = 'kie';
