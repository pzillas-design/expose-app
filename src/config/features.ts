/**
 * Schalter fuer Funktionen, die es gibt, aber gerade nicht geben soll.
 *
 * Ein Wert an EINER Stelle, damit Anwendung und Schaufenster nicht
 * auseinanderlaufen koennen: Der Sprachassistent war in der App bereits
 * abgeschaltet, wurde auf der Startseite aber weiter beworben — mit einer
 * eigenen Szene im Kopfbereich und einer Karte im Band. Wer darauf klickte,
 * suchte in der App vergeblich.
 */

/**
 * Der Sprachassistent ist geparkt.
 *
 * Nicht geloescht, sondern abgeschaltet — Code, Verwaltungsoberflaeche und
 * Schluessel bleiben. Wer ihn zurueckholen will, setzt hier `false`; damit
 * kommen Menueeintrag, Hinweis, Anzeige, Tastenkuerzel UND die Werbung auf
 * der Startseite zusammen wieder.
 */
export const VOICE_ASSISTANT_PARKED = true;
