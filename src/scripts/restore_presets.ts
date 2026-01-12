import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
);

const presets = [
    {
        id: 'sys-season-advanced',
        title: 'Jahreszeit',
        prompt: 'Inszeniere das Bild neu indem du die Jahreszeit anpasst.',
        tags: ['Außen', 'Mood'],
        is_pinned: true,
        is_custom: false,
        lang: 'de',
        controls: [
            {
                id: 'c-season',
                label: 'Jahreszeit',
                options: [
                    { id: 'opt-summer', label: 'Sommer', value: 'Sommer' },
                    { id: 'opt-autumn', label: 'Herbst', value: 'Herbst' },
                    { id: 'opt-winter', label: 'Winter', value: 'Winter' },
                    { id: 'opt-spring', label: 'Frühling', value: 'Frühling' }
                ]
            },
            {
                id: 'c-time',
                label: 'Uhrzeit',
                options: [
                    { id: '6d94dd4d-8cd9-4339-8917-a66c3c904466', label: 'Mittag', value: 'Mittag' },
                    { id: 'd8e2dfed-91c8-4a2b-80e4-17e87cb86fca', label: 'Nachmittag', value: 'Nachmittag' },
                    { id: '5bef36ea-7fda-4d47-bcc6-c065e7ac4bd8', label: 'Morgen', value: 'Morgen' },
                    { id: 'f18cffe9-729d-4fcc-938a-3077f1567c15', label: 'Golden Hour', value: 'Golden Hour' },
                    { id: '50150b6c-5b0e-483c-8ead-c1616eebfa8c', label: 'Blue Hour', value: 'Blue Hour' },
                    { id: '2123db03-62fe-4f61-bbce-c6a5d35cfd9c', label: 'Nacht', value: 'Nacht' }
                ]
            },
            {
                id: 'c-mood',
                label: 'Look',
                options: [
                    { id: 'ffdf1b0d-35ee-4514-839f-f9a31ed82b85', label: 'realistisch', value: 'realistisch' },
                    { id: '1b75ace0-bcb7-4e45-9ae5-31287d758bf4', label: 'atmosphärisch', value: 'atmosphärisch' },
                    { id: '88869a29-2ca2-4b99-8670-13ecd86d88cb', label: 'cinematisch', value: 'cinematisch' },
                    { id: 'b28ae9b1-90ff-466a-8fc4-3a2333b24973', label: 'High fidelity rendering', value: 'High fidelity rendering' }
                ]
            }
        ]
    },
    {
        id: 'c6515a02-7cb7-45eb-a5fd-6042eddf693a',
        title: 'Objektpflege',
        prompt: 'Du sollst folgende arbeiten am Foto durchführen.',
        tags: ['Retusche'],
        is_pinned: true,
        is_custom: false,
        lang: 'de',
        controls: [
            {
                id: '20bfe3c2-2a15-48dd-8c88-ba223e4176c8',
                label: 'Innenarbeiten',
                options: [
                    { id: '2383c9c3-6d20-465c-bd1e-a2794e245346', label: 'Fussboden reinigen', value: 'Fussboden reinigen' },
                    { id: 'ffdad60c-ece1-4022-8c04-506a12e98837', label: 'Wände neu streichen', value: 'Wände neu streichen' },
                    { id: '8ec6847a-61a1-4ca0-b3fe-c4022d7b4739', label: 'Fenster reinigen', value: 'Fenster reinigen' },
                    { id: '3de90e4d-6857-43c0-bd0b-e7b31108d29d', label: 'Oberflächen reinigen', value: 'Oberflächen reinigen' },
                    { id: 'cd2bb0ea-8f77-4d27-8e69-3995fb3e721a', label: 'Lampen entfernen', value: 'Lampen entfernen' }
                ]
            },
            {
                id: 'b372cdc5-e0e1-40ed-8900-8a1b83671523',
                label: 'Außen',
                options: [
                    { id: '22c0fb5d-9e98-4c03-ab6f-3cfa2c6d8a95', label: 'Gartenpflege', value: 'Gartenpflege' },
                    { id: 'cc3f7434-636a-467e-a194-c2a249ab34e7', label: 'Kurzer natürlicher rasen', value: 'Kurzer natürlicher rasen' }
                ]
            }
        ]
    },
    {
        id: 'sys-staging-pro',
        title: 'Homestaging',
        prompt: 'Verpasse dem Raum ein professionelles Homestaging. Behalte bestehende Strukturelemente bei.',
        tags: ['Staging'],
        is_pinned: true,
        is_custom: false,
        lang: 'de',
        controls: [
            {
                id: 'c-room',
                label: 'Raum',
                options: [
                    { id: '5b79646a-44a5-4418-8b8b-7fd20a1a1fb3', label: 'Wohnzimmer', value: 'Wohnzimmer' },
                    { id: '4c6d8a1a-99b5-469e-8127-154513b09fdf', label: 'Wohn-/Essbereich', value: 'Wohn-/Essbereich' },
                    { id: '0b94268a-325c-4033-9a3e-648254a43bbf', label: 'Küche', value: 'Küche' },
                    { id: 'ee7e7273-01b5-4ca1-b789-4733ce15310a', label: 'Schlafzimmer', value: 'Schlafzimmer' },
                    { id: 'bcd7d76e-7e0e-4cde-9887-b0b4172002dc', label: 'Kinderzimmer', value: 'Kinderzimmer' },
                    { id: '2eec3339-c557-475b-a9c5-7267fb68f105', label: 'Bad', value: 'Bad' },
                    { id: '041712f9-eadb-423c-a58d-9a067d65dfcf', label: 'Flur', value: 'Flur' },
                    { id: 'e50aed14-a20c-4b68-8e3d-b7d8c127fef6', label: 'Büro', value: 'Büro' },
                    { id: '05e6bd55-aba1-4198-ae4b-64498fdc209e', label: 'Außenbereich', value: 'Außenbereich' }
                ]
            },
            {
                id: 'c-style',
                label: 'Stil',
                options: [
                    { id: 'f6dfe8f5-0da6-43fa-b3b2-23f1739c629f', label: 'Modern', value: 'Modern' },
                    { id: 'eb6ef9ca-f511-4687-ad4a-0d42d0ae1a09', label: 'Skandinavisch', value: 'Skandinavisch' },
                    { id: '9ff39532-f91c-4ca4-b6bc-26f5383a26d6', label: 'Minimal', value: 'Minimal' },
                    { id: 'bb2333ed-4db8-47e9-9674-276514636d91', label: 'Zeitlos', value: 'Zeitlos' },
                    { id: '1d43589c-6f44-4ed1-b182-20dea8c90890', label: 'Klassisch', value: 'Klassisch' },
                    { id: '64a4a0bf-7bf8-439a-ac49-ecd91e196a40', label: 'Japandi', value: 'Japandi' },
                    { id: '95370a6b-7a43-4338-9193-3764f1ce949f', label: 'Landhaus', value: 'Landhaus' },
                    { id: '1ae40906-5fad-45a1-adc3-f73b0419cb0a', label: 'Loft', value: 'Loft' }
                ]
            },
            {
                id: '13997a12-9113-4bb4-8532-dadef9f6b4bd',
                label: 'Zielgruppe',
                options: [
                    { id: '68611310-4409-417e-844f-7510f739774c', label: 'Designaffin', value: 'Designaffin' },
                    { id: '223781ed-acde-45ce-9403-7400a92b16c0', label: 'Urban', value: 'Urban' },
                    { id: '41bb27b8-0231-41c5-82d5-11660833242a', label: 'Gehoben', value: 'Gehoben' },
                    { id: 'bd8c193a-44a2-40d6-b6e4-669b65e2c8a8', label: 'Kunstaffin', value: 'Kunstaffin' },
                    { id: '4a8eff52-5a8d-4eb0-bd7c-8ab5da78de35', label: 'Bodenständig', value: 'Bodenständig' },
                    { id: '1076870b-53de-41de-adc0-a772756f16db', label: 'Jung', value: 'Jung' },
                    { id: '7f0bc4cf-3ee9-47c3-9bb4-1a3f32c03a42', label: 'Extravagant', value: 'Extravagant' }
                ]
            },
            {
                id: 'ada239a1-b853-4c43-b064-35a6d13d86ff',
                label: 'Licht',
                options: [
                    { id: '75f45a98-39b0-48db-a6a3-22e804c409ba', label: 'Viel Tageslicht', value: 'Viel Tageslicht' },
                    { id: '97faaca5-43f3-4fea-b5b4-a64710c8565e', label: 'Weiches Morgenlicht', value: 'Weiches Morgenlicht' },
                    { id: 'e6dc490b-ee6f-4976-97f5-50124b3f3145', label: 'Golden Hour', value: 'Golden Hour' },
                    { id: '2b07ded5-3df8-46e2-903d-4becf9527c27', label: 'gute Innenbeleuchtung', value: 'gute Innenbeleuchtung' },
                    { id: 'd936cac4-ea60-447e-a48b-be357faf6aa9', label: 'Akzentbeleuchtung', value: 'Akzentbeleuchtung' }
                ]
            }
        ]
    },
    {
        id: 'sys-staging-pro-en',
        title: 'Staging',
        prompt: 'Furnish the room with a cohesive design style. Keep existing structural elements.',
        tags: ['Interior', 'Staging'],
        is_pinned: true,
        is_custom: false,
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
                    { id: 'opt-outdoor', label: 'Outdoor/Terrace', value: 'outdoor terrace' }
                ]
            },
            {
                id: 'c-style',
                label: 'Style',
                options: [
                    { id: 'opt-modern', label: 'Modern', value: 'modern interior design style' },
                    { id: 'opt-scandi', label: 'Scandinavian', value: 'scandinavian interior design style' },
                    { id: 'opt-minimal', label: 'Minimalist', value: 'minimalist interior design style' },
                    { id: 'opt-timeless', label: 'Timeless', value: 'timeless interior design style, classic elegance' }
                ]
            }
        ]
    }
];

async function restore() {
    console.log('Restoring presets...');
    for (const preset of presets) {
        const { error } = await supabase
            .from('global_presets')
            .upsert(preset);

        if (error) {
            console.error(`Error restoring preset ${preset.id}:`, error);
        } else {
            console.log(`Restored preset: ${preset.title} (${preset.id})`);
        }
    }
    console.log('Done.');
}

restore();
