import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Layers, Mic, Zap, SlidersHorizontal, MousePointer2, Euro, Cpu, Download, Clock, Wand2, Palette, Users, BadgeCheck, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/DesignSystem';
import { Logo } from '@/components/ui/Logo';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { NaturalWaveform } from './NaturalWaveform';
import { BarWaveform } from './BarWaveform';

/* ─── Scroll-shrink navbar hook ─────────────────────────────── */
function useWindowScrollProgress(distance = 180) {
    const [p, setP] = useState(0);
    const raf = useRef(0);
    useEffect(() => {
        const fn = () => {
            cancelAnimationFrame(raf.current);
            raf.current = requestAnimationFrame(() =>
                setP(Math.min(window.scrollY / distance, 1))
            );
        };
        window.addEventListener('scroll', fn, { passive: true });
        return () => { window.removeEventListener('scroll', fn); cancelAnimationFrame(raf.current); };
    }, [distance]);
    return p;
}

const DynamicNavbar: React.FC<{ onGetStarted: () => void; onSignIn: () => void; user: any; de: boolean }> = ({
    onGetStarted, onSignIn, user, de,
}) => {
    const p = useWindowScrollProgress(180);
    const wordmarkOpacity = Math.max(1 - p * 2.5, 0);
    const logoSize        = 28 + (1 - p) * 24; // 52px → 28px
    const navHeight       = 56 + (1 - p) * 28; // 84px → 56px

    return (
        <header className="fixed top-0 left-0 right-0 z-50" style={{ height: `${navHeight}px` }}>
            {/* Bg: transparent → solid + blur */}
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: p }} />
            <div className="absolute inset-0" style={{ backdropFilter: `blur(${p * 14}px)`, WebkitBackdropFilter: `blur(${p * 14}px)` }} />
            <div className="absolute bottom-0 left-0 right-0 border-b border-white/10" style={{ opacity: p }} />

            <div className="relative flex items-center justify-between h-full px-6 sm:px-10">
                {/* Logo + wordmark */}
                <div className="flex items-center gap-2.5">
                    <Logo style={{ width: logoSize, height: logoSize }} className="shrink-0" />
                    <span className="font-mono text-[17px] text-white overflow-hidden whitespace-nowrap"
                          style={{ opacity: wordmarkOpacity, maxWidth: `${wordmarkOpacity * 80}px` }}>
                        exposé
                    </span>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2">
                    {!user && (
                        <button onClick={onSignIn}
                            className="text-xs text-white/50 hover:text-white/80 transition-colors px-3 py-2">
                            {de ? 'Anmelden' : 'Sign in'}
                        </button>
                    )}
                    <Button variant="orange" size="s" onClick={onGetStarted}>
                        {de ? 'Starten' : 'Get started'}
                    </Button>
                </div>
            </div>
        </header>
    );
};

interface AboutV2PageProps {
    user: any;
    userProfile: any;
    credits: number | null;
    t: (key: any) => string;
    lang: string;
    onSignIn: () => void;
    onGetStarted: () => void;
}

// ── Card Wall ──────────────────────────────────────────────
type CardDef =
    | { type: 'usp';   accent: 'dark'|'orange'|'glass'; icon?: React.ReactNode; img?: string; en: string; de: string; sub_en?: string; sub_de?: string; }
    | { type: 'quote'; accent: 'dark'|'orange'|'glass'; en: string; de: string; author: string; role: string; };

const CARDS: CardDef[] = [
    {
        type: 'usp', accent: 'glass',
        img: '/home/v2/hero-new-2.png',
        en: 'Direct the AI.', de: 'Dirigiere die KI.',
        sub_en: 'Draw on the image. Mark exactly where.', sub_de: 'Direkt aufs Bild zeichnen.',
    },
    {
        type: 'usp', accent: 'dark',
        img: '/home/v2/v2-a.png',
        en: 'Run 12 at once.', de: '12 auf einmal.',
        sub_en: 'Parallel generation — compare, pick, move on.', sub_de: 'Parallel generieren — vergleichen, weitermachen.',
    },
    {
        type: 'usp', accent: 'glass',
        img: '/home/v2/hero-new-4.png',
        en: 'Voice control.', de: 'Voice Control.',
        sub_en: 'Describe what you see. The AI acts.', sub_de: 'Beschreibe was du siehst. Die KI handelt.',
    },
    {
        type: 'usp', accent: 'dark',
        icon: <SlidersHorizontal className="w-7 h-7 text-zinc-400" />,
        en: 'Set it once.', de: 'Einmal aufsetzen.',
        sub_en: 'Presets keep every output on-brand.', sub_de: 'Presets halten jedes Bild on-brand.',
    },
    {
        type: 'usp', accent: 'orange',
        icon: <Euro className="w-7 h-7 text-white/80" />,
        en: 'Pay per image.', de: 'Pro Bild bezahlen.',
        sub_en: 'No subscription. From 0.05 €.', sub_de: 'Kein Abo. Ab 0,05 €.',
    },
    {
        type: 'usp', accent: 'glass',
        img: '/home/v2/hero-new-1.png',
        en: 'Stack & compare.', de: 'Stapeln & vergleichen.',
        sub_en: 'Layer versions. The best wins.', sub_de: 'Versionen übereinanderlegen.',
    },
    {
        type: 'usp', accent: 'dark',
        img: '/home/v2/v2-b.png',
        en: '0.5 K → 4 K.', de: '0,5 K → 4 K.',
        sub_en: 'Draft fast. Export sharp.', sub_de: 'Schnell skizzieren. Scharf exportieren.',
    },
    {
        type: 'usp', accent: 'glass',
        icon: <Cpu className="w-7 h-7 text-white/60" />,
        en: "World's leading model.", de: 'Führendes Modell.',
        sub_en: "Powered by AI.", sub_de: 'Angetrieben von neuester KI.',
    },
    {
        type: 'usp', accent: 'dark',
        icon: <Clock className="w-7 h-7 text-zinc-400" />,
        en: 'Unlimited history.', de: 'Unendlicher Verlauf.',
        sub_en: 'Never lose a good prompt again.', sub_de: 'Verliere nie wieder einen guten Prompt.',
    },
    {
        type: 'usp', accent: 'orange',
        icon: <Zap className="w-7 h-7 text-white/80" />,
        en: 'In seconds.', de: 'In Sekunden.',
        sub_en: 'High-speed generation on ultra clusters.', sub_de: 'High-Speed Generierung auf GPU-Clustern.',
    },
    {
        type: 'usp', accent: 'glass',
        img: '/home/v2/hero-new-3.png',
        en: 'Magic Wand.', de: 'Zauberstab.',
        sub_en: 'Let AI refine your words for better results.', sub_de: 'Lass die KI deine Prompts veredeln.',
    },
    {
        type: 'usp', accent: 'dark',
        icon: <Palette className="w-7 h-7 text-zinc-400" />,
        en: 'Brand consistency.', de: 'Markentreue.',
        sub_en: 'Export assets that fit your style.', sub_de: 'Exportiere Bilder, die zu dir passen.',
    },
];

