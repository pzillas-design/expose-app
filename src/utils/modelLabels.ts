/**
 * Single source of truth for image-model labels — keep UI honest about which
 * provider actually generated (or will generate) an image.
 *
 * Default provider is now **OpenAI gpt-image-2** (via fal) for every host,
 * including production (expose.ae). Set VITE_IMAGE_PROVIDER=fal-nb2 (Vercel
 * env var or .env.local) to fall back to Nano Banana 2 — useful for one-off
 * comparisons or as an emergency rollback.
 */

export type ImageProviderKey = 'fal-nb2' | 'openai';

export const detectImageProvider = (): ImageProviderKey => {
    const override = (import.meta.env?.VITE_IMAGE_PROVIDER as string | undefined)?.toLowerCase();
    if (override === 'openai' || override === 'fal-nb2') return override;
    return 'openai';
};

const TIER_LABELS: Record<string, string> = {
    'nb2-05k': '0.5K',
    'nb2-1k':  '1K',
    'nb2-2k':  '2K',
    'nb2-4k':  '4K',
};

const TIER_RES: Record<string, string> = {
    'nb2-05k': '512 px',
    'nb2-1k':  '1024 px',
    'nb2-2k':  '2048 px',
    'nb2-4k':  '4096 px',
};

const PROVIDER_DISPLAY_NAME: Record<ImageProviderKey, string> = {
    'fal-nb2': 'Nano Banana 2',
    'openai':  'GPT Image 2',
};

/** Map a stored DB `model_version` (e.g. 'gpt-image-2', 'nano-banana-2') to a provider key. */
export const modelVersionToProvider = (modelVersion?: string | null): ImageProviderKey => {
    if (modelVersion === 'gpt-image-2') return 'openai';
    return 'fal-nb2';
};

/**
 * Label for an *already-generated* image — uses the model_version stored on the
 * DB row, so old NB2-generated images stay labelled NB2 even if the host now
 * runs gpt-image-2. Falls back to NB2 if model_version is missing.
 */
export const getStoredImageLabel = (qualityMode: string, modelVersion?: string | null): string => {
    const tier = TIER_LABELS[qualityMode] || qualityMode;
    const provider = modelVersionToProvider(modelVersion);
    return `${PROVIDER_DISPLAY_NAME[provider]} · ${tier}`;
};

/**
 * Label for the *picker* (CreationModal, PromptTab) — reflects the provider
 * that this host *will* use, so users on staging see "GPT Image 2 · 1K", users
 * on prod see "Nano Banana 2 · 1K".
 */
export const getCurrentProviderTierLabel = (qualityMode: string): string => {
    const tier = TIER_LABELS[qualityMode] || qualityMode;
    const provider = detectImageProvider();
    return `${PROVIDER_DISPLAY_NAME[provider]} · ${tier}`;
};

/** Resolution descriptor for the picker (e.g. "1024 px · schnell"). */
export const getTierResolution = (qualityMode: string): string => TIER_RES[qualityMode] || '';
