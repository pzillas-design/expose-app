import { CanvasImage } from '@/types';

/**
 * Name und Fassung eines Bildes, getrennt.
 *
 * Die Versionsnummer steckte doppelt im Datenbestand: einmal als Spalte
 * `version`, einmal als Endung `_vN` im Titel. Zwei Ablagen fuer dieselbe
 * Angabe — und die Anzeige las ausgerechnet die abgeschriebene.
 *
 * Hier wird die Spalte gelesen. Der Titel liefert nur noch den Namen, und bei
 * Altbestand, dessen Titel die Endung noch traegt, wird sie abgeschnitten
 * statt angezeigt. Damit sieht ein altes Bild aus wie ein neues, ohne dass
 * irgendeine Zeile in der Datenbank angefasst werden muesste.
 */
export interface ImageName {
    /** Der Name ohne Fassungsangabe. */
    base: string;
    /** Die Fassung, oder null beim Original. */
    version: number | null;
}

/** Schneidet eine Endung wie `_v3` ab — Altbestand. */
const stripLegacySuffix = (s: string): string => s.replace(/_v\d+$/, '');

export const imageNameOf = (
    img: Pick<CanvasImage, 'title' | 'baseName' | 'version'> | null | undefined,
): ImageName => {
    if (!img) return { base: '', version: null };
    const raw = img.baseName || img.title || '';
    const base = stripLegacySuffix(raw);
    // Die Spalte zaehlt ab 1 fuer das Original; erst ab 2 gibt es etwas zu
    // zeigen. Fehlt sie, versucht der Titel auszuhelfen — mehr als diese eine
    // Stelle soll den alten Aufbau aber nicht kennen.
    const fromColumn = typeof img.version === 'number' && img.version > 1 ? img.version : null;
    const fromTitle = (() => {
        const m = /_v(\d+)$/.exec(img.title || '');
        const n = m ? Number(m[1]) : NaN;
        return Number.isFinite(n) && n > 1 ? n : null;
    })();
    return { base, version: fromColumn ?? fromTitle };
};

/** Einzeilige Schreibweise, z. B. `5'' v3`. */
export const formatImageName = (img: Parameters<typeof imageNameOf>[0]): string => {
    const { base, version } = imageNameOf(img);
    return version ? `${base} v${version}` : base;
};

/**
 * Liest eine Fassungsangabe aus einem Dateinamen.
 *
 * `haus_v2.jpg` wird zu { base: "haus", version: 2 }. Damit faengt ein
 * hochgeladenes v2 nicht wieder bei 1 an, und die naechste Bearbeitung heisst
 * v3 statt v2 — vorher trugen zwei verschiedene Bilder dieselbe Nummer.
 *
 * Jede Datei bleibt ihr eigener Stapel, auch wenn zwei Dateien denselben
 * Namensstamm haben. `haus_v2.jpg` und `haus_v5.jpg` sind zwei Bilder, die
 * jemand getrennt bearbeiten will — sie zusammenzulegen hiesse zu raten, dass
 * das eine aus dem anderen hervorgegangen ist, und dazwischen fehlten dann
 * die Fassungen 3 und 4.
 *
 * Erkannt wird nur eine Endung am Ende des Namens, mit oder ohne Trennzeichen
 * davor: `_v2`, `-v2`, ` v2`, `v2`. Ein `v` mitten im Namen bleibt
 * unangetastet, und eine 0 oder etwas Unsinniges faellt auf die 1 zurueck.
 */
export const parseUploadName = (fileName: string): { base: string; version: number } => {
    const withoutExt = fileName.replace(/\.[^/.]+$/, '');
    const m = /^(.*?)[ _-]?v(\d{1,3})$/i.exec(withoutExt);
    if (!m) return { base: withoutExt, version: 1 };
    const base = m[1].trim();
    const version = Number(m[2]);
    // Ohne Namensrest waere der Stamm leer — dann war das "v12" der Name.
    if (!base) return { base: withoutExt, version: 1 };
    return { base, version: version >= 1 ? version : 1 };
};
