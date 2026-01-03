
import { PromptTemplate, PresetTag } from '../types';

export const PRESET_TAGS_DATA: PresetTag[] = [
    { id: 'interior', de: 'Innen', en: 'Interior' },
    { id: 'exterior', de: 'Außen', en: 'Exterior' },
    { id: 'staging', de: 'Staging', en: 'Staging' },
    { id: 'retouch', de: 'Retusche', en: 'Retouch' },
    { id: 'mood', de: 'Mood', en: 'Mood' },
];

/**
 * DEFAULT_TEMPLATES are system-level presets that should always be available
 * and are pinned by default to give users a starting point.
 */
export const DEFAULT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'sys-staging-pro',
        title: 'Staging',
        prompt: 'Richte den Raum in einem einheitlichen Designstil ein. Behalte bestehende Strukturelemente bei.',
        tags: ['Innen', 'Staging'],
        isPinned: true,
        isCustom: false,
        usageCount: 0,
        lang: 'de',
        controls: [
            {
                id: 'c-room',
                label: 'Raum',
                options: [
                    { id: 'opt-living', label: 'Wohn-/Essbereich', value: 'Wohn- und Essbereich' },
                    { id: 'opt-kitchen', label: 'Küche', value: 'Küche' },
                    { id: 'opt-bedroom', label: 'Schlafen', value: 'Schlafzimmer' },
                    { id: 'opt-kids', label: 'Kinderzimmer', value: 'Kinderzimmer' },
                    { id: 'opt-bath', label: 'Bad', value: 'Badezimmer' },
                    { id: 'opt-hall', label: 'Flur', value: 'Flur' },
                    { id: 'opt-office', label: 'Büro', value: 'Home Office' },
                    { id: 'opt-outdoor', label: 'Außen', value: 'Außenterrasse' },
                ]
            },
            {
                id: 'c-style',
                label: 'Stil',
                options: [
                    { id: 'opt-modern', label: 'Modern', value: 'moderner Einrichtungsstil' },
                    { id: 'opt-scandi', label: 'Skandinavisch', value: 'skandinavischer Einrichtungsstil' },
                    { id: 'opt-minimal', label: 'Minimal', value: 'minimalistischer Einrichtungsstil' },
                    { id: 'opt-timeless', label: 'Zeitlos', value: 'zeitloser Einrichtungsstil, klassische Eleganz' },
                ]
            }
        ]
    },
    {
        id: 'sys-season',
        title: 'Jahreszeit',
        prompt: 'Ändere den Look des Bildes, indem du Jahreszeit und Uhrzeit anpasst.',
        tags: ['Außen', 'Mood'],
        isPinned: true,
        isCustom: false,
        usageCount: 0,
        lang: 'de',
        controls: [
            {
                id: 'c-season',
                label: 'Saison',
                options: [
                    { id: 'op-summer', label: 'Hochsommer', value: 'Hochsommer, sattes Grün, strahlender Sonnenschein' },
                    { id: 'op-winter', label: 'Winterwonderland', value: 'Winterwunderland, alles mit Schnee bedeckt, kalt' },
                ]
            }
        ]
    },
    {
        id: 'sys-clear-room',
        title: 'Aufräumen',
        prompt: 'Entferne alle Unordnung, Müll und losen Gegenstände aus der Szene',
        tags: ['Innen', 'Retusche'],
        isPinned: true,
        isCustom: false,
        usageCount: 0,
        lang: 'de'
    },
    // English versions
    {
        id: 'sys-staging-pro-en',
        title: 'Staging',
        prompt: 'Furnish the room with a cohesive design style. Keep existing structural elements.',
        tags: ['Interior', 'Staging'],
        isPinned: true,
        isCustom: false,
        usageCount: 0,
        lang: 'en',
        controls: [
            {
                id: 'c-room',
                label: 'Room',
                options: [
                    { id: 'opt-living', label: 'Living/Dining', value: 'living and dining room area' },
                    { id: 'opt-kitchen', label: 'Kitchen', value: 'kitchen' },
                    { id: 'opt-bedroom', label: 'Bedroom', value: 'bedroom' },
                ]
            }
        ]
    },
    {
        id: 'sys-season-en',
        title: 'Seasons',
        prompt: 'Change the look of the image by adjusting season and time of day.',
        tags: ['Exterior', 'Mood'],
        isPinned: true,
        isCustom: false,
        usageCount: 0,
        lang: 'en'
    },
    {
        id: 'sys-clear-room-en',
        title: 'Cleanup',
        prompt: 'Remove all clutter, trash, and loose interactive items from the scene',
        tags: ['Interior', 'Retouch'],
        isPinned: true,
        isCustom: false,
        usageCount: 0,
        lang: 'en'
    }
];
