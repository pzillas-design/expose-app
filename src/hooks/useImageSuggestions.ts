import { useEffect, useRef, useState } from 'react';
import type { CanvasImage } from '@/types';
import { fetchSuggestions, getCachedSuggestions, type EditSuggestion } from '@/services/suggestionService';

/**
 * Die Vorschlaege zum gerade geoeffneten Bild.
 *
 * Liegt etwas im Zwischenspeicher, steht es im ersten Bild da — ohne
 * Ladezustand, ohne Nachrutschen. Das ist der Normalfall, denn ein Bild
 * oeffnet man selten nur einmal.
 *
 * Fehlt etwas, wird gefragt. Der Ladezustand wird dabei um 240 ms verzoegert
 * gemeldet: Eine Antwort aus der Datenbank ist schneller da, und ein
 * Platzhalter, der kuerzer zu sehen ist als ein Wimpernschlag, ist schlimmer
 * als keiner.
 *
 * Ein Fehler bleibt still. Dann gibt es eben keine Gruppe — eine Fehlermeldung
 * fuer etwas, das niemand angefordert hat, waere die schlechtere Antwort.
 */
export const useImageSuggestions = (
    image: CanvasImage | null,
    lang: string,
    enabled = true,
): { suggestions: EditSuggestion[]; loading: boolean } => {
    const [suggestions, setSuggestions] = useState<EditSuggestion[]>(() => getCachedSuggestions(image, lang) ?? []);
    const [loading, setLoading] = useState(false);
    const idRef = useRef<string | null>(image?.id ?? null);

    useEffect(() => {
        const id = image?.id ?? null;
        idRef.current = id;

        if (!image || !enabled) {
            setSuggestions([]);
            setLoading(false);
            return;
        }

        const cached = getCachedSuggestions(image, lang);
        if (cached) {
            setSuggestions(cached);
            setLoading(false);
            return;
        }

        setSuggestions([]);
        const controller = new AbortController();
        const spinner = window.setTimeout(() => {
            if (idRef.current === id) setLoading(true);
        }, 240);

        fetchSuggestions(image, lang, controller.signal)
            .then(items => {
                if (idRef.current !== id) return;
                setSuggestions(items);
            })
            .catch(() => {
                if (idRef.current !== id) return;
                setSuggestions([]);
            })
            .finally(() => {
                window.clearTimeout(spinner);
                if (idRef.current === id) setLoading(false);
            });

        return () => {
            window.clearTimeout(spinner);
            controller.abort();
        };
        // Absichtlich an der ID, nicht am Objekt: Das Bild bekommt bei jedem
        // Laden eine neue Signatur (frische URLs), bleibt aber dasselbe Bild.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [image?.id, lang, enabled]);

    return { suggestions, loading };
};
