import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import type { CanvasImage } from '@/types';
import { calcBarProgress } from '@/utils/progress';

/**
 * Die Meldung oben rechts.
 *
 * Sie ersetzt den Ladekreis in der Leiste. Der war immer da, immer gleich
 * gross und sagte nur "es laeuft etwas" — man musste ihn anklicken, um zu
 * erfahren, was. Diese hier erzaehlt von selbst, in drei Zustaenden:
 *
 *   Start    breit, mit Text ("Wird erzeugt"), damit man es mitbekommt
 *   Laufend  schmal, nur der Ring — es laeuft, mehr muss man nicht wissen
 *   Fertig   breit, mit Haken; ein Klick fuehrt zum Bild
 *
 * Wann sie wieder geht, haengt daran, ob jemand da war:
 *
 *   - Niemand hat sich geruehrt → sie bleibt. Wer in der Kueche war, soll
 *     beim Zurueckkommen sehen, dass etwas fertig ist.
 *   - Der Zeiger bewegt sich, eine Taste faellt → gesehen. Dann noch kurz
 *     stehen bleiben und verschwinden; wer arbeitet, will nicht abgehalten
 *     werden.
 *   - Der Tab liegt im Hintergrund → die Uhr steht. Zehn Sekunden, die
 *     niemand gesehen hat, sind keine zehn Sekunden.
 */
interface GenerationNoticeProps {
    generatingImages: CanvasImage[];
    lang?: string;
    onNavigateToImage?: (id: string) => void;
}

/** Wie lange die Startmeldung breit stehen bleibt, bevor sie einklappt. */
const START_EXPANDED_MS = 2600;
/** Hoechstdauer der Fertigmeldung, wenn niemand sie zur Kenntnis nimmt. */
const DONE_MAX_MS = 10000;
/** Restzeit, nachdem sich jemand geruehrt hat — gesehen heisst gesehen. */
const DONE_AFTER_SEEN_MS = 2000;

type Phase = 'idle' | 'running' | 'done';

