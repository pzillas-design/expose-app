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
