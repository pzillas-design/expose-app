import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { calcBarProgress } from '@/utils/progress';

interface GeneratingRingProps {
    /** Startzeitpunkt der Generierung (ms). */
    generationStartTime?: number;
    /** Geschätzte Dauer in ms. Fehlt sie, gibt es keinen sinnvollen Fortschritt. */
    estimatedDuration?: number;
    /** Durchmesser in Pixeln. */
    size?: number;
    className?: string;
}

/**
 * Fortschrittsring für ein gerade entstehendes Bild.
 *
 * Ein endlos drehender Spinner sagt nur "es passiert etwas". Da wir die Dauer
 * je Modell und Auflösung schätzen können, zeigt ein sich füllender Kreis
 * zusätzlich, wie weit es ist.
 *
 * Ohne Schätzung bleibt es beim Spinner — ein Ring, der eine Genauigkeit
 * vortäuscht, die wir nicht haben, wäre schlechter als gar keiner.
 */
export const GeneratingRing: React.FC<GeneratingRingProps> = ({
    generationStartTime, estimatedDuration, size = 28, className = '',
}) => {
    const hasEstimate = !!estimatedDuration && estimatedDuration > 0;

    // Eigener Takt: Der Fortschritt ergibt sich aus der Uhr, nicht aus einer
    // Zustandsänderung — ohne Takt bliebe der Ring stehen. 250 ms sind flüssig
    // genug und kosten bei den wenigen gleichzeitigen Platzhaltern nichts.
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!hasEstimate) return;
        const id = window.setInterval(() => setTick(t => t + 1), 250);
        return () => window.clearInterval(id);
    }, [hasEstimate]);

    if (!hasEstimate) {
        return (
            <Loader2
                className={`animate-[spin_3s_linear_infinite] text-white/70 ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }

    const progress = calcBarProgress(generationStartTime, estimatedDuration!);
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
