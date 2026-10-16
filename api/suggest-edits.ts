import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

/**
 * "Fuer dieses Bild" — bildbezogene Bearbeitungsvorschlaege.
 *
 * Ein Vision-Modell sieht das Foto an und nennt drei bis fuenf konkrete
 * Bearbeitungen. Jeder Vorschlag ist ein Chip, der eine Zeile in den Prompt
 * schreibt — dieselbe Mechanik wie die Vorlagen-Chips, damit es nur EINE
 * Quelle fuer das gibt, was zum Bildmodell geht.
 *
 * Warum diese Route und nicht eine Supabase-Function: Der Google-Schluessel
 * liegt hier schon (siehe gemini-live-token.ts). Ein zweiter Ort fuer
 * denselben Schluessel waere ein zweiter Ort, an dem er ablaufen kann.
 *
 * Das Ergebnis wird am Bild gespeichert. Das Modell wird pro Bild genau
 * einmal gefragt, jedes weitere Oeffnen liest aus der Datenbank.
 */

const ALLOWED_ORIGINS = [
    'https://expose.ae',
    'https://www.expose.ae',
    'https://staging.expose.ae',
    'http://localhost:5173',
    'http://localhost:3000',
];

function getCorsOrigin(req: VercelRequest): string {
    const origin = req.headers.origin || '';
    return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function setCors(res: VercelResponse, origin: string) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
}

/**
 * Flash-Lite, nicht Flash: Die Aufgabe ist "was ist auf dem Bild und was
 * davon stoert" — dafuer braucht es kein grosses Modell. Ueberschreibbar,
 * weil Google die Namen seiner Vorschau-Modelle regelmaessig aendert.
 */
const DEFAULT_SUGGEST_MODEL = 'gemini-3.1-flash-lite';

/** Obergrenze fuer das gesendete Bild. Die Vorschau der Galerie liegt bei ~60 KB. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const SUGGESTION_SCHEMA = {
    type: 'object',
    properties: {
        suggestions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    label: { type: 'string' },
                    line: { type: 'string' },
                },
                required: ['label', 'line'],
            },
        },
    },
    required: ['suggestions'],
} as const;

/**
 * Die Regeln sind der eigentliche Wert dieser Route.
 *
 * Zwei davon sind nicht kosmetisch: Maengel bleiben im Bild (ein wegretuschierter
 * Feuchtefleck ist kein Bildfehler, sondern eine Falschangabe), und nichts wird
 * dazugebaut, was es nicht gibt. Ein Makler, der so ein Bild verschickt, haftet
 * dafuer — nicht wir.
 */
