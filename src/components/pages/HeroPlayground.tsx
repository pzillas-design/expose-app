/**
 * HeroPlayground — Standalone test page for the collapsing hero navbar.
 * Route: /playground  |  Delete when done.
 *
 * Concept: At scroll=0 the navbar IS part of the hero — transparent bg, white
 * text, orange gradient flows behind it. On scroll the gradient scrolls away,
 * the nav bar gets a solid bg + shrinks wordmark and button labels.
 */

import React, { useRef, useEffect, useState } from 'react';
import { Upload, Plus, MoreHorizontal } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Typo } from '../ui/DesignSystem';
import { useNavigate } from 'react-router-dom';

/* ─── Scroll progress ─────────────────────────────────────────────────────── */
function useScrollProgress(ref: React.RefObject<HTMLElement>, distance = 200) {
    const [p, setP] = useState(0);
    const raf = useRef<number>(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const fn = () => {
            cancelAnimationFrame(raf.current);
            raf.current = requestAnimationFrame(() =>
                setP(Math.min(el.scrollTop / distance, 1))
            );
        };
        el.addEventListener('scroll', fn, { passive: true });
        return () => { el.removeEventListener('scroll', fn); cancelAnimationFrame(raf.current); };
    }, [ref, distance]);
    return p;
}

/* ─── Schematic tiles ────────────────────────────────────────────────────── */
const Tile: React.FC<{ seed: number }> = ({ seed }) => {
    const lightness = 88 + (seed % 4) * 2;
    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{ aspectRatio: '1/1', background: `hsl(0 0% ${lightness}%)` }}
        >
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 rounded-full" style={{ background: `hsl(0 0% ${lightness - 12}%)` }} />
            </div>
        </div>
    );
};

/* ─── Main ────────────────────────────────────────────────────────────────── */
export const HeroPlayground: React.FC = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const p = useScrollProgress(scrollRef as React.RefObject<HTMLElement>, 220);

    // 0 = hero state  |  1 = scrolled/compact state
    const wordmarkOpacity  = Math.max(1 - p * 2.8, 0);
    const labelOpacity     = Math.max(1 - p * 3.5, 0);
    const heroOpacity      = Math.max(1 - p * 1.3, 0);
    const heroTranslate    = p * -50;
    const logoSize         = 28 + (1 - p) * 28; // 56px → 28px

    // Navbar bg: transparent over gradient → solid white / dark
    const navBgAlpha = p;

    return (
        // z-[60] sits above the global PublicNavbar / AppNavbar (z-50)
        <div className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">

            {/* ── Fixed navbar — transparent → solid on scroll ──────── */}
            <header
                className="absolute top-0 left-0 right-0 z-[70]"
                style={{ height: `${56 + (1 - p) * 30}px`, transition: 'none' }}
            >
                {/* Solid bg layer that fades in */}
                <div
                    className="absolute inset-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900"
                    style={{ opacity: navBgAlpha, transition: 'none' }}
                />
                {/* Blur layer */}
                <div
                    className="absolute inset-0"
                    style={{
                        backdropFilter: `blur(${p * 14}px)`,
                        WebkitBackdropFilter: `blur(${p * 14}px)`,
                        transition: 'none',
                    }}
                />

                <div className="relative flex items-center justify-between h-full px-5 sm:px-8">

                    {/* Left — logo + wordmark */}
                    <div className="flex items-center overflow-hidden" style={{ gap: wordmarkOpacity > 0.05 ? '10px' : '0px' }}>
                        <Logo
                            className="shrink-0"
                            style={{ width: logoSize, height: logoSize, transition: 'none' }}
                        />
                        <span
                            className={`${Typo.Mono} font-normal text-[17px] overflow-hidden whitespace-nowrap text-zinc-900 dark:text-white`}
                            style={{
                                opacity: wordmarkOpacity,
                                maxWidth: `${wordmarkOpacity * 80}px`,
                                transition: 'none',
                            }}
                        >
                            exposé
                        </span>
                    </div>

                    {/* Right — buttons + menu */}
                    <div className="flex items-center gap-1.5">

                        {/* Upload */}
                        <button className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors">
                            <Upload className="w-4 h-4 shrink-0" />
                            <span
                                className="text-[13px] font-medium overflow-hidden whitespace-nowrap"
                                style={{ opacity: labelOpacity, maxWidth: `${labelOpacity * 80}px`, transition: 'none' }}
                            >
                                Hochladen
                            </span>
                        </button>

                        {/* Generate */}
                        <button className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-colors">
                            <Plus className="w-4 h-4 shrink-0" />
                            <span
                                className="text-[13px] font-medium overflow-hidden whitespace-nowrap"
                                style={{ opacity: labelOpacity, maxWidth: `${labelOpacity * 90}px`, transition: 'none' }}
                            >
                                Generieren
                            </span>
                        </button>

                        {/* More — always visible, far right */}
                        <button className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            <MoreHorizontal className="w-[18px] h-[18px]" />
                        </button>

                    </div>
                </div>
            </header>

            {/* ── Scroll container ──────────────────────────────────── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

                {/* ── Hero — gradient section that merges with navbar ── */}
                <div
                    className="relative"
                    style={{
                        opacity: heroOpacity,
                        transform: `translateY(${heroTranslate}px)`,
                        marginBottom: `${heroTranslate}px`,
                        transition: 'none',
                        // min height: make sure it's tall enough to scroll
                        minHeight: '320px',
                    }}
                >
                    {/* Full gradient — extends above into navbar area */}
                    <div
                        className="absolute left-0 right-0 bottom-0"
                        style={{
                            top: '-86px', // pull up behind the navbar
                            background: 'linear-gradient(160deg, rgba(234,88,12,0.5) 0%, rgba(249,115,22,0.38) 30%, rgba(251,146,60,0.22) 55%, rgba(251,191,36,0.1) 75%, transparent 100%)',
                        }}
                    />
                    {/* Bottom fade */}
                    <div
                        className="absolute bottom-0 left-0 right-0"
                        style={{
                            height: '120px',
                            background: 'linear-gradient(to bottom, transparent, white)',
                        }}
                    />
                    <div className="hidden dark:block absolute bottom-0 left-0 right-0"
                        style={{ height: '120px', background: 'linear-gradient(to bottom, transparent, #09090b)' }}
                    />

                    {/* Hero text — starts below navbar (pt-14) */}
                    <div className="relative pt-20 pb-24 px-6 sm:px-10 flex flex-col gap-3">
                        <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium tracking-[0.2em] uppercase">
                            exposé
                        </p>
                        <h1
                            className={`${Typo.Mono} font-normal text-zinc-900 dark:text-white`}
                            style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', lineHeight: 1.1 }}
                        >
                            Start with an image.<br />See where it goes.
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[15px] mt-1 max-w-sm leading-relaxed">
                            Lade deine Bilder hoch oder lass KI für dich arbeiten.
                        </p>
                    </div>
                </div>

                {/* ── Tile grid ─────────────────────────────────────── */}
                <div className="px-4 sm:px-8 pt-4 pb-32 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
                    {Array.from({ length: 24 }, (_, i) => <Tile key={i} seed={i} />)}
                </div>

            </div>
        </div>
    );
};
