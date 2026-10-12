import { CanvasImage, ImageRow } from '@/types';

/**
 * Stapel-Logik an einer Stelle.
 *
 * Vorher war "zu welchem Stapel gehört dieses Bild" an vier Stellen
 * unterschiedlich definiert — beim Laden anders als beim Gruppieren, im
 * Job-Pfad wieder anders. Weicht eine Definition ab, bricht ein Bild aus
 * seinem Stapel aus, und zwar nur auf manchen Wegen. Genau solche Fehler
 * sind aus der Ferne kaum zu finden.
 *
 * Ebenso gab es den Reihenbau zweimal: einmal für die Galerie, einmal für den
 * Direktaufruf einer Bild-URL. Beide Kopien liefen auseinander, sodass
 * dieselbe Bildmenge je nach Einstiegspunkt anders sortiert war.
 *
 * Deshalb: eine Definition, ein Reihenbau, eine Sortierung.
 */

/**
 * Der Stapel, zu dem ein Bild gehört.
 *
 * `folderId` ist die Wurzel des Stapels und ändert sich über die Lebenszeit
 * eines Bildes nicht. Fehlt sie (Altbestand vor der Migration), bildet das
 * Bild seinen eigenen Stapel.
 *
 * Bewusst NICHT auf `parentId` ausweichen: Die zeigt auf das unmittelbare
 * Quellbild, das selbst eine Variante sein kann. Eine Kette v1 → v2 → v3
 * zerfiele damit in drei Stapel. Der Ausgleich für Altbestand gehört in die
 * Abbildung der Datenbankzeile, nicht hierher — ist er dort erledigt, ist
 * diese Funktion trivial und kann nicht mehr abweichen.
 */
export const stackIdOf = (img: Pick<CanvasImage, 'id' | 'folderId'>): string =>
    img.folderId ?? img.id;

/**
 * Vergleicht zwei Bilder innerhalb einer Reihe.
 *
 * Ordnung: Gruppen nach Abstammung, das zuletzt hinzugefügte Original oben;
 * innerhalb einer Abstammung die neueste Variante zuerst, das Original
 * zuletzt. Für zwei Originale 1 und 2 mit je zwei Varianten ergibt das
 *
 *     2v2, 2v1, 2, 1v2, 1v1, 1
 *
 * WICHTIG: Jeder Zweig entscheidet bis zur ID durch. Ein Vergleicher, der bei
 * Gleichstand 0 liefert, ist über Gruppengrenzen hinweg nicht transitiv —
 * und zwei Bilder aus demselben Stapel-Upload tragen oft denselben
 * Zeitstempel, weil Date.now() je Datei in einer Schleife gleich ausfällt.
 * sort() liefert dann je nach Eingabereihenfolge ein anderes Ergebnis, und in
 * der Detailansicht äußert sich das als Schleife: Die Pfeile springen
 * zwischen zwei Bildern hin und her.
 */
const compareWithinRow = (
    a: CanvasImage,
    b: CanvasImage,
    rootIdOf: (img: CanvasImage) => string,
    byId: Map<string, CanvasImage>,
): number => {
    const ra = rootIdOf(a);
    const rb = rootIdOf(b);
    if (ra !== rb) {
        const ta = byId.get(ra)?.createdAt ?? 0;
        const tb = byId.get(rb)?.createdAt ?? 0;
        if (ta !== tb) return tb - ta;
        return ra < rb ? -1 : ra > rb ? 1 : 0;
    }
    const t = (b.createdAt || 0) - (a.createdAt || 0);
    if (t !== 0) return t;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/**
 * Baut die Reihen (Stapel) aus einer flachen Bildliste.
 *
 * Die Reihenfolge der Reihen richtet sich nach dem Original: Ein alter Stapel
 * bleibt an seiner Stelle, auch wenn gerade eine neue Variante entstanden ist.
 * Die Galerie bleibt dadurch ortstreu.
 *
 * Das Ergebnis ist die EINE verbindliche Reihenfolge — Galerie, Stapelansicht
 * und die Pfeile in der Detailansicht leiten sich alle davon ab. Damit laufen
 * sie nicht mehr auseinander.
 */
export const buildRows = (images: CanvasImage[]): ImageRow[] => {
    const byId = new Map(images.map(img => [img.id, img]));

    const groups = new Map<string, CanvasImage[]>();
    for (const img of images) {
        const key = stackIdOf(img);
        const bucket = groups.get(key);
        if (bucket) bucket.push(img);
        else groups.set(key, [img]);
    }

    const rows: ImageRow[] = [];

    groups.forEach((items, groupId) => {
        // Wurzel der Abstammung, begrenzt auf die eigene Reihe. Ist das
        // Quellbild inzwischen gelöscht oder abgelaufen, gilt das Bild als
        // eigenes Original, statt die Gruppierung zu sprengen.
        const inRow = new Set(items.map(i => i.id));
        const rootCache = new Map<string, string>();
        const rootIdOf = (img: CanvasImage): string => {
            const cached = rootCache.get(img.id);
            if (cached !== undefined) return cached;
            let cur = img;
            const seen = new Set<string>([cur.id]);
            while (cur.parentId && inRow.has(cur.parentId) && !seen.has(cur.parentId)) {
                seen.add(cur.parentId);
                const next = byId.get(cur.parentId);
                if (!next) break;
                cur = next;
            }
            rootCache.set(img.id, cur.id);
            return cur.id;
        };

        items.sort((a, b) => compareWithinRow(a, b, rootIdOf, byId));

        const root = byId.get(groupId);
        const titleSource = root ?? items[0];
        rows.push({
            id: `${groupId}_row`,
            title: titleSource?.baseName || titleSource?.title || 'untitled',
            // Nach dem Original datiert, damit ein Stapel durch neue Varianten
            // nicht nach oben wandert.
            createdAt: (root ?? items[items.length - 1])?.createdAt ?? items[0]?.createdAt,
            items,
        });
    });

    // Neueste Stapel oben. Bei gleichem Zeitstempel über die ID entscheiden,
    // damit die Reihenfolge nicht zwischen zwei Aufrufen kippt.
    rows.sort((a, b) => {
        const t = (b.createdAt || 0) - (a.createdAt || 0);
        if (t !== 0) return t;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    return rows;
};

/** Flache Reihenfolge über alle Stapel — die Grundlage der Pfeilnavigation. */
export const flattenRows = (rows: ImageRow[]): CanvasImage[] => {
    const seen = new Set<string>();
    const out: CanvasImage[] = [];
    for (const row of rows) {
        for (const img of row.items) {
            if (seen.has(img.id)) continue;
            seen.add(img.id);
            out.push(img);
        }
    }
    return out;
};