function buildInstruction(lang: string): string {
    if (lang === 'en') {
        return [
            'You are looking at a photo an estate agent wants to retouch for a property listing.',
            'Name 4 to 6 suggestions that together form a SPECTRUM for THIS photo:',
            '- 2 to 3 comprehensive scene edits — the backbone. Where aspects belong together,',
            '  combine them into one: lawn, planting and facade; sky, light and shadows.',
            '- 1 to 2 practical fixes a photographer would do: converging verticals, white balance,',
            '  window reflections, distracting objects at the edge of the frame.',
            '- 1 to 2 creative ideas that give the photo a different character: evening mood,',
            '  staging in one clear style, a different season.',
            '',
            'Order them by what helps this photo most, not by category.',
            '',
            'Good: "Lush healthy lawn" — lawn evenly green and dense, beds tidy, paths clean.',
            '"Sky with light clouds" — natural sky with soft clouds, light and shadows to match.',
            '"All lamps on" — every lamp lit, warm even light, no dark corners.',
            '"Completely empty" — all furniture and belongings gone, bare floor and walls.',
            'Too small: "Tidy the table", "Straighten the cushions", "Switch on one lamp".',
            '',
            'Standard: a listing by a renowned agency. The result must look like the work of an',
            'architectural photographer, not like bulk retouching: natural colours, soft transitions,',
            'one believable direction of light, restraint. Explicitly avoid the usual giveaways —',
            'electric blue sky, neon green lawn, HDR halos, over-sharpening, plastic surfaces,',
            'glowing edges, oversaturated wood. Tasteful beats impressive.',
            '',
            'Rules:',
            '- Only name what is actually visible in the photo. No generic advice.',
            '- The result must look real, not like a postcard. No oversaturation, no drama.',
            '- Never remove defects, damage, cracks, damp patches or wear. They belong in the photo.',
            '- Do not add anything that is not there. Virtual staging only for visibly empty rooms.',
            '- No structural changes.',
            '- "label": the chip caption, at most 3 words, imperative.',
            '- "line": the full instruction for an image model, 10 to 22 words, naming every aspect it covers.',
            '- If the photo needs nothing, return an empty list. An empty list is a valid answer.',
        ].join('\n');
    }
    return [
        'Du siehst ein Foto, das ein Makler fuer ein Exposé bearbeiten lassen will.',
        'Nenne 4 bis 6 Vorschlaege, die zusammen ein SPEKTRUM fuer GENAU DIESES Foto ergeben:',
        '- 2 bis 3 umfassende Eingriffe in die ganze Szene — das Rueckgrat. Was zusammengehoert,',
        '  gehoert in EINEN Vorschlag: Rasen, Bepflanzung und Fassade; Himmel, Licht und Schatten.',
        '- 1 bis 2 praktische Retuschen, die ein Fotograf machen wuerde: stuerzende Linien,',
        '  Weissabgleich, Spiegelungen in den Scheiben, Stoerendes am Bildrand.',
        '- 1 bis 2 kreative Ideen, die dem Bild einen anderen Charakter geben: Abendstimmung,',
        '  Einrichtung in einem klaren Stil, eine andere Jahreszeit.',
        '',
        'Sortiere nach dem, was diesem Bild am meisten bringt, nicht nach Kategorie.',
        '',
        'Gut: "Rasen satt und gesund" — Rasen durchgehend gruen und dicht, Beete gepflegt, Wege sauber.',
        '"Himmel mit Wolken" — natuerlicher Himmel mit leichten Wolken, Licht und Schatten passend dazu.',
        '"Alle Lampen an" — jede Lampe leuchtet, warmes gleichmaessiges Licht, keine dunklen Ecken.',
        '"Komplett leerraeumen" — saemtliche Moebel und Gegenstaende weg, nackter Boden und Waende.',
        'Zu kleinteilig: "Tisch aufraeumen", "Kissen gerade ruecken", "eine Lampe einschalten".',
        '',
        'Massstab ist das Exposé einer renommierten Immobilienagentur. Das Ergebnis muss aussehen',
        'wie die Arbeit eines Architekturfotografen, nicht wie eine Massenretusche: natuerliche Farben,',
        'weiche Uebergaenge, EINE glaubwuerdige Lichtrichtung, Zurueckhaltung. Vermeide ausdruecklich',
        'die bekannten Merkmale schlechter Bearbeitung — knallblauer Himmel, neongruener Rasen,',
        'HDR-Saeume, Ueberschaerfung, Plastikoberflaechen, leuchtende Kanten, uebersaettigtes Holz.',
        'Geschmackvoll schlaegt beeindruckend.',
        '',
        'Regeln:',
        '- Nur was wirklich im Bild zu sehen ist. Keine allgemeinen Ratschlaege.',
        '- Das Ergebnis muss echt aussehen, nicht wie eine Postkarte. Keine Uebersaettigung, kein Drama.',
        '- Niemals Maengel entfernen: keine Risse, Schaeden, Feuchteflecken, Abnutzung. Die gehoeren ins Bild.',
        '- Nichts hinzufuegen, was es nicht gibt. Moeblierung nur bei sichtbar leeren Raeumen.',
        '- Keine baulichen Veraenderungen.',
        '- "label": die Aufschrift des Chips, hoechstens 3 Woerter, Imperativ.',
        '- "line": der vollstaendige Auftrag an ein Bildmodell, 10 bis 22 Woerter, der jeden erfassten Aspekt nennt.',
        '- Gibt das Bild nichts her, gib eine leere Liste zurueck. Eine leere Liste ist eine gueltige Antwort.',
    ].join('\n');
}

interface Suggestion { label: string; line: string }

