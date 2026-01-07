
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
        id: 'sys-season-advanced',
        title: 'Saison & Uhrzeit',
        prompt: 'Inszeniere das Bild neu indem du die Jahreszeit anpasst.',
        tags: ['Außen', 'Mood'],
        isPinned: true,
        isCustom: false,
        usageCount: 0,
        lang: 'de',
        controls: [
            {
                id: 'c-season',
                label: 'SAISON',
                options: [
                    { id: 'opt-summer', label: 'Sommer', value: 'Sommer' },
                    { id: 'opt-autumn', label: 'Herbst', value: 'Herbst' },
                    { id: 'opt-winter', label: 'Winter', value: 'Winter' },
                    { id: 'opt-spring', label: 'Frühling', value: 'Frühling' }
                ]
            },
            {
                id: 'c-time',
                label: 'UHRZEIT',
                options: [
                    { id: 'opt-noon', label: 'Mittag', value: 'Mittag' },
                    { id: 'opt-afternoon', label: 'Nachmittag', value: 'Nachmittag' },
                    { id: 'opt-golden', label: 'Golden Hour', value: 'Golden Hour' },
                    { id: 'opt-blue', label: 'Blue Hour', value: 'Blue Hour' },
                    { id: 'opt-night', label: 'Nacht', value: 'Nacht' }
                ]
            },
            {
                id: 'c-mood',
                label: 'MOOD',
                options: [
                    { id: 'opt-realistic', label: 'realistisch', value: 'realistisch' },
                    { id: 'opt-atmos', label: 'atmosphärisch', value: 'atmosphärisch' }
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
                    { id: 'opt-kids', label: 'Kids Room', value: 'kids room' },
                    { id: 'opt-bath', label: 'Bathroom', value: 'bathroom' },
                    { id: 'opt-hall', label: 'Hallway', value: 'hallway' },
                    { id: 'opt-office', label: 'Home Office', value: 'home office' },
                    { id: 'opt-outdoor', label: 'Outdoor/Terrace', value: 'outdoor terrace' },
                ]
            },
            {
                id: 'c-style',
                label: 'Style',
                options: [
                    { id: 'opt-modern', label: 'Modern', value: 'modern interior design style' },
                    { id: 'opt-scandi', label: 'Scandinavian', value: 'scandinavian interior design style' },
                    { id: 'opt-minimal', label: 'Minimalist', value: 'minimalist interior design style' },
                    { id: 'opt-timeless', label: 'Timeless', value: 'timeless interior design style, classic elegance' },
                ]
            }
        ]
    },
    {
        id: 'sys-season-advanced-en',
        title: 'Season & Time',
        prompt: 'Re-imagine the image by adjusting the season.',
        tags: ['Exterior', 'Mood'],
        isPinned: true,
        isCustom: false,
        usageCount: 0,
        lang: 'en',
        controls: [
            {
                id: 'c-season',
                label: 'SEASON',
                options: [
                    { id: 'opt-summer', label: 'Summer', value: 'Summer' },
                    { id: 'opt-autumn', label: 'Autumn', value: 'Autumn' },
                    { id: 'opt-winter', label: 'Winter', value: 'Winter' },
                    { id: 'opt-spring', label: 'Spring', value: 'Spring' }
                ]
            },
            {
                id: 'c-time',
                label: 'TIME',
                options: [
                    { id: 'opt-noon', label: 'Noon', value: 'Noon' },
                    { id: 'opt-afternoon', label: 'Afternoon', value: 'Afternoon' },
                    { id: 'opt-golden', label: 'Golden Hour', value: 'Golden Hour' },
                    { id: 'opt-blue', label: 'Blue Hour', value: 'Blue Hour' },
                    { id: 'opt-night', label: 'Night', value: 'Night' }
                ]
            },
            {
                id: 'c-mood',
                label: 'MOOD',
                options: [
                    { id: 'opt-realistic', label: 'realistic', value: 'realistic' },
                    { id: 'opt-atmos', label: 'atmospheric', value: 'atmospheric' }
                ]
            }
        ]
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
