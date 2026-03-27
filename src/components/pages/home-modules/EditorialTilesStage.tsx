import React from 'react';

export interface EditorialTilesStageProps {
    progress: number;
    scrollActive: boolean;
    enterProgress?: number;
    exitProgress?: number;
    t: (key: string) => string;
    lang?: string;
}

const BananaVisual = ({ progress }: { progress: number }) => {
    const floatY = 14 - progress * 14;
    const rotate = -12 + progress * 10;
    const glowScale = 0.92 + progress * 0.1;

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(255,247,237,0.72)_42%,_rgba(255,237,213,0.18)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.92),_rgba(24,24,27,0.95)_50%,_rgba(9,9,11,1)_100%)]">
            <div
                className="absolute inset-[12%] rounded-full bg-orange-500/20 blur-[80px] transition-transform duration-300"
                style={{ transform: `scale(${glowScale}) translateY(${floatY * 0.4}px)` }}
            />
            <div className="absolute right-[8%] top-[8%] h-16 w-28 rounded-[24px] border border-white/70 bg-white/80 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                <div className="h-2 w-16 rounded-full bg-orange-500/80" />
                <div className="mt-2 h-2 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="mt-2 h-2 w-14 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="absolute bottom-[10%] left-[8%] h-20 w-20 rounded-[24px] border border-white/70 bg-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none" />

            <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                style={{ transform: `translateY(${floatY}px) rotate(${rotate}deg)` }}
            >
                <svg viewBox="0 0 520 380" className="h-[88%] w-[88%] drop-shadow-[0_30px_60px_rgba(234,88,12,0.18)]">
                    <defs>
                        <linearGradient id="banana-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fde68a" />
                            <stop offset="45%" stopColor="#facc15" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M114 219C132 278 190 323 270 329C344 334 414 307 457 251C468 236 457 216 437 220C371 233 285 226 220 195C184 178 155 154 138 127C129 111 112 111 105 126C92 151 96 183 114 219Z"
                        fill="url(#banana-fill)"
                    />
                    <path
                        d="M126 203C145 250 196 288 267 294C333 300 392 282 431 247"
                        fill="none"
                        stroke="#fff7ed"
                        strokeLinecap="round"
                        strokeWidth="16"
                        opacity="0.75"
                    />
                    <path d="M431 247C443 243 453 239 462 232" fill="none" stroke="#6b3f12" strokeLinecap="round" strokeWidth="11" />
                    <path d="M106 126C101 115 96 109 89 104" fill="none" stroke="#6b3f12" strokeLinecap="round" strokeWidth="11" />
                </svg>
            </div>
        </div>
    );
};

const MiniVariantCard = ({ progress, src, title, body, kicker, align = 'left' }: {
    progress: number;
    src: string;
    title: string;
    body: string;
    kicker: string;
    align?: 'left' | 'right';
}) => {
    const translateY = 18 - progress * 18;
    const translateX = align === 'left' ? -10 + progress * 10 : 10 - progress * 10;

    return (
        <article
            className="group relative overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white/90 p-4 shadow-[0_20px_60px_rgba(24,24,27,0.06)] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-none"
            style={{ transform: `translate3d(${translateX}px, ${translateY}px, 0)` }}
        >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-zinc-100 dark:bg-zinc-800">
                <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10 dark:from-black/30 dark:to-white/5" />
            </div>
            <div className="mt-5 flex min-h-[7.5rem] flex-col justify-end">
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                    {kicker}
                </p>
                <h3 className="mt-2 text-2xl font-kumbh font-semibold tracking-[-0.04em] lowercase text-zinc-900 dark:text-white">
                    {title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {body}
                </p>
            </div>
        </article>
    );
};

export const EditorialTilesStage: React.FC<EditorialTilesStageProps> = ({
    progress,
    scrollActive,
    enterProgress = 1,
    exitProgress = 0,
    t
}) => {
    const easedEnter = enterProgress < 0.5 ? 2 * enterProgress * enterProgress : 1 - Math.pow(-2 * enterProgress + 2, 2) / 2;
    const easedExit = exitProgress < 0.5 ? 2 * exitProgress * exitProgress : 1 - Math.pow(-2 * exitProgress + 2, 2) / 2;
    const heroOffset = 28 - progress * 28;

    return (
        <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
                opacity: scrollActive ? 1 : 0,
                pointerEvents: scrollActive ? 'auto' : 'none',
                transform: `translateY(${(1 - easedEnter) * 100 - easedExit * 100}vh)`
            }}
        >
            <div className="mx-auto flex h-full w-full max-w-[1700px] items-center px-6 py-10 lg:px-12 2xl:px-16">
                <div className="grid h-full w-full grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.95fr] lg:gap-5">
                    <article
                        className="relative flex min-h-[38rem] flex-col overflow-hidden rounded-[32px] border border-zinc-200/80 bg-white/95 p-4 shadow-[0_30px_90px_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900/92 dark:shadow-none"
                        style={{ transform: `translate3d(0, ${heroOffset}px, 0)` }}
                    >
                        <div className="relative flex-1 overflow-hidden rounded-[28px] bg-zinc-50 dark:bg-zinc-950">
                            <BananaVisual progress={progress} />
                        </div>

                        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-[28px] bg-gradient-to-t from-white via-white/98 to-white/0 px-5 pb-5 pt-20 dark:from-zinc-900 dark:via-zinc-900/96">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                                {t('home_editorial_kicker')}
                            </p>
                            <h2 className="mt-3 max-w-3xl text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-kumbh font-semibold tracking-[-0.05em] leading-[0.98] lowercase text-zinc-900 dark:text-white">
                                {t('home_editorial_title')}
                            </h2>
                            <p className="mt-4 max-w-2xl text-base sm:text-lg lg:text-xl leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {t('home_editorial_desc')}
                            </p>
                        </div>
                    </article>

                    <div className="grid min-h-[38rem] grid-cols-1 gap-4 lg:grid-rows-2 lg:gap-5">
                        <MiniVariantCard
                            progress={progress}
                            src="/home/3 vorlagen/edit_sommer.jpg"
                            kicker={t('home_editorial_card_kicker')}
                            title={t('home_editorial_card_one_title')}
                            body={t('home_editorial_card_one_desc')}
                        />
                        <MiniVariantCard
                            progress={progress}
                            src="/home/3 vorlagen/edit_winter.jpg"
                            kicker={t('home_editorial_card_kicker')}
                            title={t('home_editorial_card_two_title')}
                            body={t('home_editorial_card_two_desc')}
                            align="right"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
