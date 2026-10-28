/**
 * Die mittlere Farbe eines Bildes — fuer die Blaetter hinter einem Stapel.
 *
 * Dort lagen zuerst graue Balken (sagen nichts), dann das Bild selbst
 * (ruckelte beim Ueberfahren, weil zwei weitere Bildebenen mitskaliert werden
 * mussten, und sah an der Kante grob aus). Eine einzige Flaeche in der Farbe
 * des Bildes ist beides nicht: Sie kostet im Betrieb gar nichts und passt
 * trotzdem zum Foto.
 *
 * Gerechnet wird genau einmal je Bild und Sitzung, auf einer 1x1-Leinwand:
 * Der Browser skaliert dabei selbst auf einen Pixel herunter, was dem
 * Mittelwert ueber alle Pixel entspricht — kein Durchlaufen von Bilddaten.
 *
 * Scheitert es (fehlende CORS-Freigabe macht die Leinwand unlesbar), wird das
 * gemerkt und nie wieder versucht; der Aufrufer bleibt dann bei seiner grauen
 * Flaeche. Ein zweiter Versuch je Kachel waere teurer als der Gewinn.
 */

const cache = new Map<string, string>();
const failed = new Set<string>();
const pending = new Map<string, Promise<string | null>>();

export function getAverageColor(url?: string | null): Promise<string | null> {
    if (!url) return Promise.resolve(null);
    const hit = cache.get(url);
    if (hit) return Promise.resolve(hit);
    if (failed.has(url)) return Promise.resolve(null);
    const running = pending.get(url);
    if (running) return running;

    const job = new Promise<string | null>((resolve) => {
        const img = new Image();
        // Ohne diese Angabe faerbt der Browser die Leinwand als "fremd" ein und
        // verweigert das Auslesen — unabhaengig davon, was der Server schickt.
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = 1;
                c.height = 1;
                const ctx = c.getContext('2d', { willReadFrequently: false });
                if (!ctx) { failed.add(url); resolve(null); return; }
                ctx.drawImage(img, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                const color = `rgb(${r}, ${g}, ${b})`;
                cache.set(url, color);
                resolve(color);
            } catch {
                failed.add(url);
                resolve(null);
            } finally {
                pending.delete(url);
            }
        };
        img.onerror = () => { failed.add(url); pending.delete(url); resolve(null); };
        img.src = url;
    });

    pending.set(url, job);
    return job;
}
