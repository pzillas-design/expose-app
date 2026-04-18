// Primary image generation provider.
// 'kie'    → Kie.ai only
// 'google' → Google Gemini first, Kie.ai as fallback on error
// 'both'   → Kie + Google race in parallel, first success wins
export const PRIMARY_PROVIDER: 'kie' | 'google' | 'both' = 'kie';
