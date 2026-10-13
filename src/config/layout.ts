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

/**
 * Hoehe der ausgefahrenen Leiste in der Galerie, nach Breite.
 *
 * Stand bisher nur in AppNavbar, waehrend FeedHeroSection den Unterschied zur
 * eingeklappten Hoehe als fertige Zahl fuehrte (32 bzw. 92). Als die
 * eingeklappte Hoehe von 56 auf 64 ging, war der Abstandhalter prompt 8 Pixel
 * zu hoch — Inhalt und Leiste liefen beim Scrollen nicht mehr gleich.
 *
 * Fuer CSS stehen beide zusaetzlich als --nav-h-expanded in index.css; der
 * Abstandhalter rechnet dort per calc(), damit die Differenz nirgends mehr als
 * eigene Zahl auftaucht.
 */
export const NAV_H_EXPANDED_MOBILE = 88;
export const NAV_H_EXPANDED_DESKTOP = 148;
