/**
 * Fortschritt aus verstrichener Zeit und Schaetzung, gedeckelt bei 85 %.
 *
 * Der Deckel ist Absicht: Die Schaetzung stammt aus Durchschnittswerten, ein
 * einzelner Lauf kann deutlich laenger dauern. Ein Ring, der bei 100 % steht,
 * waehrend nichts passiert, wirkt wie ein Fehler. Bei 85 % wirkt er wie
 * "gleich fertig" — und das Ende setzt ohnehin das echte Ergebnis.
 *
 * Stand frueher in der Komponente des Ladekreises; die ist weg, die Rechnung
 * wird weiter gebraucht.
 */
export function calcBarProgress(startTime: number | undefined, duration: number): number {
    const start = startTime || Date.now();
    const elapsed = Date.now() - start;
    const p = (elapsed / duration) * 100;
    return Math.min(p, 85);
}
