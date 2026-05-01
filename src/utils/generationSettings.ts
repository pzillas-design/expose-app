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
 * One-shot migration that flips legacy `provider: 'fal-nb2'` localStorage entries
 * to `'openai'` so existing users land on the new default the next time they
 * open the app. Persists a migration flag so a user who later *consciously*
 * picks NB2 in the settings modal won't get auto-migrated again on next reload.
 *
 * Call once from the top-level App mount.
 */
const PROVIDER_MIGRATION_KEY = 'expose:provider-migration:openai-default-v1';
export const migrateProviderToOpenAIOnce = (): { ran: boolean; migrated: boolean } => {
    try {
        if (typeof window === 'undefined') return { ran: false, migrated: false };
        if (window.localStorage.getItem(PROVIDER_MIGRATION_KEY)) return { ran: false, migrated: false };

        const current = loadGenerationSettings();
        let migrated = false;
        if (current.provider === 'fal-nb2') {
            saveGenerationSettings({ ...current, provider: 'openai' });
            migrated = true;
        }
        window.localStorage.setItem(PROVIDER_MIGRATION_KEY, new Date().toISOString());
        return { ran: true, migrated };
    } catch (_) {
        return { ran: false, migrated: false };
    }
};
