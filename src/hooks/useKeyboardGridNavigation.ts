import { useEffect, useState, useCallback } from 'react';

interface UseKeyboardGridNavigationProps {
    itemCount: number;
    columns: number;
    isActive: boolean;
    onEnter?: (index: number) => void;
    onDelete?: (index: number) => void;
    onEscape?: () => void;
    getElementAtIndex?: (index: number) => Element | null;
    /**
     * Was geschieht, wenn der Pfeil ueber das letzte bzw. vor das erste Feld
     * hinausfuehrt.
     *
     * Gibt die Funktion `true` zurueck, uebernimmt der Aufrufer: Er tauscht
     * die Liste aus (etwa auf den naechsten Stapel) und setzt die Auswahl
     * selbst. Gibt sie nichts zurueck, bleibt es beim Anschlag wie bisher.
     *
     * So weiss dieser Haken nichts von Stapeln — er kennt nur seinen eigenen
     * Rand und fragt, ob jemand dahinter etwas hat.
     */
    onPastEnd?: () => boolean;
    onBeforeStart?: () => boolean;
}

export function useKeyboardGridNavigation({
    itemCount,
    columns,
    isActive,
    onEnter,
    onDelete,
    onEscape,
    getElementAtIndex,
    onPastEnd,
    onBeforeStart,
}: UseKeyboardGridNavigationProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // Auto-scroll active item into view when navigating with keyboard
    useEffect(() => {
        if (activeIndex === null || !getElementAtIndex) return;
        const el = getElementAtIndex(activeIndex);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, [activeIndex, getElementAtIndex]);

    // Reset focus when not active or items change drastically
    useEffect(() => {
        if (!isActive || itemCount === 0) {
            setActiveIndex(null);
        }
    }, [isActive, itemCount]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isActive || itemCount === 0) return;

            // Die Pfeile rechnen mit dem aktuellen Stand, nicht im
            // Zustands-Aktualisierer: Am Rand wird eine fremde Funktion
            // gerufen, und ein Seiteneffekt gehoert nicht in einen Reducer.
            const cur = activeIndex;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    if (cur === null) { setActiveIndex(0); break; }
                    if (cur >= itemCount - 1) { onPastEnd?.(); break; }
                    setActiveIndex(cur + 1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (cur === null) { setActiveIndex(0); break; }
                    if (cur <= 0) { onBeforeStart?.(); break; }
                    setActiveIndex(cur - 1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (cur === null) { setActiveIndex(0); break; }
                    if (cur + columns >= itemCount) { onPastEnd?.(); break; }
                    setActiveIndex(cur + columns);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (cur === null) { setActiveIndex(0); break; }
                    if (cur - columns < 0) { onBeforeStart?.(); break; }
                    setActiveIndex(cur - columns);
                    break;
                case 'Enter':
                    if (activeIndex !== null && onEnter) {
                        e.preventDefault();
                        onEnter(activeIndex);
                    }
                    break;
                case 'Backspace':
                case 'Delete':
                    if (activeIndex !== null && onDelete) {
                        e.preventDefault();
                        onDelete(activeIndex);
                    }
                    break;
                case 'Escape':
                    if (onEscape) {
                        e.preventDefault();
                        onEscape();
                        setActiveIndex(null);
                    }
                    break;
            }
        },
        [isActive, itemCount, columns, activeIndex, onEnter, onDelete, onEscape, onPastEnd, onBeforeStart]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { activeIndex, setActiveIndex };
}
