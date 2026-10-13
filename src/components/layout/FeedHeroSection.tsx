/**
 * FeedHeroSection — der Platz, den die ausgefahrene Leiste ueber die
 * eingeklappte hinaus belegt.
 *
 * Die Hoehe MUSS genau dem entsprechen, worum die Leiste beim Scrollen
 * schrumpft, sonst laufen Inhalt und Leiste auseinander. Vorher stand die
 * Differenz als fertige Zahl hier (32 bzw. 92, aus 88/148 minus 56). Als die
 * eingeklappte Hoehe auf 64 ging, war der Abstandhalter 8 Pixel zu hoch — und
 * das sah man als Luecke ueber dem Inhalt.
 *
 * Jetzt rechnet CSS die Differenz aus den beiden Variablen. Sie kann nicht
 * mehr veralten.
 */

import React from 'react';

export const FeedHeroSection: React.FC = () => (
    <div className="shrink-0" style={{ height: 'calc(var(--nav-h-expanded) - var(--nav-h))' }} />
);