export const GenerationNotice: React.FC<GenerationNoticeProps> = ({
    generatingImages, lang, onNavigateToImage,
}) => {
    const isGerman = lang === 'de';
    const [phase, setPhase] = useState<Phase>('idle');
    const [expanded, setExpanded] = useState(false);
    const [doneId, setDoneId] = useState<string | null>(null);
    const [, setTick] = useState(0);

    const prevIdsRef = useRef<Set<string>>(new Set());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

    const hide = useCallback(() => {
        clearTimer();
        setPhase('idle');
        setExpanded(false);
        setDoneId(null);
    }, []);

    // Laufende Generierungen erkennen und das Ende eines Auftrags bemerken.
    useEffect(() => {
        const ids = new Set(generatingImages.map(i => i.id));
        const prev = prevIdsRef.current;
        const started = [...ids].filter(id => !prev.has(id));
        const finished = [...prev].filter(id => !ids.has(id));
        prevIdsRef.current = ids;

        if (started.length > 0) {
            clearTimer();
            setPhase('running');
            setDoneId(null);
            setExpanded(true);
            timerRef.current = setTimeout(() => setExpanded(false), START_EXPANDED_MS);
            return;
        }

        if (finished.length > 0) {
            clearTimer();
            setDoneId(finished[finished.length - 1]);
            setPhase('done');
            setExpanded(true);
        }
    }, [generatingImages]);

    // Der Ring braucht einen Takt, solange etwas laeuft.
    useEffect(() => {
        if (phase !== 'running') return;
        const id = setInterval(() => setTick(t => t + 1), 500);
        return () => clearInterval(id);
    }, [phase]);

    /*
        Die Uhr der Fertigmeldung.

        Sie laeuft nur, wenn der Tab vorne ist, und sie wird kuerzer, sobald
        sich jemand ruehrt. Beides zusammen ergibt das Verhalten, das man von
        einer guten Benachrichtigung erwartet: Sie draengt sich nicht auf,
        verschwindet aber auch nicht ungesehen.
    */
    useEffect(() => {
        if (phase !== 'done') return;

        let seen = false;
        const arm = (ms: number) => {
            clearTimer();
            timerRef.current = setTimeout(hide, ms);
        };

        const onActivity = () => {
            if (seen) return;
            seen = true;
            arm(DONE_AFTER_SEEN_MS);
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') arm(seen ? DONE_AFTER_SEEN_MS : DONE_MAX_MS);
            else clearTimer();
        };

        if (document.visibilityState === 'visible') arm(DONE_MAX_MS);

        window.addEventListener('mousemove', onActivity, { passive: true });
        window.addEventListener('wheel', onActivity, { passive: true });
        window.addEventListener('keydown', onActivity);
        window.addEventListener('pointerdown', onActivity);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearTimer();
            window.removeEventListener('mousemove', onActivity);
            window.removeEventListener('wheel', onActivity);
            window.removeEventListener('keydown', onActivity);
            window.removeEventListener('pointerdown', onActivity);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [phase, hide]);

    useEffect(() => () => clearTimer(), []);

    if (phase === 'idle') return null;

    const count = generatingImages.length;
    const first = generatingImages[0];
    const progress = phase === 'done'
        ? 100
        : calcBarProgress(first?.generationStartTime, first?.estimatedDuration || 30000);

    const label = phase === 'done'
        ? (isGerman ? 'Bild ist fertig' : 'Image is ready')
        : count > 1
            ? (isGerman ? `${count} Bilder werden erzeugt` : `Generating ${count} images`)
            : (isGerman ? 'Bild wird erzeugt' : 'Generating image');

    const clickable = phase === 'done' && !!doneId && !!onNavigateToImage;

    return createPortal(
        <div className="fixed top-4 right-4 z-[900] pointer-events-none flex justify-end">
            <button
                type="button"
                disabled={!clickable}
                onClick={() => { if (clickable) { onNavigateToImage!(doneId!); hide(); } }}
                aria-live="polite"
                className={`pointer-events-auto h-10 pl-3 pr-3.5 rounded-full inline-flex items-center gap-2.5
                    bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md
                    ring-1 ring-black/[0.05] dark:ring-white/[0.06] shadow-sm
                    animate-[chip-in_320ms_cubic-bezier(0.16,1,0.3,1)_both]
                    ${clickable ? 'cursor-pointer hover:bg-white dark:hover:bg-zinc-900' : 'cursor-default'}
                    transition-colors duration-150`}
            >
                {/* Links das Zeichen: waehrend des Laufs der Fortschritt, am
                    Ende der Haken. Beide an derselben Stelle, gleich gross —
                    der eine wird zum anderen. */}
                <span className="relative w-[18px] h-[18px] shrink-0 grid place-items-center">
                    {phase === 'done' ? (
                        <Check className="w-[15px] h-[15px] text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                    ) : (
                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] -rotate-90">
                            <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3"
                                className="stroke-black/[0.09] dark:stroke-white/[0.12]" />
                            <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" strokeLinecap="round"
                                className="stroke-orange-500 transition-[stroke-dashoffset] duration-500 ease-linear"
                                strokeDasharray={2 * Math.PI * 9}
                                strokeDashoffset={2 * Math.PI * 9 * (1 - progress / 100)} />
                        </svg>
                    )}
                </span>

                {/* Der Text faehrt auf und zu, statt zu erscheinen und zu
                    verschwinden: Die Pille waechst und schrumpft dadurch, und
                    das ist dieselbe Bewegung wie beim Aufklappen einer Vorlage. */}
                <span
                    className="grid transition-[grid-template-columns,opacity] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ gridTemplateColumns: expanded ? '1fr' : '0fr', opacity: expanded ? 1 : 0 }}
                >
                    <span className="overflow-hidden whitespace-nowrap text-[13px] font-medium text-zinc-800 dark:text-zinc-100">
                        {label}
                    </span>
                </span>

                {count > 1 && !expanded && (
                    <span className="text-[13px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                        {count}
                    </span>
                )}
            </button>
        </div>,
        document.body,
    );
};
