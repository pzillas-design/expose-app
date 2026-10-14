import type { CanvasImage } from '@/types';

/**
 * Bildbezogene Vorschlaege: Abruf und Zwischenspeicher im Browser.
 *
 * Drei Ebenen, von schnell nach teuer:
 *   1. das Bild selbst (kam mit dem Datensatz, kostet nichts)
 *   2. diese Map (der Abruf dieser Sitzung)
 *   3. /api/suggest-edits — das einzige, was das Modell befragt, und auch das
 *      nur, wenn es in der Datenbank noch nichts gibt
 *
 * Die Anfragen werden pro Bild gebuendelt: Oeffnet man dasselbe Bild zweimal
 * schnell hintereinander, laeuft eine Anfrage, nicht zwei.
 */

export interface EditSuggestion {
    label: string;
    line: string;
}

const cache = new Map<string, EditSuggestion[]>();
const inFlight = new Map<string, Promise<EditSuggestion[]>>();

const normLang = (lang: string): string => (lang === 'en' ? 'en' : 'de');

const cacheKey = (id: string, lang: string): string => `${id}:${normLang(lang)}`;

export const getCachedSuggestions = (image: CanvasImage | null, lang: string): EditSuggestion[] | null => {
    if (!image) return null;
    // Aus dem Datensatz nur, wenn es dieselbe Sprache ist. Die Zeilen landen im
    // Prompt des Nutzers — deutsche Chips in einer englischen Oberflaeche
    // waeren kein Schoenheitsfehler, sondern ein falscher Auftrag.
    if (image.editSuggestions && normLang(image.editSuggestionsLang || 'de') === normLang(lang)) {
        return image.editSuggestions;
    }
    return cache.get(cacheKey(image.id, lang)) ?? null;
};

/**
 * Das Vorschaubild der Galerie, nicht das Original.
 *
 * Es liegt beim Oeffnen eines Bildes schon im Browser-Cache — der Abruf hier
 * kostet also in der Regel keinen Netzverkehr. Und 400 Pixel genuegen fuer die
 * Frage "steht da ein Auto, ist der Rasen braun" bei weitem; das Original zu
 * schicken waere das Zwanzigfache an Daten fuer dieselbe Antwort.
 */
const toBase64 = async (url: string): Promise<{ data: string; mimeType: string } | null> => {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        return { data: btoa(binary), mimeType: blob.type || 'image/jpeg' };
    } catch (_) {
        return null;
    }
};

export const fetchSuggestions = async (
    image: CanvasImage,
    lang: string,
    signal?: AbortSignal,
): Promise<EditSuggestion[]> => {
    const cached = getCachedSuggestions(image, lang);
    if (cached) return cached;

    const pending = inFlight.get(cacheKey(image.id, lang));
    if (pending) return pending;

    const run = (async (): Promise<EditSuggestion[]> => {
        const { supabase } = await import('@/services/supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) return [];

        const source = image.thumbSrc || image.src;
        const picture = source ? await toBase64(source) : null;

        const res = await fetch('/api/suggest-edits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                imageId: image.id,
                imageBase64: picture?.data ?? '',
                mimeType: picture?.mimeType ?? 'image/jpeg',
                lang: normLang(lang),
            }),
            signal,
        });

        if (!res.ok) throw new Error(`suggest-edits ${res.status}`);
        const body = await res.json();
        const items: EditSuggestion[] = Array.isArray(body?.suggestions) ? body.suggestions : [];
        cache.set(cacheKey(image.id, lang), items);
        return items;
    })();

    inFlight.set(cacheKey(image.id, lang), run);
    try {
        return await run;
    } finally {
        inFlight.delete(cacheKey(image.id, lang));
    }
};
