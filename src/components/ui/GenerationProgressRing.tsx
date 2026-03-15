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
}

interface GenerationProgressRingProps {
    generatingImages: CanvasImage[];
    lang?: string;
    onNavigateToImage?: (id: string) => void;
    onGenerateMore?: (id: string) => void;
}

function calcProgress(startTime: number | undefined, duration: number): number {
    const start = startTime || Date.now();
    const elapsed = Date.now() - start;
    let p = (elapsed / duration) * 100;
    if (p > 95) p = 95 + (1 - Math.exp(-(elapsed - duration) / 8000)) * 4.9;
    return Math.min(p, 99.9);
}


export const GenerationProgressRing: React.FC<GenerationProgressRingProps> = ({
    generatingImages, lang, onNavigateToImage, onGenerateMore
}) => {
    const [tick, setTick] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [tracked, setTracked] = useState<TrackedImage[]>([]);
    const popoverRef = useRef<HTMLDivElement>(null);
    const prevGeneratingIdsRef = useRef<Set<string>>(new Set());
    const isGerman = lang === 'de';

    // Track generating images: add new ones, mark finished ones
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
                    });
                }
            }

            // Mark images that were generating but no longer are as finished
            for (const t of next) {
                if (!t.finished && prevIds.has(t.id) && !currentIds.has(t.id)) {
                    t.finished = true;
                }
            }

            return next;
        });

        // Auto-open popover when a new generation starts
        for (const img of generatingImages) {
            if (!prevIds.has(img.id)) {
                setIsOpen(true);
                break;
            }
        }

        prevGeneratingIdsRef.current = currentIds;
    }, [generatingImages]);

    // Tick animation via rAF while there are active generations
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

    const handleDismiss = useCallback(() => {
        setTracked([]);
        setIsOpen(false);
    }, []);

    const activeItems = tracked.filter(t => !t.finished);
    const allDone = activeItems.length === 0;

    // Auto-dismiss tracked list 5s after all generations finish
    useEffect(() => {
        if (!allDone || tracked.length === 0) return;
        const timer = setTimeout(handleDismiss, 5000);
        return () => clearTimeout(timer);
    }, [allDone, tracked.length, handleDismiss]);

    if (tracked.length === 0) return null;

    // Calculate combined progress of active items
    let weightedProgress = 100;
    if (!allDone) {
        const totalDuration = activeItems.reduce((sum, t) => sum + t.estimatedDuration, 0);
        weightedProgress = activeItems.reduce((sum, t) => {
            const p = calcProgress(t.generationStartTime, t.estimatedDuration);
            return sum + p * t.estimatedDuration;
        }, 0) / totalDuration;
    }

    // SVG ring params
    const size = 24;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (weightedProgress / 100) * circumference;

    return (
        <div className="relative" ref={popoverRef}>
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
                <div className="absolute top-full mt-2 left-0 z-50 w-64 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Items */}
                    <div className="max-h-60 overflow-y-auto">
                        {tracked.map(item => {
                            if (item.finished) {
                                // Finished item: checkmark + navigate arrow
                                return (
                                    <div key={item.id} className="px-4 py-3 flex items-center gap-3 border-b border-zinc-50 dark:border-zinc-900 last:border-b-0">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[12px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                {item.title || (isGerman ? 'Ohne Titel' : 'Untitled')}
                                            </div>
                                        </div>
                                        <Tooltip text={isGerman ? 'Zum Bild' : 'Go to image'}>
                                            <button
                                                onClick={() => onNavigateToImage?.(item.id)}
                                                className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                );
                            }

                            // Active item: progress bar + generate more button
                            const progress = calcProgress(item.generationStartTime, item.estimatedDuration);
                            return (
                                <div key={item.id} className="px-4 py-3 border-b border-zinc-50 dark:border-zinc-900 last:border-b-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-[12px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                            {item.title || (isGerman ? 'Ohne Titel' : 'Untitled')}
                                        </div>
                                        <Tooltip text={isGerman ? 'Mehr generieren' : 'Generate more'}>
                                            <button
                                                onClick={() => onGenerateMore?.(item.id)}
                                                className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0"
                                            >
                                                <Repeat className="w-4 h-4" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div className="mt-1.5 h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 rounded-full transition-none"
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
