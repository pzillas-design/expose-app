import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Repeat, ArrowRight } from 'lucide-react';
import { CanvasImage } from '@/types';
import { Tooltip } from './DesignSystem';

interface TrackedImage {
    id: string;
    title: string;
    estimatedDuration: number;
    generationStartTime?: number;
    finished: boolean;
    /** Transitioning to 100% — image arrived in UI, animating bar before showing checkmark */
    finishing?: boolean;
}

interface GenerationProgressRingProps {
    generatingImages: CanvasImage[];
    lang?: string;
    onNavigateToImage?: (id: string) => void;
    onGenerateMore?: (id: string) => void;
    t?: (key: string) => string;
    /** When true (detail view), auto-close the popover with fade-out once all jobs finish */
    autoCloseWhenDone?: boolean;
}

/** Progress for the ring and individual bars — caps at 85% so 100% only fires when the image truly arrived. */
function calcBarProgress(startTime: number | undefined, duration: number): number {
    const start = startTime || Date.now();
    const elapsed = Date.now() - start;
    const p = (elapsed / duration) * 100;
    return Math.min(p, 85);
}


export const GenerationProgressRing: React.FC<GenerationProgressRingProps> = ({
    generatingImages, lang, onNavigateToImage, onGenerateMore, t, autoCloseWhenDone = false
}) => {
    const [tick, setTick] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [tracked, setTracked] = useState<TrackedImage[]>([]);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isPopoverClosing, setIsPopoverClosing] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const prevGeneratingIdsRef = useRef<Set<string>>(new Set());
    const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isGerman = lang === 'de';
    const isOpenRef = useRef(isOpen);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // Track generating images: add new ones, mark finishing/finished ones
    useEffect(() => {
        const currentIds = new Set(generatingImages.map(i => i.id));
        const prevIds = prevGeneratingIdsRef.current;

        setTracked(prev => {
            let next = [...prev];

            // Add newly generating images
            for (const img of generatingImages) {
                if (!next.find(t => t.id === img.id)) {
                    next.push({
                        id: img.id,
                        title: img.title,
                        estimatedDuration: img.estimatedDuration || 23000,
                        generationStartTime: img.generationStartTime,
                        finished: false,
                        finishing: false,
                    });
                }
            }

            // Mark images that left generatingImages as "finishing" (show 100%)
            for (const item of next) {
                if (!item.finished && !item.finishing && prevIds.has(item.id) && !currentIds.has(item.id)) {
                    item.finishing = true;
                }
            }

            return next;
        });

        // Auto-open popover when a new generation starts
        for (const img of generatingImages) {
            if (!prevIds.has(img.id)) {
                setIsOpen(true);
                setIsFadingOut(false);
                setIsPopoverClosing(false);
                break;
            }
        }

        prevGeneratingIdsRef.current = currentIds;
    }, [generatingImages]);

    // After a finishing item has been at 100% for ~800ms, mark it fully finished
    useEffect(() => {
        const finishingItems = tracked.filter(t => t.finishing && !t.finished);
        if (finishingItems.length === 0) return;
        const timer = setTimeout(() => {
            setTracked(prev => prev.map(item =>
                item.finishing ? { ...item, finished: true, finishing: false } : item
            ));
        }, 800);
        return () => clearTimeout(timer);
    }, [tracked]);

    // Tick animation via rAF while there are active (non-finished) generations
    const hasActive = tracked.some(t => !t.finished);
    useEffect(() => {
        if (!hasActive) return;
        let rafId: number;
        const loop = () => {
            setTick(t => t + 1);
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [hasActive]);

    // Close popover on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Auto-hide popover after 10 s; re-show (timer resets) whenever isOpen flips back to true
    useEffect(() => {
        if (autoHideTimerRef.current) {
            clearTimeout(autoHideTimerRef.current);
            autoHideTimerRef.current = null;
        }
        if (!isOpen) return;
        autoHideTimerRef.current = setTimeout(() => {
            setIsPopoverClosing(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsPopoverClosing(false);
            }, 600);
        }, 10_000);
        return () => {
            if (autoHideTimerRef.current) {
                clearTimeout(autoHideTimerRef.current);
                autoHideTimerRef.current = null;
            }
        };
    }, [isOpen]);

    const handleDismiss = useCallback(() => {
        setTracked([]);
        setIsOpen(false);
        setIsFadingOut(false);
    }, []);

    const activeItems = tracked.filter(t => !t.finished);
    const allDone = activeItems.length === 0;

    // Detail-view auto-close: fade the popover out shortly after all jobs finish
    useEffect(() => {
        if (!autoCloseWhenDone || !allDone || !isOpen || tracked.length === 0) return;
        // Give user a moment to see the checkmark, then fade the popover away
        const timer = setTimeout(() => {
            setIsPopoverClosing(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsPopoverClosing(false);
            }, 400);
        }, 1200);
        return () => clearTimeout(timer);
    }, [autoCloseWhenDone, allDone, isOpen, tracked.length]);

    // Auto-dismiss: 60s after all done, but only if popover is already closed
    useEffect(() => {
        if (!allDone || tracked.length === 0) return;

        // Start fade-out after 60s — but only if the popover is closed at that point
        const timer = setTimeout(() => {
            if (!isOpenRef.current) {
                setIsFadingOut(true);
                // Remove entirely after the fade animation (~500ms)
                setTimeout(handleDismiss, 500);
            }
            // If popover is still open, don't auto-dismiss — user will close manually
        }, 60_000);
        return () => clearTimeout(timer);
    }, [allDone, tracked.length, handleDismiss]);

    if (tracked.length === 0) return null;

    // Calculate combined progress of active/finishing items for the ring
    let weightedProgress = 100;
    if (!allDone) {
        const totalDuration = activeItems.reduce((sum, t) => sum + t.estimatedDuration, 0);
        weightedProgress = activeItems.reduce((sum, t) => {
            const p = calcBarProgress(t.generationStartTime, t.estimatedDuration);
            return sum + p * t.estimatedDuration;
        }, 0) / (totalDuration || 1);
    }

    // SVG ring params
    const size = 24;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (weightedProgress / 100) * circumference;

    return (
        <div
            className={`relative transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
            ref={popoverRef}
        >
            {/* Ring / Check button */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
                {allDone ? (
                    <Check className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                ) : (
                    <svg width={size} height={size} className="-rotate-90">
                        <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none" stroke="currentColor" strokeWidth={strokeWidth}
                            className="text-zinc-200 dark:text-zinc-800"
                        />
                        <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none" stroke="currentColor" strokeWidth={strokeWidth}
                            strokeDasharray={circumference} strokeDashoffset={offset}
                            strokeLinecap="round" className="text-orange-500 transition-none"
                        />
                    </svg>
                )}
            </button>

            {/* Popover */}
            {isOpen && (
                <div
                    className={`absolute top-full mt-2 left-0 z-50 w-64 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden ${isPopoverClosing ? 'opacity-0' : 'animate-in fade-in zoom-in-95 duration-150'}`}
                    style={{ transition: isPopoverClosing ? 'opacity 600ms ease-out' : undefined }}
                >
                    {/* Items */}
                    <div className="max-h-60 overflow-y-auto">
                        {[...tracked].reverse().map(item => {
                            if (item.finished) {
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => onNavigateToImage?.(item.id)}
                                        className="group px-4 py-3 flex items-center gap-3 border-b border-zinc-50 dark:border-zinc-900 last:border-b-0 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[12px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                {item.title || (t ? t('untitled') : (isGerman ? 'Ohne Titel' : 'Untitled'))}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                );
                            }

                            // Active / finishing item: progress bar + clickable row
                            const progress = item.finishing ? 100 : calcBarProgress(item.generationStartTime, item.estimatedDuration);
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => onNavigateToImage?.(item.id)}
                                    className="group px-4 py-3 border-b border-zinc-50 dark:border-zinc-900 last:border-b-0 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-[12px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                            {item.title || (t ? t('untitled') : (isGerman ? 'Ohne Titel' : 'Untitled'))}
                                        </div>
                                        {!item.finishing && (
                                            <Tooltip text={t ? t('generate_more') : (isGerman ? 'Mehr generieren' : 'Generate more')}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onGenerateMore?.(item.id); }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-300 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                                                >
                                                    <Repeat className="w-3.5 h-3.5" />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className="mt-3 mb-0.5 h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-orange-500 rounded-full ${item.finishing ? 'transition-all duration-500 ease-out' : 'transition-none'}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
