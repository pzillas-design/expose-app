/**
 * Masse, die an mehreren Stellen gleich sein muessen.
 *
 * Die Hoehe der Navigationsleiste stand bisher an sechs Stellen als eigene
 * Zahl: zweimal als `h-14`, einmal als `collapsedH = 56`, einmal als `pt-14`
 * im Seitenrahmen, einmal als `top-14` samt `calc(100dvh-56px)` in der
 * Verwaltung, und zweimal eingerechnet in einen Scroll-Abstand von 72. Wer die
 * Leiste hoeher machen wollte, musste alle sechs finden — und die beiden
 * 72er sahen nicht einmal nach Navigationsleiste aus.
 *
 * Jetzt eine Zahl. Fuer CSS steht sie zusaetzlich als Variable `--nav-h` in
 * index.css; beide muessen uebereinstimmen, was der Kommentar dort festhaelt.
 */
export const NAV_H = 64;

/**
 * Abstand, mit dem eine Kachel unter die Leiste gescrollt wird: die Hoehe der
 * Leiste plus etwas Luft, damit die Kachel nicht an ihr klebt.
 */
export const NAV_SCROLL_OFFSET = NAV_H + 16;
