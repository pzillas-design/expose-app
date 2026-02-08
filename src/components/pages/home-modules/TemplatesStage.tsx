import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Plus, ChevronDown, Pen } from 'lucide-react';
import { TwoDotsVertical } from '@/components/ui/CustomIcons';

// --- Shared Internal Components ---

const ChipGroup = ({ items, activeItem, pressedItem, targetItem, scale, hideOnMobile = [] }: {
    items: string[];
    activeItem?: string;
    pressedItem?: boolean;
    targetItem?: string;
    scale?: number;
    hideOnMobile?: string[];
}) => (
    <>
        {items.map(item => (
            <div
                key={item}
                className={`px-4 py-2.5 text-xs rounded-md transition-all duration-150 flex items-center justify-center leading-none font-medium ${hideOnMobile.includes(item) ? 'hidden lg:flex' : 'flex'
                    } ${activeItem === item
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md'
                        : pressedItem && item === targetItem
                            ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                style={{ transform: (item === targetItem || activeItem === item) ? `scale(${scale || 1})` : 'scale(1)' }}
            >
                {item}
            </div>
        ))}
    </>
);

const SidepanelMockup = ({
    activeSeason,
    activeTime,
    buttonScale = 1,
    seasonScale = 1,
    timeScale = 1,
    activeSection,
    isSeasonPressed,
    isTimePressed,
    generationProgress = 0,
    isGenerating = false,
}: any) => {
    const highlightClass = "border-zinc-400 dark:border-zinc-600";
    return (
        <div className="flex flex-col h-full overflow-hidden px-4 lg:px-6 pt-4 lg:pt-6 pb-4">
            <div className="flex-none flex flex-col gap-3 lg:gap-5">
                <div className="flex flex-col gap-2 lg:gap-3">
                    <div className={`p-3 lg:p-4 rounded-lg bg-transparent border transition-all duration-300 ${activeSection === 'prompt' ? highlightClass : 'border-zinc-200 dark:border-zinc-800'}`}>
                        <p className="text-[10px] lg:text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Inszeniere das Bild neu indem du die Jahreszeit anpasst
                            <span className="inline-block w-[1.5px] h-[14px] bg-zinc-900 dark:bg-zinc-100 ml-0.5 align-middle -translate-y-[1px] mockup-cursor" />
                        </p>
                    </div>
                </div>

                <div className={`flex flex-col border rounded-lg bg-transparent p-3 lg:p-5 gap-3 lg:gap-4 group transition-all duration-300 ${activeSection === 'season' ? highlightClass : 'border-zinc-200 dark:border-zinc-800'}`}>
                    <div className="flex flex-col gap-2 lg:gap-2.5">
                        <span className="text-[10px] lg:text-[11px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Jahreszeit</span>
                        <div className="flex flex-wrap gap-1 lg:gap-1.5 pt-0.5">
                            <ChipGroup
                                items={['Frühling', 'Sommer', 'Winter']}
                                activeItem={activeSeason}
                                pressedItem={isSeasonPressed}
                                targetItem="Winter"
                                scale={seasonScale}
                            />
                        </div>
                    </div>
                </div>

                <div className={`flex flex-col border rounded-lg bg-transparent p-3 lg:p-5 gap-3 lg:gap-4 group transition-all duration-300 ${activeSection === 'time' ? highlightClass : 'border-zinc-200 dark:border-zinc-800'}`}>
                    <div className="flex flex-col gap-2 lg:gap-2.5">
                        <span className="text-[10px] lg:text-[11px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Uhrzeit</span>
                        <div className="flex flex-wrap gap-1 lg:gap-1.5 pt-0.5">
                            <ChipGroup
                                items={['Morgen', 'Mittag', 'Nachmittag', 'Golden Hour', 'Blue Hour']}
                                activeItem={activeTime}
                                pressedItem={isTimePressed}
                                targetItem="Golden Hour"
                                scale={timeScale}
                                hideOnMobile={['Nachmittag', 'Blue Hour']}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 lg:gap-4">
                    <div className="hidden lg:grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer group">
                            <Pen className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" /> Anmerkung
                        </div>
                        <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer group">
                            <Camera className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" /> Referenzbild
                        </div>
                    </div>

                    <div
                        className="w-full h-10 lg:h-12 rounded-lg font-bold text-[10px] lg:text-[11px] flex items-center justify-center relative uppercase tracking-widest transition-all duration-150 transform-gpu bg-black dark:bg-white text-white dark:text-black overflow-hidden"
                        style={{ transform: `scale(${buttonScale})` }}
                    >
                        <span>Generieren</span>
                        <div className="absolute right-3 p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition-colors">
                            <TwoDotsVertical className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-1 min-h-[20px]" />
            <div className="hidden lg:flex flex-none flex-col border-t border-zinc-200 dark:border-zinc-800 -mx-6">
                <div className="h-14 flex items-center justify-between px-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2">
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Vorlagen</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="pt-0.5 pb-0 space-y-1.5">
                    {['Home Staging', 'Cleanup', 'Jahreszeit'].map((lib, i) => (
                        <div key={lib} className="flex items-center justify-between py-2 px-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 group transition-colors cursor-pointer">
                            <span className="text-[13px] text-zinc-500 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">{lib}</span>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-30 transition-opacity pr-2">
                                <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                                <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export interface TemplatesStageProps {
    progress: number; // Local progress [0, 1] for this section
    scrollActive: boolean;
    enterProgress?: number; // 0 -> 1 (100% -> 0% translateY)
    exitProgress?: number; // 0 -> 1 (0% -> -100% translateY)
}

export const TemplatesStage: React.FC<TemplatesStageProps> = ({ progress, scrollActive, enterProgress = 1, exitProgress = 0 }) => {
    // Interaction logic adapted from InteractiveSeasonPanel
    const [autoProgress, setAutoProgress] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [seasonState, setSeasonState] = useState<string | undefined>(undefined);
    const [timeState, setTimeState] = useState<string | undefined>(undefined);

    const [isSeasonStepPressed, setIsSeasonStepPressed] = useState(false);
    const [isTimeStepPressed, setIsTimeStepPressed] = useState(false);
    const [isButtonStepPressed, setIsButtonStepPressed] = useState(false);

    const hasTriggeredSeason = useRef(false);
    const hasTriggeredTime = useRef(false);
    const hasTriggeredGenerate = useRef(false);

    // Standardize easing to remove wobble: Both Enter and Exit use the exact same curve
    const easedEnter = enterProgress < 0.5 ? 2 * enterProgress * enterProgress : 1 - Math.pow(-2 * enterProgress + 2, 2) / 2;
    const easedExit = exitProgress < 0.5 ? 2 * exitProgress * exitProgress : 1 - Math.pow(-2 * exitProgress + 2, 2) / 2;

    useEffect(() => {
        if (progress < 0.05) {
            hasTriggeredSeason.current = false;
            hasTriggeredTime.current = false;
            hasTriggeredGenerate.current = false;
            setSeasonState(undefined);
            setTimeState(undefined);
            setAutoProgress(0);
            setIsFinished(false);
            return;
        }

        // Pause internal triggers if we are exiting (swiping out)
        if (exitProgress > 0.1) return;

        if (progress >= 0.2 && !hasTriggeredSeason.current) {
            hasTriggeredSeason.current = true;
            setIsSeasonStepPressed(true);
            setTimeout(() => {
                setIsSeasonStepPressed(false);
                setSeasonState('Winter');
            }, 150);
        }

        if (progress >= 0.4 && !hasTriggeredTime.current) {
            hasTriggeredTime.current = true;
            setIsTimeStepPressed(true);
            setTimeout(() => {
                setIsTimeStepPressed(false);
                setTimeState('Golden Hour');
            }, 150);
        }

        if (progress >= 0.6 && !hasTriggeredGenerate.current) {
            hasTriggeredGenerate.current = true;
            setIsButtonStepPressed(true);
            setTimeout(() => {
                setIsButtonStepPressed(false);
                let start: number | null = null;
                const animate = (t: number) => {
                    if (!start) start = t;
                    const elapsed = t - start;
                    const p = Math.min(elapsed / 1250, 1);
                    setAutoProgress(Math.pow(p, 2.0));
                    if (p < 1) requestAnimationFrame(animate);
                    else setIsFinished(true);
                };
                requestAnimationFrame(animate);
            }, 150);
        }
    }, [progress, exitProgress]);

    // Derived UI states
    const activeSection = progress < 0.15 ? 'prompt' : progress < 0.35 ? 'season' : progress < 0.55 ? 'time' : 'generate';
    const isGenerating = autoProgress > 0 && !isFinished;

    return (
        <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
                opacity: scrollActive ? 1 : 0,
                pointerEvents: scrollActive ? 'auto' : 'none',
                transform: `translateY(${(1 - easedEnter) * 100 - easedExit * 100}vh)`
            }}
        >
            {/* Content Container */}
            <div className="relative w-full h-full max-w-[1700px] mx-auto px-8 lg:px-12 2xl:px-16 flex flex-col lg:flex-row items-center pointer-events-none">

                {/* Typography Part: Left on Desktop */}
                <div className="w-full h-[35vh] lg:h-full lg:flex-1 flex items-start lg:items-center justify-start lg:pr-40 z-20 order-2 lg:order-1 text-left pointer-events-auto py-8 lg:py-0">
                    <div className="flex flex-col max-w-xl">
                        <h2 className="text-3xl sm:text-5xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-4 lg:mb-8 leading-[1.1] lg:leading-[1.1]">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Vorlagen</span> <br className="hidden lg:block" />
                            nutzen & anlegen.
                        </h2>
                        <p className="text-base sm:text-xl lg:text-2xl text-zinc-500 leading-relaxed font-light">
                            Definieren Sie Ihren Stil und nutzen Sie ihn immer wieder für konsistente Ergebnisse.
                        </p>
                    </div>
                </div>

                {/* Visual Part: Right on Desktop */}
                <div className="w-[calc(100%+32px)] lg:w-[calc(100%+50vw-50%)] -mr-8 lg:mr-[calc(50%-50vw)] h-[65vh] lg:h-[80vh] relative order-1 lg:order-2 overflow-visible pointer-events-auto lg:my-auto">
                    <div
                        className="absolute bottom-0 left-0 flex items-stretch bg-white dark:bg-zinc-900 rounded-tl-[12px] rounded-bl-[12px] border-t border-l border-b border-zinc-200 dark:border-zinc-800 overflow-hidden z-10 pointer-events-none will-change-transform will-change-opacity origin-bottom-left lg:origin-top-left scale-[0.7] lg:scale-100 w-[142.8%] h-[64.3vh] lg:w-full lg:h-full"
                    >
                        {/* Progress Bar */}
                        <div className={`absolute top-0 left-0 h-[3px] z-[60] transition-opacity duration-300 ${isGenerating ? 'opacity-100' : 'opacity-0'}`} style={{ width: '100%' }}>
                            <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300 ease-out" style={{ width: `${autoProgress * 100}%` }} />
                        </div>

                        {/* Sidepanel Mockup */}
                        <div className="flex flex-none border-r border-zinc-200 dark:border-zinc-800 flex-col overflow-hidden bg-white dark:bg-zinc-900/50 w-[245px] lg:w-[350px] origin-left">
                            <SidepanelMockup
                                activeSeason={seasonState}
                                activeTime={timeState}
                                activeSection={activeSection}
                                isSeasonPressed={isSeasonStepPressed}
                                isTimePressed={isTimeStepPressed}
                                isGenerating={isGenerating}
                                generationProgress={autoProgress}
                                buttonScale={isButtonStepPressed ? 0.95 : 1}
                                seasonScale={isSeasonStepPressed ? 0.9 : 1}
                                timeScale={isTimeStepPressed ? 0.9 : 1}
                            />
                        </div>

                        {/* Scene Display */}
                        <div className="relative flex-1 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                            <img src="/home/3 vorlagen/edit_sommer.jpg" className={`absolute inset-0 w-full h-full object-cover ${isFinished ? 'opacity-0' : 'opacity-100'}`} alt="Sommer Scene" />
                            <img src="/home/3 vorlagen/edit_winter.jpg" className={`absolute inset-0 w-full h-full object-cover ${isFinished ? 'opacity-100' : 'opacity-0'}`} alt="Winter Scene Result" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styleContent = `
    .mockup-cursor {
        animation: cursor-blink 1s steps(1, start) infinite;
    }
    @keyframes cursor-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }
`;

if (typeof document !== 'undefined') {
    const styleId = 'templates-stage-styles';
    if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = styleContent;
        document.head.appendChild(styleEl);
    }
}
