// Primary image generation provider.
// 'kie'    → Kie.ai first, Google Gemini as fallback on error
// 'google' → Google Gemini first, Kie.ai as fallback on error
export const PRIMARY_PROVIDER: 'kie' | 'google' = 'google';