// no borders, no shadows — just bg fills
const ACCENT_STYLES_DARK: Record<string, React.CSSProperties> = {
    dark:   { background: '#1c1c1e' },
    orange: { background: 'linear-gradient(135deg, #f97316, #dc2626)' },
    glass:  { background: '#27272a', backdropFilter: 'blur(12px)' },
};
const ACCENT_STYLES_LIGHT: Record<string, React.CSSProperties> = {
    dark:   { background: '#f1f1f1' },
    orange: { background: 'linear-gradient(135deg, #f97316, #dc2626)' },
    glass:  { background: '#e8e8e8' },
};

function useCardWallReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.05 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return { ref, visible };
}

// uniform height — harmony through color/content, not size
const CARD_ROW_H = Array(8).fill('h-[280px]');

const BentoCard: React.FC<{ card: CardDef; de: boolean; visible: boolean; delay: number; className?: string }> = ({ card, de, visible, delay, className }) => {
    const isDark = document.documentElement.classList.contains('dark');
    const ACCENT = isDark ? ACCENT_STYLES_DARK : ACCENT_STYLES_LIGHT;
    const isOrange = card.accent === 'orange';
    const textMuted = isOrange ? 'text-white/60' : isDark ? 'text-zinc-400' : 'text-zinc-500';
    const textMain = isOrange || (card.accent === 'glass' && isDark) ? 'text-white' : isDark ? 'text-white' : 'text-zinc-900';

    return (
        <div
            className={`rounded-3xl relative overflow-hidden cursor-default group ${className}`}
            style={{
                ...ACCENT[card.accent],
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
                transition: `opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)`,
                transitionDelay: `${delay}ms`,
            }}
        >
            {card.type === 'usp' && card.img ? (
                <div className="relative w-full h-full overflow-hidden">
                    <img src={card.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10">
                        <h3 className="text-xl sm:text-2xl font-kumbh font-bold tracking-tight text-white leading-tight">
                            {de ? card.de : card.en}
                        </h3>
                        {(de ? card.sub_de : card.sub_en) && (
                            <p className="text-sm text-white/60 mt-2 max-w-[240px]">
                                {de ? card.sub_de : card.sub_en}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4 p-6 sm:p-8 h-full relative z-10">
                    {card.icon && <div className="mb-2 shrink-0">{card.icon}</div>}
                    <div className="mt-auto">
                        <h3 className={`text-xl sm:text-2xl font-kumbh font-bold tracking-tight leading-tight ${textMain}`}>
                            {de ? card.de : card.en}
                        </h3>
                        {(de ? card.sub_de : card.sub_en) && (
                            <p className={`text-sm leading-relaxed mt-2 ${textMuted}`}>
                                {de ? card.sub_de : card.sub_en}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── MARQUEE TILE ─────────────────────────────────────────────
const MARQUEE_BG: Record<string, string> = {
    dark:   'bg-zinc-100 dark:bg-[#1c1c1e]',
    glass:  'bg-zinc-200 dark:bg-[#27272a]',
    orange: '',
};

const MarqueeCard: React.FC<{ card: CardDef; de: boolean; h: number; w?: number }> = ({ card, de, h, w }) => {
    const width = w ?? (card.img ? 400 : 280);
    const isOrange = card.accent === 'orange';
    const bgStyle = isOrange ? ACCENT_STYLES_DARK.orange : undefined;
    return (
        <div style={{ width, height: h, flexShrink: 0, ...bgStyle }}
             className={`rounded-2xl relative overflow-hidden group cursor-default ${!isOrange ? MARQUEE_BG[card.accent] : ''}`}>
            {card.img ? (
                <>
                    <img src={card.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                        <h3 className="text-2xl font-kumbh font-bold tracking-tight text-white leading-tight">{de ? card.de : card.en}</h3>
                    </div>
                </>
            ) : (
                <div className="flex flex-col gap-4 p-6 h-full">
                    {card.icon && <div className="shrink-0 scale-150 origin-top-left mt-1 ml-1">{card.icon}</div>}
                    <div className="mt-auto">
                        <h3 className="text-2xl font-kumbh font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">{de ? card.de : card.en}</h3>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── MARQUEE: One Prompt Is Never Enough ──────────────────────
const FeatureMarquee: React.FC<{ de: boolean }> = ({ de }) => {
    const { ref, visible } = useCardWallReveal();
    const LINE1 = de ? 'ein prompt ist' : 'one prompt is';
    const LINE2 = de ? 'nie genug.'     : 'never enough.';
    const [shown, setShown] = useState(false);

    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => setShown(true), 80);
        return () => clearTimeout(t);
    }, [visible]);

    // Row 1 — tall, image-heavy (no orange)
    const ROW1 = [CARDS[1], CARDS[0], CARDS[3], CARDS[6], CARDS[8], CARDS[5], CARDS[11]];
    // Row 2 — shorter, mixed (no orange)
    const ROW2 = [CARDS[2], CARDS[10], CARDS[7], CARDS[3], CARDS[6], CARDS[11], CARDS[0]];

    return (
        <section className="bg-white dark:bg-zinc-950 py-24 sm:py-32 overflow-hidden">
            <style>{`
                @keyframes mq-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                .mq-row:hover { animation-play-state: paused; }
            `}</style>

            {/* Heading — 2 lines, massive */}
            <div ref={ref} className="px-5 sm:px-8 lg:px-12 mb-16 sm:mb-20">
                <div className="flex flex-col items-start gap-0 leading-[0.88]">
                    {[LINE1, LINE2].map((line, i) => (
                        <span key={i}
                            className="font-kumbh font-bold tracking-tighter text-zinc-900 dark:text-white lowercase block"
                            style={{
                                fontSize: 'clamp(3.5rem, 11vw, 11rem)',
                                opacity: shown ? 1 : 0,
                                transform: shown ? 'translateX(0)' : 'translateX(-24px)',
                                transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1)',
                                transitionDelay: `${i * 120}ms`,
                            }}>
                            {line}
                        </span>
                    ))}
                </div>
            </div>

            {/* Two marquee rows */}
            <div className="flex flex-col gap-3">
                {/* Row 1 — tall, slow */}
                <div className="mq-row" style={{ animation: 'mq-left 80s linear infinite', display: 'flex', gap: '14px', width: 'max-content' }}>
                    {[...ROW1, ...ROW1].map((card, i) => <MarqueeCard key={i} card={card} de={de} h={320} />)}
                </div>
                {/* Row 2 — shorter, slightly faster */}
                <div className="mq-row" style={{ animation: 'mq-left 60s linear infinite', display: 'flex', gap: '14px', width: 'max-content' }}>
                    {[...ROW2, ...ROW2].map((card, i) => <MarqueeCard key={i} card={card} de={de} h={240} />)}
                </div>
            </div>
        </section>
    );
};

const TESTIMONIALS = [
    {
        en: 'What used to take hours takes minutes.',
        de: 'Was früher Stunden dauerte, dauert jetzt Minuten.',
        author: 'Agentur Donnerkeil',
        role: 'Creative Agency',
    },
    {
        en: 'I direct the AI exactly where I want it.',
        de: 'Ich dirigiere die KI genau dorthin, wo ich sie haben will.',
        author: 'Sarah Chen',
        role: 'Interior Photographer',
    },
    {
        en: 'Variables alone saves our team hours every week.',
        de: 'Variables spart unserem Team täglich Stunden.',
        author: 'Marc Dubois',
        role: 'Creative Director',
    },
];

const TestimonialsWall: React.FC<{ de: boolean }> = ({ de }) => (
    <section className="w-full px-5 sm:px-10 lg:px-16 py-20 sm:py-28 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="w-full">
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-10 sm:mb-14">
                {de ? 'das sagen andere' : 'what people say'}
            </p>
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {TESTIMONIALS.map((t, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 py-7 sm:py-8">
                        <p className="text-2xl sm:text-3xl font-kumbh font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug max-w-xl">
                            "{de ? t.de : t.en}"
                        </p>
                        <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0 sm:pl-12">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.author}</span>
                            <span className="text-sm text-zinc-400 dark:text-zinc-500">{t.role}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// ── Section 1: Word reveal with growing image ─────────────
const HERO_WORDS = ['one', 'prompt', 'is', 'never', 'enough.'];
const HERO_WORD_IMGS = [
    '/home/v2/hero-new-1.png',  // Cozy Living Room — warm sunset
    '/home/v2/hero-new-2.png',  // Elegant Living Space — chandelier, editorial
    '/home/v2/hero-new-3.png',  // Tiny house — dramatic architecture
    '/home/v2/hero-new-4.png',  // Contemporary Pastel Oasis — colorful editorial
    '/home/v2/hero-new-5.png',  // Modern Minimalist — stark white + red painting
];

// scale of the image container per step (center-anchored, starts small → fills screen)
const IMG_SCALES  = [0.22, 0.42, 0.62, 0.82, 1.0];
const IMG_RADII   = ['28px', '20px', '12px', '4px', '0px'];

const HERO_USPS = [
    { icon: <MousePointer2    className="w-3.5 h-3.5" />, en: 'Draw on images',                    de: 'Aufs Bild zeichnen' },
    { icon: <Layers           className="w-3.5 h-3.5" />, en: '12 at once',                         de: '12 auf einmal' },
    { icon: <Mic              className="w-3.5 h-3.5" />, en: 'Voice control',                      de: 'Voice Control' },
    { icon: <SlidersHorizontal className="w-3.5 h-3.5" />, en: 'Brand presets',                    de: 'Brand Presets' },
    { icon: <Euro             className="w-3.5 h-3.5" />, en: 'From 0.05 €',                        de: 'Ab 0,05 €' },
    { icon: <Cpu              className="w-3.5 h-3.5" />, en: "World's leading model",              de: 'Führendes Modell' },
    { icon: <Users            className="w-3.5 h-3.5" />, en: '104 creatives trust us',             de: '104 Kreative vertrauen uns' },
    { icon: <BadgeCheck       className="w-3.5 h-3.5" />, en: '5 € starter credits · no sub',      de: '5 € Startguthaben · kein Abo' },
];

// ── Enhanced Video Card with Hover-to-Play logic ────────────────
const PremiumVideoCard: React.FC<{
    src: string;
    label: string;
    sub: string;
    variant: 'cinematic' | 'editorial' | 'tech';
    index: number;
    de: boolean;
}> = ({ src, label }) => {
    const thumbRef = useRef<HTMLVideoElement>(null);
    const lbRef    = useRef<HTMLVideoElement>(null);
    const [open, setOpen] = useState(false);

    // Show last frame as thumbnail
    useEffect(() => {
        const v = thumbRef.current;
        if (!v) return;
        const onMeta = () => { v.currentTime = v.duration; };
        v.addEventListener('loadedmetadata', onMeta);
        return () => v.removeEventListener('loadedmetadata', onMeta);
    }, []);

    // Autoplay in lightbox when opened
    useEffect(() => {
        if (open) { lbRef.current?.play(); }
        else       { if (lbRef.current) { lbRef.current.pause(); lbRef.current.currentTime = 0; } }
    }, [open]);

    // ESC closes lightbox
    useEffect(() => {
        if (!open) return;
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [open]);

    return (
        <>
            {/* Thumbnail — click opens lightbox */}
            <div className="group relative flex-1 cursor-pointer" onClick={() => setOpen(true)}>
                <div className="relative rounded-3xl overflow-hidden bg-zinc-900 leading-[0]">
                    <video ref={thumbRef} src={src} muted playsInline
                        className="w-full h-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/50 transition-colors">
                            <svg className="w-6 h-6 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </div>
                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-10 bg-gradient-to-t from-black/40 to-transparent">
                        <span className="text-xs font-medium text-white/60 lowercase tracking-wide">{label}</span>
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md"
                     style={{ animation: 'lb-in 0.25s ease' }}
                     onClick={() => setOpen(false)}>
                    <style>{`@keyframes lb-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
                    <div className="relative w-full max-w-5xl mx-4 sm:mx-8"
                         style={{ animation: 'lb-scale 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                         onClick={e => e.stopPropagation()}>
                        <style>{`@keyframes lb-scale { from { transform: scale(0.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
                        <video ref={lbRef} src={src} controls muted playsInline
                            className="w-full rounded-2xl shadow-2xl" />
                        <button onClick={() => setOpen(false)}
                            className="absolute -top-11 right-0 text-white/50 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

const HeroScroll: React.FC<{ onGetStarted: () => void; onSignIn: () => void; user: any; de: boolean }> = ({ onGetStarted, onSignIn, user, de }) => {
    const [activeWord, setActiveWord] = useState(0);
    const N = HERO_WORDS.length;
    const done = activeWord >= N - 1;

    useEffect(() => {
        if (activeWord >= N - 1) return;
        const t = setTimeout(() => setActiveWord(w => w + 1), 500);
        return () => clearTimeout(t);
    }, [activeWord, N]);

    return (
        <section className="relative min-h-screen overflow-hidden flex items-center justify-center bg-zinc-950">

            {/* ── Growing image container (scale-anchored center) ── */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 0 }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    transform: `scale(${IMG_SCALES[activeWord] ?? 1})`,
                    borderRadius: IMG_RADII[activeWord] ?? '0px',
                    overflow: 'hidden',
                    transition: 'transform 0.55s cubic-bezier(0.22,1,0.36,1), border-radius 0.55s ease',
                }}>
                    {HERO_WORD_IMGS.map((src, i) => (
                        <img key={i} src={src} alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ opacity: activeWord === i ? 1 : 0, transition: 'opacity 0.1s ease' }}
                            loading={i === 0 ? 'eager' : 'lazy'} decoding="async"
                        />
                    ))}
                    {/* Minimal scrim — just enough for text legibility */}
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }} />
                </div>
            </div>

            {/* ── CENTER words ── */}
            <div className="relative z-10 flex flex-col items-center text-center select-none pointer-events-none">
                {HERO_WORDS.map((word, i) => (
                    <span key={i}
                        className="block font-kumbh font-bold tracking-tighter text-white leading-[0.88] lowercase"
                        style={{
                            fontSize: 'clamp(3rem, 11vw, 10rem)',
                            opacity: i <= activeWord ? 1 : 0,
                            transform: i <= activeWord ? 'translateY(0)' : 'translateY(18px)',
                            transition: 'opacity 0.38s ease, transform 0.38s cubic-bezier(0.22,1,0.36,1)',
                        }}
                    >
                        {word}
                    </span>
                ))}
            </div>

            {/* ── BOTTOM — CTA + mobile USPs + sign-in ── */}
            <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-5 pb-10 px-6">

                {/* CTA button */}
                <div style={{
                    opacity: done ? 1 : 0,
                    transform: done ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'opacity 0.55s ease, transform 0.55s ease',
                }}>
                    <Button variant="white" size="l" onClick={onGetStarted} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                        {de ? 'Kostenlos starten' : 'Get started free'}
                    </Button>
                </div>

                {/* Sign-in */}
                {!user && (
                    <div style={{ opacity: done ? 1 : 0, transition: 'opacity 0.55s ease 0.3s' }}>
                        <button onClick={onSignIn} className="text-xs text-white/30 hover:text-white/55 transition-colors">
                            {de ? 'Bereits Konto? Anmelden' : 'Already have an account? Sign in'}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};


// ── Section: Verb storytelling ────────────────────────────
const VERB_SCENES = [
    { verb: 'annotate',   img: '/home/v2/hero-new-2.png' },
    { verb: 'ask',        img: '/home/v2/hero-new-4.png' }, // Swapped from 1
    { verb: 'streamline', img: '/home/v2/hero-new-1.png' }, // Swapped from 4
    { verb: 'upscale',    img: '/home/v2/hero-new-3.png' },
    { verb: 'own',        img: '/home/v2/hero-new-6.png' },
];

// ── Slot machine chip for streamline scene ──
const SLOT_OPTIONS = [
    ['Japanisch',  'Klassisch',  'Bauernhof',  'Botanisch',  'Bauhaus'  ],
    ['Tageslicht', 'Abendlicht', 'Goldstunde', 'Bewölktes',  'Kunstlich'],
    ['Romantisch', 'Dramatisch', 'Gemütlich',  'Elegantes',  'Lebendig' ],
];
const SLOT_INTERVAL = 1600;
// SlotChip — same height as other chips, chevron inside, slot animation on change only
const SlotChip: React.FC<{ options: string[]; tick: number; delayMs: number }> = ({ options, tick, delayMs }) => {
    const len = options.length;
    const [curr, setCurr] = useState(0);
    const [next, setNext] = useState(1);
    const [phase, setPhase] = useState<'idle'|'out'|'in'>('idle');

    useEffect(() => {
        const incoming = (curr + 1) % len;
        const t1 = setTimeout(() => { setNext(incoming); setPhase('out'); }, delayMs);
        const t2 = setTimeout(() => { setCurr(incoming); setPhase('in'); }, delayMs + 180);
        const t3 = setTimeout(() => { setPhase('idle'); }, delayMs + 380);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [tick]); // eslint-disable-line

    const label = phase === 'in' ? options[next] : options[curr];
    const ty = phase === 'out' ? '-6px' : phase === 'in' ? '6px' : '0px';
    const op = phase === 'idle' ? 1 : 0;
    // Widest option — keeps container width stable regardless of current label
    const widest = options.reduce((a, b) => b.length > a.length ? b : a, '');

    return (
        <div className="flex items-center gap-2.5 bg-zinc-900/80 border border-white/10 rounded-xl px-5 py-3.5">
            <ChevronRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            {/* Fixed-width text area — spacer holds max width, label is absolute */}
            <div className="relative overflow-hidden">
                <span className="text-base text-white font-medium whitespace-nowrap invisible select-none block text-center px-1" aria-hidden>
                    {widest}
                </span>
                <span className="text-base text-white font-medium whitespace-nowrap absolute inset-0 flex items-center justify-center"
                      style={{ transform: `translateY(${ty})`, opacity: op, transition: 'transform 0.18s ease, opacity 0.18s ease' }}>
                    {label}
                </span>
            </div>
        </div>
    );
};

// Ask chip — text builds word by word
const AskChip: React.FC<{ isActive: boolean; de: boolean }> = ({ isActive, de }) => {
    const words = de
        ? ['"Welche', 'Farben', 'passen', 'am', 'besten?"']
        : ['"Which', 'colors', 'work', 'best', 'here?"'];
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!isActive) { setCount(0); return; }
        let n = 0;
        const t = setInterval(() => { n++; setCount(n); if (n >= words.length) clearInterval(t); }, 220);
        return () => clearInterval(t);
    }, [isActive]); // eslint-disable-line

    return (
        <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-3.5 whitespace-nowrap">
            <Mic className="w-5 h-5 text-white/45 shrink-0" />
            <span className="text-base text-white/65">
                {words.slice(0, count).join(' ')}
                {count < words.length && <span className="inline-block w-px h-3.5 bg-white/40 ml-0.5 animate-pulse align-middle" />}
            </span>
        </div>
    );
};

const VerbSection: React.FC<{ de: boolean; onGetStarted: () => void }> = ({ de, onGetStarted }) => {
    const [active, setActive] = useState(0);
    const [slotTick, setSlotTick] = useState(0);
    const prevActiveRef = useRef(0);
    const verbSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const rightSpanRef = useRef<HTMLSpanElement>(null);
    const N = VERB_SCENES.length;

    useEffect(() => {
        const t = setInterval(() => {
            setActive(a => {
                prevActiveRef.current = a;
                return (a + 1) % N;
            });
        }, 5000);
        return () => clearInterval(t);
    }, [N]);

    useEffect(() => {
        if (active !== 2) return;
        const t = setInterval(() => setSlotTick(n => n + 1), SLOT_INTERVAL);
        return () => clearInterval(t);
    }, [active]);

    // Perfectly Synchronized Magnetic Impact: Robust Cleanup
    useEffect(() => {
        const verbEl = verbSpanRefs.current[active];
        const rightEl = rightSpanRef.current;
        if (!verbEl || !rightEl) return;

        const duration = 480;
        const impactOffset = 10;
        const easing = 'cubic-bezier(0.19, 1, 0.22, 1)';

        // 1. Force Reset All: Cancel animations and revert styles
        verbSpanRefs.current.forEach((el, i) => {
            if (!el) return;
            el.getAnimations().forEach(anim => anim.cancel());
            
            if (i !== active) {
                el.style.opacity = '0';
                el.style.transform = 'translateX(-120px)';
            }
        });

        rightEl.getAnimations().forEach(anim => anim.cancel());
        rightEl.style.transform = 'translateX(0)';

        // 2. Animate the Active Verb
        const vAnim = verbEl.animate([
            { transform: 'translateX(-240px)', opacity: 0 },
            { transform: 'translateX(-60px)', opacity: 0, offset: 0.5 },
            { transform: `translateX(${impactOffset}px)`, opacity: 1, offset: 0.8 },
            { transform: 'translateX(0)', opacity: 1 }
        ], {
            duration: duration,
            easing: easing,
            fill: 'none' // Don't use forwards to avoid clashing with style
        });

        vAnim.onfinish = () => {
            verbEl.style.opacity = '1';
            verbEl.style.transform = 'translateX(0)';
        };

        // 3. Animate the Suffix
        const sAnim = rightEl.animate([
            { transform: 'translateX(0)' },
            { transform: `translateX(${impactOffset}px)`, offset: 0.8 },
            { transform: 'translateX(0)' }
        ], {
            duration: duration,
            easing: easing,
            fill: 'none'
        });

        sAnim.onfinish = () => {
            rightEl.style.transform = 'translateX(0)';
        };

        return () => {
            vAnim.cancel();
            sAnim.cancel();
        };
    }, [active]);


    // chip content per scene (null = no chip shown)
    const chips = [
        /* annotate — no chip */
        null,
        /* ask — word by word */
        <AskChip isActive={active === 1} de={de} />,
        /* streamline — slot machine, chevron inside each chip */
        <div className="flex items-center gap-2">
            {SLOT_OPTIONS.map((opts, i) => (
                <SlotChip key={i} options={opts} tick={slotTick} delayMs={i * 110} />
            ))}
        </div>,
        /* upscale — no icon, just 1K → 4K + bar */
        <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-3.5 whitespace-nowrap">
            <span className="text-base text-white/40">1K</span>
            <ArrowRight className="w-4 h-4 text-white/25 shrink-0" />
            <span className="text-base text-white font-semibold tracking-wide">4 K</span>
            <div className="w-20 h-0.5 bg-white/10 rounded-full overflow-hidden ml-1">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: active === 3 ? '100%' : '0%', transition: 'width 2.4s ease' }} />
            </div>
        </div>,
        /* own — no chip */
        null,
    ];

    return (
        <section className="relative overflow-hidden bg-white dark:bg-zinc-950 flex flex-col" style={{ height: '100svh' }}>

            {/* ── Image area: sixths 2–4 (top:16.67%, height:50%) ── */}
            <div className="absolute left-0 right-0 flex items-center justify-center" style={{ top: '16.67%', height: '50%', zIndex: 0 }}>
                {VERB_SCENES.map((s, i) => {
                    const isActive = active === i;
                    const isPrev   = prevActiveRef.current === i && !isActive;
                    const xOffset  = isActive ? 0 : isPrev ? -120 : 120;
                    const scale    = isActive ? 1 : 0.92;
                    const snappyImageEase = 'cubic-bezier(0.17, 0.84, 0.44, 1)';

                    return (
                        <div key={i} className="absolute rounded-2xl overflow-hidden"
                            style={{
                                width: '78%', height: '100%',
                                opacity: isActive ? 1 : 0,
                                transform: `translateX(${xOffset}px) scale(${scale})`,
                                transition: isActive
                                    ? `opacity 0.6s ease 0.1s, transform 0.85s ${snappyImageEase} 0.1s`
                                    : 'opacity 0.4s ease, transform 0.65s ease-in',
                            }}>
                            <img src={s.img} alt="" className="w-full h-full object-cover" loading="lazy"
                                style={i === 3 ? {
                                    filter: active === 3 ? 'blur(0px)' : 'blur(22px)',
                                    transition: active === 3 ? 'filter 2s ease 0.1s' : 'none',
                                } : i === 4 ? {
                                    transform: active === 4 ? 'scale(1)' : 'scale(1.08)',
                                    transition: 'transform 8s cubic-bezier(0.25,0.46,0.45,0.94)',
                                } : undefined}
                            />
                            <div className="absolute inset-0 bg-black/24" />
                        </div>
                    );
                })}
            </div>

            {/* ── Annotate scribbles ── */}
            <svg
                viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 5, opacity: active === 0 ? 1 : 0, transition: 'opacity 0.6s ease' }}
            >
                {/* ── Circle highlight — upper-left area of the image ── */}
                {/* Original: 507×487, scaled 0.44 → ~223×214 */}
                <g transform="translate(155, 185) scale(0.44, 0.44)">
                    <path
                        d="M1 227.453C11.501 121.453 78.9989 21.4536 213.499 2.95358C347.999 -15.5464 523.499 98.9538 504.457 278.547C485.414 458.141 353.921 507.02 230.999 476.953C108.077 446.887 24.9739 321.216 65.6044 161.469"
                        fill="none"
                        stroke="rgba(249,115,22,1)"
                        strokeWidth="6.5"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="1700"
                        strokeDashoffset={active === 0 ? 0 : 1700}
                        style={{ transition: 'stroke-dashoffset 0.95s cubic-bezier(0.4,0,0.2,1) 0s' }}
                    />
                </g>

                {/* ── Arrow — center of image ── */}
                {/* Original: 650×218, scaled 0.58 → ~377×126 */}
                <g transform="translate(480, 390) scale(0.58, 0.58)">
                    {/* Main diagonal stroke */}
                    <path
                        d="M56.9023 176.427C63.6897 174.425 70.477 172.423 159.23 150.451C247.984 128.479 418.498 86.5974 597.958 42.9766"
                        fill="none"
                        stroke="rgba(249,115,22,1)"
                        strokeWidth="6.5"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="700"
                        strokeDashoffset={active === 0 ? 0 : 700}
                        style={{ transition: 'stroke-dashoffset 0.65s cubic-bezier(0.4,0,0.2,1) 0.75s' }}
                    />
                    {/* Arrowhead bottom-left */}
                    <path
                        d="M82.0383 112.444C81.9183 112.434 81.7983 112.425 68.9504 126.174C56.1024 139.924 30.5302 167.433 16.078 183.876C1.62586 200.318 -0.931247 204.861 2.16748 206.745C5.26621 208.628 14.0983 207.713 34.5412 208.309C54.984 208.905 86.7701 211.038 121.214 213.836"
                        fill="none"
                        stroke="rgba(249,115,22,0.95)"
                        strokeWidth="6.5"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="280"
                        strokeDashoffset={active === 0 ? 0 : 280}
                        style={{ transition: 'stroke-dashoffset 0.38s cubic-bezier(0.4,0,0.2,1) 1.28s' }}
                    />
                    {/* Arrowhead top-right */}
                    <path
                        d="M567.805 104.591C567.925 104.6 568.045 104.61 580.893 90.8605C593.741 77.1109 619.314 49.6019 633.766 33.1591C648.218 16.7163 650.775 12.1732 647.676 10.2901C644.578 8.40697 635.745 9.32137 615.303 8.72568C594.86 8.12998 563.074 5.9965 528.63 3.19845"
                        fill="none"
                        stroke="rgba(249,115,22,0.95)"
                        strokeWidth="6.5"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="280"
                        strokeDashoffset={active === 0 ? 0 : 280}
                        style={{ transition: 'stroke-dashoffset 0.38s cubic-bezier(0.4,0,0.2,1) 1.38s' }}
                    />
                </g>

                {/* ── Scribble — lower-right of image ── */}
                {/* Original: 519×349, scaled 0.50 → ~260×175 */}
                <g transform="translate(940, 545) scale(0.50, 0.50)">
                    <path
                        d="M1 223.9C1 224.053 1 224.205 15.1792 189.673C29.3584 155.14 57.7169 85.918 76.8559 44.8579C95.995 3.79786 105.055 -7.00251 108.629 6.513C112.202 20.0285 110.013 58.1871 98.0596 139.023C86.1057 219.859 64.4526 342.216 72.1269 347.804C79.8011 353.392 117.459 238.503 141.365 169.909C165.272 101.315 174.286 82.4976 183 67.2496C191.713 52.0016 199.852 40.8938 204.109 38.8611C208.366 36.8283 208.493 44.2073 202.456 87.6164C196.419 131.026 184.215 210.241 177.927 256.236C171.64 302.23 171.64 312.602 205.232 268.948C238.825 225.294 306.01 127.3 343.366 74.6997C380.721 22.0998 386.212 17.8637 389.196 17.5381C393.52 17.0662 392.812 34.0458 390.093 70.8513C388.055 98.4467 373.948 260.493 371.149 288.32C368.35 316.147 368.354 324.98 369.83 328.403C371.306 331.827 374.253 329.575 393.375 303.382C412.498 277.19 447.706 227.124 471.23 195.307C494.754 163.491 505.527 151.439 517.012 139.023"
                        fill="none"
                        stroke="rgba(249,115,22,1)"
                        strokeWidth="6.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="2200"
                        strokeDashoffset={active === 0 ? 0 : 2200}
                        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1) 1.0s' }}
                    />
                </g>
            </svg>

            {/* ── Say: waveform overlay — swap between NaturalWaveform and BarWaveform ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 5, opacity: active === 1 ? 1 : 0, transition: 'opacity 0.6s ease' }}
            >
                {/* Option A: sine wave */ /* <NaturalWaveform isActive={active === 1} /> */}
                {/* Option B: bar equalizer */}
                <BarWaveform isActive={active === 1} />
            </div>


            {/* ── Flow: 6 sixths ── */}
            {/* 1st sixth — nav spacer */}
            <div style={{ height: '16.67%', flexShrink: 0 }} />
            {/* 2nd sixth — blank (over image top) */}
            <div style={{ height: '16.67%', flexShrink: 0 }} />
            {/* 3rd sixth — typography, centered here */}
            <div className="relative z-10 flex flex-col items-center text-center select-none px-6 gap-8" style={{ height: '16.67%', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                {/* One line: [verb] your image. — whole sentence recenters on verb change */}
                <div className="relative flex items-baseline justify-center" style={{ fontSize: 'clamp(3rem, 10vw, 11rem)', lineHeight: 1, gap: '0.22em' }}>
                    {/* Each verb sits absolute over each other; active one has full opacity.
                        The visible verb drives the natural width of this flex row. */}
                    <div className="relative">
                        {/* Invisible spacer — always the active verb width so the row sizes correctly */}
                        <span className="font-kumbh font-bold tracking-tighter lowercase whitespace-nowrap invisible" aria-hidden>
                            {VERB_SCENES[active].verb}
                        </span>
                        {/* All verbs stacked absolutely, fade in/out */}
                        {VERB_SCENES.map((s, i) => (
                            <span key={i}
                                ref={el => { verbSpanRefs.current[i] = el; }}
                                className="font-kumbh font-bold tracking-tighter text-white lowercase whitespace-nowrap absolute inset-0 flex items-center justify-center"
                                style={{ opacity: 0, transform: 'translateX(-28px)', textShadow: '0 2px 40px rgba(0,0,0,0.33), 0 0 80px rgba(0,0,0,0.18)' }}
                            >
                                {s.verb}
                            </span>
                        ))}
                    </div>
                    <span ref={rightSpanRef} className="font-kumbh font-bold tracking-tighter text-white lowercase whitespace-nowrap" style={{ textShadow: '0 2px 40px rgba(0,0,0,0.33), 0 0 80px rgba(0,0,0,0.18)' }}>
                        your image.
                    </span>
                </div>

                {/* Chip — always below text, fades between scenes */}
                <div className="relative h-14 flex items-center justify-center" style={{ minWidth: '300px' }}>
                    {chips.map((chip, i) => (
                        <div key={i} className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            style={{ opacity: active === i ? 1 : 0, transition: 'opacity 0.4s ease' }}>
                            {chip}
                        </div>
                    ))}
                </div>
            </div>{/* end 3rd sixth */}

            {/* 4th sixth — blank (over image bottom) */}
            <div style={{ height: '16.67%', flexShrink: 0 }} />

            {/* 5th + 6th sixths — CTA */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 px-0" style={{ height: '33.33%', flexShrink: 0, width: '78%', alignSelf: 'center' }}>
                <div className="flex flex-col gap-3 text-center sm:text-left">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                        {de
                            ? 'exposé verwandelt jeden Raum in professionelle Fotos. Mit KI, in Sekunden.'
                            : 'exposé turns any room into professional listing photos. With AI, in seconds.'}
                    </p>
                    <ul className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-6">
                        {[
                            de ? 'Kein Abo' : 'No subscription',
                            de ? '5 € Startguthaben' : '€5 starter credits',
                            de ? '4 K max. Auflösung' : '4K max resolution',
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                                <span className="w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <Button variant="primary" size="l" onClick={onGetStarted} icon={<ArrowRight className="w-5 h-5" />} iconPosition="right">
                    {de ? 'Kostenlos starten' : 'Get started free'}
                </Button>
            </div>
        </section>
    );
};

// ── Page ──────────────────────────────────────────────────
export const AboutV2Page: React.FC<AboutV2PageProps> = ({
    user, userProfile, credits, t, lang, onSignIn, onGetStarted,
}) => {
    const de = lang === 'de';

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-orange-500 selection:text-white">

            {/* ── 1. VERB STORYTELLING — new hero ── */}
            <VerbSection de={de} onGetStarted={onGetStarted} />


            {/* ── 3. FEATURE MARQUEE ── */}
            <FeatureMarquee de={de} />

            {/* ── 4. VIDEO DEMOS ── */}
            <section className="bg-white dark:bg-zinc-950 px-6 sm:px-10 lg:px-16 py-28 sm:py-36 border-t border-zinc-100 dark:border-zinc-800/60">
                <div className="max-w-7xl mx-auto flex flex-col gap-14 sm:gap-20">
                    <div className="flex flex-col gap-4">
                        <h2 className="font-kumbh font-bold tracking-tighter text-zinc-900 dark:text-white lowercase leading-[0.85] text-5xl sm:text-7xl lg:text-8xl">
                            {de ? 'sieh es in' : 'see it in'}<br />{de ? 'aktion.' : 'action.'}
                        </h2>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">
                        <PremiumVideoCard
                            variant="cinematic" index={0} de={de}
                            src="/home/v2/demo-batch.mp4"
                            label={de ? 'Set-Bearbeitung' : 'One-Click Sets'}
                            sub={de ? 'Bearbeite hunderte Bilder gleichzeitig mit nur einem Prompt. Parallelität ohne Kompromisse.' : 'Apply your creative vision to entire sets in a single click. Seamless parallel editing.'}
                        />
                        <PremiumVideoCard
                            variant="cinematic" index={1} de={de}
                            src="/home/v2/demo.mp4"
                            label={de ? 'Anmerkungen' : 'Visual Annotations'}
                            sub={de ? 'Präzise Kontrolle durch Markierungen und Variablen. Direkte Manipulation auf Pixelebene.' : 'Circle details, draw paths, and direct the AI with surgical precision on every frame.'}
                        />
                    </div>
                </div>
            </section>

            {/* ── 5. TESTIMONIALS ── */}
            <TestimonialsWall de={de} />

            {/* ── 5. STATS ── */}
            <section className="min-h-[40vh] flex items-center justify-center px-5 sm:px-10 border-t border-zinc-100 dark:border-zinc-800/60">
                <div className="w-full max-w-4xl flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800">
                    {[
                        { value: '1,643', label: de ? 'Bilder generiert' : 'images generated' },
                        { value: '104',   label: de ? 'Kreative' : 'designers & creatives' },
                        { value: '4 K',   label: de ? 'Max. Auflösung' : 'max resolution' },
                    ].map((s, i) => (
                        <div key={i} className="flex flex-col gap-2 py-10 sm:py-0 sm:px-16 first:pl-0 last:pr-0">
                            <span className="text-5xl sm:text-6xl font-kumbh font-semibold tracking-tight">{s.value}</span>
                            <span className="text-sm text-zinc-400 dark:text-zinc-500">{s.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 6. PRICING ── */}
            <section className="w-full px-5 sm:px-8 py-20 sm:py-28 bg-zinc-950 border-t border-zinc-800/60">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                    {/* Left */}
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-zinc-500">pricing</p>
                        <h2 className="text-4xl sm:text-5xl font-kumbh font-semibold tracking-tight text-white leading-[1.1]">
                            {de ? <>Zahle nur für<br />das, was du nutzt.</> : <>Pay only for<br />what you use.</>}
                        </h2>
                        <p className="text-zinc-500 text-sm leading-relaxed mt-1">
                            {de ? 'Kein Abo. 5 € Startguthaben bei Registrierung.' : 'No subscription. 5 € starter credits on sign-up.'}
                        </p>
                    </div>
                    {/* Right — tiers */}
                    <div className="flex flex-col divide-y divide-zinc-800/60">
                        {([
                            { res: '0.5 K', price: '0.05 €', label: de ? 'Schneller Entwurf' : 'Quick draft' },
                            { res: '1 K',   price: '0.10 €', label: de ? 'Standard'          : 'Standard'    },
                            { res: '2 K',   price: '0.20 €', label: de ? 'Hohe Qualität'     : 'High quality' },
                            { res: '4 K',   price: '0.40 €', label: de ? 'Volle Auflösung'   : 'Full resolution' },
                        ] as { res: string; price: string; label: string }[]).map((tier, i) => (
                            <div key={i} className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-5">
                                    <span className="font-kumbh font-semibold text-white w-10">{tier.res}</span>
                                    <span className="text-sm text-zinc-500">{tier.label}</span>
                                </div>
                                <span className="text-sm font-medium text-zinc-100 tabular-nums">{tier.price}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 7. FINAL MANIFESTO ── */}
            <section className="bg-zinc-950 px-6 sm:px-10 lg:px-16 py-48 sm:py-64 relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/10 blur-[160px] pointer-events-none" />

                <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-24 relative z-10">
                    
                    {/* The 3 Pillars of Mastery */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 w-full mb-12 border-b border-white/5 pb-24">
                        <div className="flex flex-col gap-4">
                            <span className="text-sm font-mono text-orange-500 tracking-widest uppercase opacity-60">Pillar 01 // The Craft</span>
                            <h4 className="text-2xl font-kumbh font-bold text-white lowercase">compositional harmony.</h4>
                            <p className="text-sm text-zinc-500 leading-relaxed max-w-[240px] mx-auto">
                                {de ? 'Goldener Schnitt, Rule of Thirds und visuelle Balance auf Pixelebene.' : 'Rule of thirds, golden ratio, and pixel-perfect visual balance.'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <span className="text-sm font-mono text-orange-500 tracking-widest uppercase opacity-60">Pillar 02 // The Technical</span>
                            <h4 className="text-2xl font-kumbh font-bold text-white lowercase">physical precision.</h4>
                            <p className="text-sm text-zinc-500 leading-relaxed max-w-[240px] mx-auto">
                                {de ? 'Physikalische Lichtsimulation, Materialität und optische Korrektheit.' : 'Physical light simulation, materiality, and optical accuracy.'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <span className="text-sm font-mono text-orange-500 tracking-widest uppercase opacity-60">Pillar 03 // The Soul</span>
                            <h4 className="text-2xl font-kumbh font-bold text-white lowercase">aesthetic narrative.</h4>
                            <p className="text-sm text-zinc-500 leading-relaxed max-w-[240px] mx-auto">
                                {de ? 'Atmosphäre, Mood und das unbegreifliche Gefühl echter Ästhetik.' : 'Atmosphere, mood, and the intangible soul of true aesthetics.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-12 max-w-4xl">
                        <h2 className="font-kumbh font-bold tracking-tighter text-white lowercase text-5xl sm:text-7xl lg:text-[6.5rem] leading-[0.9]">
                            {de ? (
                                <>ki beherrscht <span className="text-orange-500">optik, physik, komposition und charakter</span> auf einem level, das bisher elite-studios vorbehalten war.</>
                            ) : (
                                <>ai masters <span className="text-orange-500">looks, physics, compositions, and character</span> at a level once reserved for elite studios.</>
                            )}
                        </h2>
                        <p className="text-xl sm:text-3xl text-zinc-400 font-medium leading-relaxed">
                            {de 
                                ? "Diese Macht liegt nun in deinen Händen. Übertreffe den professionellen Standard."
                                : "This power is now yours to command. Surpass the professional standard."
                            }
                        </p>
                        <p className="text-2xl sm:text-4xl text-white font-bold tracking-tight">
                            {de 
                                ? "Alles, was du brauchst, liegt direkt in deinen Fingerspitzen."
                                : "Everything you need is at your fingertips."
                            }
                        </p>
                    </div>

                    <div className="mt-10">
                        <Button variant="white" size="l" onClick={onGetStarted} icon={<ArrowRight className="w-5 h-5" />} iconPosition="right">
                            {de ? 'Kostenlos starten' : 'Get started free'}
                        </Button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <GlobalFooter t={t} />
        </div>
    );
};
