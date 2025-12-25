
import { PromptTemplate, PresetTag } from '../types';

export const PRESET_TAGS_DATA: PresetTag[] = [
    { id: 'interior', de: 'Innen', en: 'Interior' },
    { id: 'exterior', de: 'Außen', en: 'Exterior' },
    { id: 'staging', de: 'Staging', en: 'Staging' },
    { id: 'retouch', de: 'Retusche', en: 'Retouch' },
    { id: 'mood', de: 'Mood', en: 'Mood' },
];

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
    // --- DEUTSCH ---
    { 
        id: 'sys-staging-pro',
        title: 'Staging',
        prompt: 'Richte den Raum in einem einheitlichen Designstil ein. Behalte bestehende Strukturelemente bei.',
        tags: ['Innen', 'Staging'],
        isPinned: true,
        isCustom: false,
        usageCount: 150,
        lastUsed: Date.now(),
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
                    { id: 'opt-bauhaus', label: 'Bauhaus', value: 'Bauhaus Einrichtungsstil' },
                    { id: 'opt-timeless', label: 'Zeitlos', value: 'zeitloser Einrichtungsstil, klassische Eleganz' },
                    { id: 'opt-boho', label: 'Boho', value: 'Boho Einrichtungsstil' },
                    { id: 'opt-design', label: 'Designer', value: 'hochwertiger Designer-Stil, kuratiertes Interieur' },
                    { id: 'opt-art', label: 'Künstler', value: 'kunstvoller Stil, Gemälde an den Wänden, Skulpturen' },
                    { id: 'opt-student', label: 'Studentisch', value: 'studentischer Wohnstil, entspannt, gemütlich, budgetfreundlich' },
                    { id: 'opt-country', label: 'Landhaus', value: 'moderner Landhausstil, rustikal' },
                    { id: 'opt-classic', label: 'Klassisch', value: 'klassisch traditioneller Einrichtungsstil' }
                ]
            },
            {
                 id: 'c-density',
                 label: 'Einrichtung',
                 options: [
                     { id: 'opt-min', label: 'Luftig', value: 'minimalistische Möblierung, geräumig' },
                     { id: 'opt-med', label: 'Ausgewogen', value: 'ausgewogene Möblierung, wohnlich' },
                     { id: 'opt-full', label: 'Gefüllt', value: 'maximalistisch, gemütlich, viel Dekoration' }
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
        usageCount: 60,
        lastUsed: Date.now(),
        lang: 'de',
        controls: [
            {
                id: 'c-season',
                label: 'Saison',
                options: [
                    { id: 'op-summer', label: 'Hochsommer', value: 'Hochsommer, sattes Grün, strahlender Sonnenschein' },
                    { id: 'op-winter', label: 'Winterwonderland', value: 'Winterwunderland, alles mit Schnee bedeckt, kalt' },
                    { id: 'op-spring', label: 'Frühling', value: 'Frühling, blühende Natur, frisches Hellgrün' },
                    { id: 'op-autumn', label: 'Herbst', value: 'Herbst, buntes Laub, gemütliche Stimmung' },
                ]
            },
            {
                id: 'c-time',
                label: 'Uhrzeit',
                options: [
                    { id: 'op-morn', label: 'Vormittag', value: 'Vormittagslicht, klare Sicht' },
                    { id: 'op-noon', label: 'Mittag', value: 'Mittagssonne, helles Licht, harte Schatten' },
                    { id: 'op-gold', label: 'Sonnenuntergang', value: 'Golden Hour, tiefstehende Sonne, warmes Licht' },
                    { id: 'op-blue', label: 'Abends', value: 'Blue Hour, Dämmerung, künstliche Lichter an' },
                ]
            }
        ]
    },
    {
        id: 'sys-clear-room',
        title: 'Zimmer leer räumen',
        prompt: 'Räume das Zimmer leer:',
        tags: ['Innen', 'Retusche'],
        isPinned: true,
        isCustom: false,
        usageCount: 50,
        lastUsed: Date.now(),
        lang: 'de',
        controls: [
            {
                id: 'c-level',
                label: 'Modus',
                options: [
                    { id: 'opt-clutter', label: 'Unordnung beseitigen', value: 'entferne nur Unordnung, Müll und lose persönliche Gegenstände, behalte alle Möbel' },
                    { id: 'opt-hybrid', label: 'Alles außer Möbel entfernen', value: 'entferne Dekoration, Teppiche und kleine Möbel, behalte Hauptmöbel' },
                    { id: 'opt-empty', label: 'Komplett leer', value: 'entferne alle Möbel, Gegenstände und Dekorationen, mache den Raum komplett leer' }
                ]
            }
        ]
    },
    { id: 'sys-1', title: 'Blauer Himmel', prompt: 'Mache den Himmel klar blau und sonnig', tags: ['Außen', 'Mood'], isPinned: true, isCustom: false, usageCount: 100, lastUsed: Date.now(), lang: 'de' },
    { id: 'sys-2', title: 'Aufräumen', prompt: 'Entferne alle Unordnung, Müll und losen Gegenstände aus der Szene', tags: ['Innen', 'Außen', 'Retusche'], isPinned: false, isCustom: false, usageCount: 80, lang: 'de' },
    { id: 'sys-3', title: 'Sommer-Look', prompt: 'Ändere die Jahreszeit auf Sommer, grünes Gras, helle Beleuchtung', tags: ['Außen', 'Mood', 'Staging'], isPinned: false, isCustom: false, usageCount: 50, lang: 'de' },
    { id: 'sys-4', title: 'Mehr Tageslicht', prompt: 'Erhelle den Raum mit natürlichem Tageslicht, das durch die Fenster strömt', tags: ['Innen', 'Mood'], isPinned: true, isCustom: false, usageCount: 60, lang: 'de' },
    { id: 'sys-5', title: 'Modern Staging', prompt: 'Richte den Raum mit modernen, minimalistischen Möbeln ein', tags: ['Innen', 'Staging'], isPinned: false, isCustom: false, usageCount: 40, lang: 'de' },
    { id: 'sys-6', title: 'Leerräumen', prompt: 'Leere den Raum komplett, entferne alle Möbel, Dekorationen und Gegenstände.', tags: ['Innen', 'Retusche'], isPinned: false, isCustom: false, usageCount: 30, lang: 'de' },
    { id: 'sys-7', title: 'Staging Wohnzimmer', prompt: 'Virtuelles Staging: Richte diesen leeren Raum als modernes, einladendes Wohnzimmer mit Sofa, Teppich, Couchtisch und Pflanzen ein.', tags: ['Innen', 'Staging'], isPinned: false, isCustom: false, usageCount: 25, lang: 'de' },
    { id: 'sys-8', title: 'Staging Schlafzimmer', prompt: 'Virtuelles Staging: Richte diesen leeren Raum als gemütliches Schlafzimmer mit Doppelbett, weicher Bettwäsche, Nachttischen und warmer Beleuchtung ein.', tags: ['Innen', 'Staging'], isPinned: false, isCustom: false, usageCount: 25, lang: 'de' },
    { id: 'sys-9', title: 'Persönliche Gegenstände', prompt: 'Entferne persönliche Gegenstände, Familienfotos, Kleidung und Unordnung, um den Raum neutral wirken zu lassen.', tags: ['Innen', 'Retusche'], isPinned: false, isCustom: false, usageCount: 20, lang: 'de' },
    { id: 'sys-10', title: 'Fotos blurren', prompt: 'Verpixle alle persönlichen Fotos und Gesichter, die im Bild sichtbar sind, zum Schutz der Privatsphäre.', tags: ['Innen', 'Retusche'], isPinned: false, isCustom: false, usageCount: 15, lang: 'de' },
    { id: 'sys-11', title: 'Golden Hour', prompt: 'Wende einen warmen Golden-Hour-Lichteffekt auf die Szene an.', tags: ['Außen', 'Mood'], isPinned: false, isCustom: false, usageCount: 35, lang: 'de' },

    // --- ENGLISH ---
    { 
        id: 'sys-staging-pro',
        title: 'Staging',
        prompt: 'Furnish the room with a cohesive design style. Keep existing structural elements.',
        tags: ['Interior', 'Staging'],
        isPinned: true,
        isCustom: false,
        usageCount: 150,
        lastUsed: Date.now(),
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
                    { id: 'opt-office', label: 'Office', value: 'home office' },
                    { id: 'opt-outdoor', label: 'Outdoor', value: 'outdoor terrace' },
                ]
            },
            {
                id: 'c-style',
                label: 'Style',
                options: [
                    { id: 'opt-modern', label: 'Modern', value: 'modern interior design style' },
                    { id: 'opt-scandi', label: 'Scandinavian', value: 'scandinavian interior design style' },
                    { id: 'opt-minimal', label: 'Minimal', value: 'minimalist interior style' },
                    { id: 'opt-bauhaus', label: 'Bauhaus', value: 'bauhaus interior design style' },
                    { id: 'opt-timeless', label: 'Timeless', value: 'timeless interior design style, classic elegance' },
                    { id: 'opt-boho', label: 'Boho', value: 'bohemian interior style' },
                    { id: 'opt-design', label: 'Designer', value: 'high-end designer furniture, curated interior style' },
                    { id: 'opt-art', label: 'Artist', value: 'art lover interior style, paintings on walls, sculptures' },
                    { id: 'opt-student', label: 'Student', value: 'student apartment style, relaxed, cozy, budget-friendly' },
                    { id: 'opt-country', label: 'Country', value: 'modern country house style, rustic farmhouse' },
                    { id: 'opt-classic', label: 'Classic', value: 'classic traditional interior style' }
                ]
            },
            {
                 id: 'c-density',
                 label: 'Furnishing',
                 options: [
                     { id: 'opt-min', label: 'Light', value: 'minimalist furniture placement, spacious, uncluttered' },
                     { id: 'opt-med', label: 'Balanced', value: 'balanced furniture placement, lived-in feeling' },
                     { id: 'opt-full', label: 'Full', value: 'maximalist, cozy, lots of furniture and decoration' }
                 ]
            }
        ]
    },
    {
        id: 'sys-season',
        title: 'Seasons',
        prompt: 'Change the look of the image by adjusting season and time of day.',
        tags: ['Exterior', 'Mood'],
        isPinned: true,
        isCustom: false,
        usageCount: 60,
        lastUsed: Date.now(),
        lang: 'en',
        controls: [
            {
                id: 'c-season',
                label: 'Season',
                options: [
                    { id: 'op-summer', label: 'Midsummer', value: 'midsummer, lush green, bright sunshine' },
                    { id: 'op-winter', label: 'Winter Wonderland', value: 'winter wonderland, covered in snow, cold atmosphere' },
                    { id: 'op-spring', label: 'Spring', value: 'spring, blooming flowers, fresh green' },
                    { id: 'op-autumn', label: 'Autumn', value: 'autumn, orange leaves, cozy atmosphere' },
                ]
            },
            {
                id: 'c-time',
                label: 'Time',
                options: [
                    { id: 'op-morn', label: 'Morning', value: 'morning light, clear view' },
                    { id: 'op-noon', label: 'Noon', value: 'noon, high sun, bright light, hard shadows' },
                    { id: 'op-gold', label: 'Golden Hour', value: 'golden hour, low sun, warm light' },
                    { id: 'op-blue', label: 'Blue Hour', value: 'blue hour, twilight, artificial lights on' },
                ]
            }
        ]
    },
    {
        id: 'sys-clear-room',
        title: 'Clear Room',
        prompt: 'Clear the room based on the desired level.',
        tags: ['Interior', 'Retouch'],
        isPinned: true,
        isCustom: false,
        usageCount: 50,
        lastUsed: Date.now(),
        lang: 'en',
        controls: [
            {
                id: 'c-level',
                label: 'Mode',
                options: [
                    { id: 'opt-clutter', label: 'Clutter only', value: 'remove only clutter, trash and loose personal items, keep all furniture' },
                    { id: 'opt-hybrid', label: 'Keep Furniture', value: 'remove decorations, rugs and small furniture, keep main furniture pieces' },
                    { id: 'opt-empty', label: 'Complete', value: 'remove all furniture, items and decorations, make the room completely empty' }
                ]
            }
        ]
    },
    { id: 'sys-1', title: 'Blue Sky', prompt: 'Make the sky clear blue and sunny', tags: ['Exterior', 'Mood'], isPinned: true, isCustom: false, usageCount: 100, lastUsed: Date.now(), lang: 'en' },
    { id: 'sys-2', title: 'Declutter', prompt: 'Remove all clutter, trash, and loose items from the scene', tags: ['Interior', 'Exterior', 'Retouch'], isPinned: false, isCustom: false, usageCount: 80, lang: 'en' },
    { id: 'sys-3', title: 'Summer Look', prompt: 'Change the season to summer, green grass, bright lighting', tags: ['Exterior', 'Mood', 'Staging'], isPinned: false, isCustom: false, usageCount: 50, lang: 'en' },
    { id: 'sys-4', title: 'More Daylight', prompt: 'Brighten the room with natural daylight streaming through windows', tags: ['Interior', 'Mood'], isPinned: true, isCustom: false, usageCount: 60, lang: 'en' },
    { id: 'sys-5', title: 'Modern Staging', prompt: 'Stage the room with modern, minimalist furniture', tags: ['Interior', 'Staging'], isPinned: false, isCustom: false, usageCount: 40, lang: 'en' },
    { id: 'sys-6', title: 'Empty Room', prompt: 'Empty the room completely, remove all furniture, decorations and items. Make it an empty room.', tags: ['Interior', 'Retouch'], isPinned: false, isCustom: false, usageCount: 30, lang: 'en' },
    { id: 'sys-7', title: 'Staging Living Room', prompt: 'Virtual staging: Furnish this empty space as a modern, inviting living room with a sofa, rug, coffee table and plants.', tags: ['Interior', 'Staging'], isPinned: false, isCustom: false, usageCount: 25, lang: 'en' },
    { id: 'sys-8', title: 'Staging Bedroom', prompt: 'Virtual staging: Furnish this empty space as a cozy bedroom with a double bed, soft bedding, nightstands and warm lighting.', tags: ['Interior', 'Staging'], isPinned: false, isCustom: false, usageCount: 25, lang: 'en' },
    { id: 'sys-9', title: 'Remove Personal Items', prompt: 'Remove personal items, family photos, clothes, and clutter to make the room look neutral.', tags: ['Interior', 'Retouch'], isPinned: false, isCustom: false, usageCount: 20, lang: 'en' },
    { id: 'sys-10', title: 'Blur Photos', prompt: 'Blur all personal photos and faces visible in the image for privacy.', tags: ['Interior', 'Retouch'], isPinned: false, isCustom: false, usageCount: 15, lang: 'en' },
    { id: 'sys-11', title: 'Golden Hour', prompt: 'Apply a warm, golden hour lighting effect to the scene, creating a welcoming atmosphere.', tags: ['Exterior', 'Mood'], isPinned: false, isCustom: false, usageCount: 35, lang: 'en' },
];
