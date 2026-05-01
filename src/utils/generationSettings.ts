/**
 * Tiny persistence/back-channel for the GenerationSettings the user picked in the
 * settings modal. Avoids having to refactor the full onGenerate → useNanoController
 * → performGeneration → imageService prop chain just to pass three extra fields.
 *
 * The modal writes settings here on change; imageService.generateImage reads from
 * here at invoke time and merges into the edge-function payload.
 */

import { DEFAULT_GENERATION_SETTINGS, type GenerationSettings } from '@/types';

const KEY = 'expose:generation-settings:v1';

export const saveGenerationSettings = (settings: GenerationSettings): void => {
    try {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (_) { /* ignore quota / disabled storage */ }
};

export const loadGenerationSettings = (): GenerationSettings => {
    try {
        if (typeof window === 'undefined') return DEFAULT_GENERATION_SETTINGS;
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return DEFAULT_GENERATION_SETTINGS;
        const parsed = JSON.parse(raw) as Partial<GenerationSettings>;
        // Merge with defaults so newly added fields don't turn into undefined.
        return { ...DEFAULT_GENERATION_SETTINGS, ...parsed };
    } catch (_) {
        return DEFAULT_GENERATION_SETTINGS;
    }
};

/**
 * Earlier one-shot migration that flipped fal-nb2 → openai. Kept around as a
 * no-op marker so future migration logic can inspect the flag if needed.
 */
const PROVIDER_MIGRATION_KEY = 'expose:provider-migration:openai-default-v1';

/**
 * REVERT migration: flip everyone back to Nano Banana 2 + 1K resolution after
 * gpt-image-2 quality didn't hold up in production. Users who consciously pick
 * GPT Image 2 *after* this migration ran won't be auto-reverted again on next
 * reload — the flag's already set.
 *
 * Call once from the top-level App mount.
 */
const PROVIDER_REVERT_KEY = 'expose:provider-migration:nb2-revert-v1';
export const revertProviderToNB2Once = (): { ran: boolean; migrated: boolean } => {
    try {
        if (typeof window === 'undefined') return { ran: false, migrated: false };
        if (window.localStorage.getItem(PROVIDER_REVERT_KEY)) return { ran: false, migrated: false };

        const current = loadGenerationSettings();
        const next: GenerationSettings = {
            ...current,
            provider: 'fal-nb2',
            resolution: 'nb2-1k',
        };
        const changed = current.provider !== 'fal-nb2' || current.resolution !== 'nb2-1k';
        if (changed) saveGenerationSettings(next);
        window.localStorage.setItem(PROVIDER_REVERT_KEY, new Date().toISOString());
        return { ran: true, migrated: changed };
    } catch (_) {
        return { ran: false, migrated: false };
    }
};

/** @deprecated Use revertProviderToNB2Once. Kept for older callers / no-op safety. */
export const migrateProviderToOpenAIOnce = (): { ran: boolean; migrated: boolean } => {
    // The original openai migration is intentionally a no-op now — we reverted
    // the default. Setting the flag so the legacy code path stays idempotent
    // even if some build still references it.
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(PROVIDER_MIGRATION_KEY, new Date().toISOString());
        }
    } catch (_) { /* ignore */ }
    return { ran: false, migrated: false };
};