/** Was vom Modell kommt, ist Text — nicht vertrauenswuerdig und nicht unbegrenzt. */
function sanitize(raw: unknown): Suggestion[] {
    if (!Array.isArray(raw)) return [];
    const out: Suggestion[] = [];
    for (const item of raw) {
        const label = typeof item?.label === 'string' ? item.label.trim().slice(0, 40) : '';
        const line = typeof item?.line === 'string' ? item.line.trim().replace(/\s+/g, ' ').slice(0, 220) : '';
        if (!label || !line) continue;
        out.push({ label, line });
        if (out.length >= 6) break;
    }
    return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const corsOrigin = getCorsOrigin(req);

    if (req.method === 'OPTIONS') {
        setCors(res, corsOrigin);
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        setCors(res, corsOrigin);
        return res.status(405).json({ error: 'Method not allowed' });
    }
    setCors(res, corsOrigin);

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization token' });
        }
        const accessToken = authHeader.slice('Bearer '.length);

        const imageId = typeof req.body?.imageId === 'string' ? req.body.imageId : '';
        const imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '';
        const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'image/jpeg';
        const lang = req.body?.lang === 'en' ? 'en' : 'de';

        if (!imageId) return res.status(400).json({ error: 'imageId required' });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        if (!supabaseUrl || !anonKey) {
            console.error('[suggest-edits] Supabase env vars missing');
            return res.status(500).json({ error: 'Not configured' });
        }

        /**
         * Der Zugriff laeuft mit dem Token des Nutzers, nicht mit dem
         * Service-Schluessel. Damit entscheidet RLS, wessen Bild gelesen und
         * beschrieben werden darf — und nicht eine Pruefung, die ich hier
         * selbst schreibe und irgendwann vergesse.
         */
        const supabase = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: row, error: rowError } = await supabase
            .from('images')
            .select('id, edit_suggestions')
            .eq('id', imageId)
            .maybeSingle();

        if (rowError) {
            console.error('[suggest-edits] row lookup failed', rowError);
            return res.status(500).json({ error: 'Lookup failed' });
        }
        // Kein Treffer heisst: fremdes oder geloeschtes Bild. RLS hat entschieden.
        if (!row) return res.status(404).json({ error: 'Image not found' });

        /*
            Fassung 2: Die erste Fassung fragte nach "konkreten Bearbeitungen" und
            bekam entsprechend Kleinkram — Tisch aufraeumen, Kissen richten. Wer
            schon Vorschlaege hat, bekommt mit dieser Zahl neue.
        */
        const cached = row.edit_suggestions as { v?: number; lang?: string; items?: unknown } | null;
        if (cached && cached.v === 2 && cached.lang === lang && Array.isArray(cached.items)) {
            return res.status(200).json({ suggestions: cached.items, cached: true });
        }

        if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
        if (Buffer.byteLength(imageBase64, 'base64') > MAX_IMAGE_BYTES) {
            return res.status(413).json({ error: 'Image too large' });
        }

        const apiKey = process.env.VOICE_ASSIST_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[suggest-edits] Missing Google API key');
            return res.status(500).json({ error: 'Not configured' });
        }

        const ai = new GoogleGenAI({ apiKey });
        const model = process.env.SUGGEST_MODEL || DEFAULT_SUGGEST_MODEL;

        const response = await ai.models.generateContent({
            model,
            contents: [{
                role: 'user',
                parts: [
                    { text: buildInstruction(lang) },
                    { inlineData: { mimeType, data: imageBase64 } },
                ],
            }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: SUGGESTION_SCHEMA as any,
                // Niedrig, aber nicht null: Bei null liefert das Modell fuer
                // aehnliche Fotos immer dieselben vier Saetze, auch wenn das
                // Bild etwas anderes hergibt.
                temperature: 0.4,
                maxOutputTokens: 800,
            },
        });

        let suggestions: Suggestion[] = [];
        try {
            const parsed = JSON.parse(response.text || '{}');
            suggestions = sanitize(parsed?.suggestions);
        } catch (parseError) {
            console.error('[suggest-edits] unparseable model answer', parseError);
        }

        /**
         * Auch eine leere Liste wird gespeichert. Sonst fragen wir fuer ein
         * Bild, das nichts hergibt, bei jedem Oeffnen erneut — und das ist
         * genau der Fall, der am haeufigsten vorkommt.
         */
        const { error: writeError } = await supabase
            .from('images')
            .update({ edit_suggestions: { v: 2, lang, items: suggestions } })
            .eq('id', imageId);

        if (writeError) {
            // Nicht toedlich: Der Nutzer bekommt seine Chips, nur ohne Cache.
            console.error('[suggest-edits] cache write failed', writeError);
        }

        return res.status(200).json({ suggestions, cached: false });
    } catch (error) {
        console.error('[suggest-edits] failed', error);
        return res.status(500).json({
            error: 'Unable to suggest edits',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
