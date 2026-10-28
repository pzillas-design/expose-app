/**
 * Bilddateien annehmen — auch die vom iPhone.
 *
 * HEIC ist auf iPhones das Standardformat, und genau diese Dateien fielen
 * bisher durch: Ein Filter auf `file.type.startsWith('image/')` wirft sie weg,
 * denn beim Ziehen aus dem Finder und in manchen Browsern ist `type` leer —
 * das System kennt den Typ nicht und sagt deshalb nichts. Der Nutzer sah
 * "Es lassen sich nur Bilddateien hochladen", obwohl es Fotos waren.
 *
 * Darum wird hier zusaetzlich die Endung befragt, und die Umwandlung in ein
 * Format, das der Browser zeichnen kann, liegt an einer Stelle statt in jedem
 * Ablagebereich einzeln.
 */

const HEIC_EXTENSION = /\.(heic|heif)$/i;
const HEIC_MIME = /^image\/(heic|heif)(-sequence)?$/i;

export const isHeicFile = (file: File): boolean =>
    HEIC_MIME.test(file.type) || HEIC_EXTENSION.test(file.name);

/** Nimmt alles, was wir anzeigen koennen — inklusive HEIC ohne MIME-Typ. */
export const isUploadableImageFile = (file: File): boolean =>
    file.type.startsWith('image/') || isHeicFile(file);

/**
 * Fuer `<input accept>`: `image/*` allein blendet HEIC-Dateien in manchen
 * Dateiauswahl-Dialogen aus, weil das Betriebssystem ihnen keinen Bildtyp
 * zuordnet. Die Endungen daneben holen sie zurueck.
 */
export const IMAGE_FILE_ACCEPT = 'image/*,.heic,.heif,image/heic,image/heif';

/**
 * Gibt einen Blob zurueck, den ein `<img>` zeichnen kann.
 *
 * HEIC wird nach JPEG gewandelt (heic2any wird erst hier geladen, ein gutes
 * halbes Megabyte, das die meisten Sitzungen nie brauchen). Scheitert die
 * Wandlung, kommt die Originaldatei zurueck: Dann zeigt sich der Fehler weiter
 * unten beim Laden, statt den Upload still zu verschlucken.
 */
export const toWebImageBlob = async (file: File): Promise<Blob> => {
    if (!isHeicFile(file)) return file;
    try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        return Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
        console.error('HEIC conversion failed:', err);
        return file;
    }
};

/** Liest eine Bilddatei als Data-URL, HEIC inklusive. */
export const readImageFileAsDataUrl = async (file: File): Promise<string> => {
    const blob = await toWebImageBlob(file);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') resolve(result);
            else reject(new Error('Unexpected FileReader result'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(blob);
    });
};
