
import { PromptTemplate, PresetTag } from '../types';

export const PRESET_TAGS_DATA: PresetTag[] = [
    { id: 'interior', de: 'Innen', en: 'Interior' },
    { id: 'exterior', de: 'Außen', en: 'Exterior' },
    { id: 'staging', de: 'Staging', en: 'Staging' },
    { id: 'retouch', de: 'Retusche', en: 'Retouch' },
    { id: 'mood', de: 'Mood', en: 'Mood' },
];

/**
 * DEFAULT_TEMPLATES is now primarily fetched from Supabase 'global_presets' table.
 * This array acts as a fallback or starting point if the DB is empty.
 */
export const DEFAULT_TEMPLATES: PromptTemplate[] = [
    // Leave empty to force DB usage, or add a single "Empty Room" example if desired.
];
