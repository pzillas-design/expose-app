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
 * Die Anweisung — kurz, und ohne ein einziges Beispiel.
 *
 * Eine fruehere Fassung nannte vier Musterchips ("Rasen satt und gesund",
 * "Alle Lampen an"). Das Modell hat sie zuverlaessig uebernommen, auch wenn
 * im Bild weder Rasen noch Lampen vorkamen: Ein Beispiel in einem Prompt ist
 * keine Erlaeuterung, es ist eine Vorlage zum Abschreiben. Deshalb steht hier
 * nur noch, WORAN man einen guten Vorschlag erkennt — nicht, wie einer lautet.
 *
 * Zwei Regeln sind nicht kosmetisch: Maengel bleiben im Bild (ein
 * wegretuschierter Feuchtefleck ist kein Bildfehler, sondern eine
 * Falschangabe), und nichts wird dazuerfunden. Dafuer haftet der Makler.
 */
function buildInstruction(lang: string): string {
    if (lang === 'en') {
        return [
            'You are the picture editor of an estate agency known for its listings.',
            '',
            'Name 4 to 6 edits for this photo: edits covering a whole area or the whole scene,',
            'plain photographic corrections, and one or two bolder ideas.',
            '',
            'The result must look real.',
            '',
            '"label": at most 3 words. "line": one sentence naming the target state.',
            'Nothing fitting? Return an empty list.',
        ].join('\n');
    }
    return [
        'Du bist der Bildredakteur einer Immobilienagentur, die fuer ihre Exposés bekannt ist.',
        '',
        'Nenne 4 bis 6 Bearbeitungen fuer dieses Foto: grossflaechige Eingriffe,',
        'handwerkliche Korrekturen, ein bis zwei mutigere Ideen.',
        '',
        'Das Ergebnis soll realistisch wirken.',
        '',
        '"label": hoechstens 3 Woerter. "line": ein Satz, der den Zielzustand nennt.',
        'Nichts Passendes? Leere Liste.',
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
            Fassung 4: ohne Beispiele im Prompt. Die vorigen Fassungen gaben
            Musterchips vor und bekamen sie zurueck — auch fuer Bilder, in denen
            es weder Rasen noch Lampen gab. Wer schon Vorschlaege hat, bekommt
            mit dieser Zahl neue.
        */
        const cached = row.edit_suggestions as { v?: number; lang?: string; items?: unknown } | null;
        if (cached && cached.v === 6 && cached.lang === lang && Array.isArray(cached.items)) {
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
            .update({ edit_suggestions: { v: 6, lang, items: suggestions } })
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
