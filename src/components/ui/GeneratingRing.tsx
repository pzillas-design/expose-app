import React, { useEffect, useState } from 'react';
import { calcBarProgress } from '@/utils/progress';

interface GeneratingRingProps {
    /** Startzeitpunkt der Generierung (ms). */
    generationStartTime?: number;
    /** Geschätzte Dauer in ms. Fehlt sie, wird mit DEFAULT_ETA_MS gerechnet. */
    estimatedDuration?: number;
    /** Durchmesser in Pixeln. */
    size?: number;
    className?: string;
}

/**
 * Fortschrittsring für ein gerade entstehendes Bild.
 *
 * Ein endlos drehender Spinner sagt nur "es passiert etwas". Der Ring sagt
 * zusätzlich, wie weit es ist — und das tut er jetzt IMMER.
 *
 * Vorher fiel er ohne Schätzung auf den Spinner zurück, mit der Begründung,
 * ein Ring täusche sonst eine Genauigkeit vor, die wir nicht haben. In der
 * Praxis kam der Fall nicht selten vor: Nach einem Neuladen werden laufende
 * Aufträge aus der Datenbank rekonstruiert, und dort stand keine Schätzung.
 * Dann drehte es sich endlos, während dieselbe Generierung oben rechts in der
 * Meldung brav volllief — die rechnet seit jeher mit 30 Sekunden, wenn sie
 * nichts Besseres weiß. Eine angenommene Dauer ist hier das kleinere Übel:
 * Der Fortschritt ist ohnehin bei 85 % gedeckelt, und das Ende setzt das
 * fertige Bild.
 */
/** Angenommene Dauer, wenn keine Schätzung vorliegt. Wie in GenerationNotice. */
const DEFAULT_ETA_MS = 30000;
export const GeneratingRing: React.FC<GeneratingRingProps> = ({
    generationStartTime, estimatedDuration, size = 28, className = '',
}) => {
    const eta = estimatedDuration && estimatedDuration > 0 ? estimatedDuration : DEFAULT_ETA_MS;

    // Eigener Takt: Der Fortschritt ergibt sich aus der Uhr, nicht aus einer
    // Zustandsänderung — ohne Takt bliebe der Ring stehen. 250 ms sind flüssig
    // genug und kosten bei den wenigen gleichzeitigen Platzhaltern nichts.
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setTick(t => t + 1), 250);
        return () => window.clearInterval(id);
    }, []);

    const progress = calcBarProgress(generationStartTime, eta);
    const r = 9;
    const circumference = 2 * Math.PI * r;

    return (
        <svg
            viewBox="0 0 24 24"
            className={`-rotate-90 ${className}`}
            style={{ width: size, height: size }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" className="stroke-white/25" />
            <circle
                cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round"
                className="stroke-white/90 transition-[stroke-dashoffset] duration-300 ease-linear"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
            />
        </svg>
    );
};
