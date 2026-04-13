import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Layers, Mic, Zap, SlidersHorizontal, Euro, Cpu, Clock, Palette, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/DesignSystem';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { BarWaveform } from './BarWaveform';
import { Logo } from '@/components/ui/Logo';

interface AboutV2PageProps {
    user: any;
    userProfile: any;
    credits: number | null;
    t: (key: any) => string;
    lang: string;
    onSignIn: () => void;
    onGetStarted: () => void;
}

// ── Card definitions ──────────────────────────────────────
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
        icon: <SlidersHorizontal className="w-6 h-6 text-zinc-400" />,
        en: 'Set it once.', de: 'Einmal aufsetzen.',
        sub_en: 'Presets keep every output on-brand.', sub_de: 'Presets halten jedes Bild on-brand.',
    },
    {
        type: 'usp', accent: 'orange',
        icon: <Euro className="w-6 h-6 text-white/80" />,
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
        icon: <Cpu className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />,
        en: "World's leading model.", de: 'Führendes Modell.',
        sub_en: 'Powered by AI.', sub_de: 'Angetrieben von neuester KI.',
    },
    {
        type: 'usp', accent: 'dark',
        icon: <Clock className="w-6 h-6 text-zinc-400" />,
        en: 'Unlimited history.', de: 'Unendlicher Verlauf.',
        sub_en: 'Never lose a good prompt again.', sub_de: 'Verliere nie wieder einen guten Prompt.',
    },
    {
        type: 'usp', accent: 'orange',
        icon: <Zap className="w-6 h-6 text-white/80" />,
        en: 'In seconds.', de: 'In Sekunden.',
        sub_en: 'High-speed generation.', sub_de: 'High-Speed Generierung.',
    },
    {
        type: 'usp', accent: 'glass',
        img: '/home/v2/hero-new-3.png',
        en: 'Magic Wand.', de: 'Zauberstab.',
        sub_en: 'Let AI refine your words.', sub_de: 'Lass die KI deine Prompts veredeln.',
    },
    {
        type: 'usp', accent: 'dark',
        icon: <Palette className="w-6 h-6 text-zinc-400" />,
        en: 'Brand consistency.', de: 'Markentreue.',
        sub_en: 'Export assets that fit your style.', sub_de: 'Exportiere Bilder, die zu dir passen.',
    },
];

const CARD_BG: Record<string, string> = {
    dark:   'bg-zinc-100 dark:bg-[#1c1c1e]',
    glass:  'bg-zinc-200 dark:bg-[#27272a]',
    orange: '',
};
const ORANGE_GRADIENT: React.CSSProperties = {
    background: 'linear-gradient(135deg, #f97316, #dc2626)',
};

function useCardWallReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.05 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return { ref, visible };
}

// ── Marquee card ──────────────────────────────────────────
const MarqueeCard: React.FC<{ card: CardDef; de: boolean; h: number; w?: number }> = ({ card, de, h, w }) => {
    const isOrange = card.accent === 'orange';
    const width = w ?? ((card.type === 'usp' && card.img) ? 420 : 300);

    return (
        <div
            style={{ width, height: h, flexShrink: 0, ...(isOrange ? ORANGE_GRADIENT : {}) }}
            className={`rounded-2xl relative overflow-hidden ${!isOrange ? CARD_BG[card.accent] : ''}`}
        >
            {card.type === 'usp' && card.img ? (
                <>
                    <img src={card.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                        <h3 className="text-base font-kumbh font-bold tracking-tight text-white leading-tight">
                            {de ? card.de : card.en}
                        </h3>
                    </div>
                </>
            ) : (
                <div className="flex flex-col p-4 h-full">
                    {card.type === 'usp' && card.icon && <div className="mb-auto">{card.icon}</div>}
                    <div className="mt-auto">
                        <h3 className={`text-base font-kumbh font-bold tracking-tight leading-tight ${isOrange ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                            {de ? card.de : card.en}
                        </h3>
                        {card.type === 'usp' && (de ? card.sub_de : card.sub_en) && (
                            <p className={`text-xs leading-relaxed mt-1 ${isOrange ? 'text-white/60' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                {de ? card.sub_de : card.sub_en}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Feature Marquee ───────────────────────────────────────
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

    const ROW1 = [CARDS[1], CARDS[0], CARDS[3], CARDS[6], CARDS[8], CARDS[5], CARDS[11]];
    const ROW2 = [CARDS[2], CARDS[10], CARDS[7], CARDS[3], CARDS[6], CARDS[11], CARDS[0]];

    return (
        <section className="bg-white dark:bg-zinc-950 py-24 sm:py-32 overflow-hidden">
            <style>{`
                @keyframes mq-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                @media (hover: hover) { .mq-anim:hover { animation-play-state: paused; } }
                .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            <div ref={ref} className="px-5 sm:px-8 lg:px-12 mb-10 sm:mb-14">
                <div className="flex flex-col leading-[0.88]">
                    {[LINE1, LINE2].map((line, i) => (
                        <span key={i}
                            className="font-kumbh font-bold tracking-tighter text-zinc-900 dark:text-white lowercase block"
                            style={{
                                fontSize: 'clamp(2.5rem, 9vw, 9rem)',
                                opacity: shown ? 1 : 0,
                                transform: shown ? 'translateX(0)' : 'translateX(-16px)',
                                transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)',
                                transitionDelay: `${i * 100}ms`,
                            }}>
                            {line}
                        </span>
                    ))}
                </div>
            </div>

            {/* Always: 2 animated marquee rows */}
            <div className="flex flex-col gap-3">
                <div className="mq-anim" style={{ animation: 'mq-left 80s linear infinite', display: 'flex', gap: '10px', width: 'max-content' }}>
                    {[...ROW1, ...ROW1].map((card, i) => <MarqueeCard key={i} card={card} de={de} h={330} />)}
                </div>
                <div className="mq-anim" style={{ animation: 'mq-left 60s linear infinite', display: 'flex', gap: '10px', width: 'max-content' }}>
                    {[...ROW2, ...ROW2].map((card, i) => <MarqueeCard key={i} card={card} de={de} h={240} />)}
                </div>
            </div>
        </section>
    );
};

// ── Testimonials ──────────────────────────────────────────
const TESTIMONIALS = [
    {
        en: 'What used to take hours takes minutes.',
        de: 'Was früher Stunden dauerte, dauert jetzt Minuten.',
        author: 'Agentur Donnerkeil',
        role: 'Creative Agency',
        color: '#f97316',
    },
    {
        en: 'I direct the AI exactly where I want it.',
        de: 'Ich dirigiere die KI genau dorthin, wo ich sie haben will.',
        author: 'Sarah Chen',
        role: 'Interior Photographer',
        color: '#64748b',
    },
    {
        en: 'Variables alone saves our team hours every week.',
        de: 'Variables spart unserem Team täglich Stunden.',
        author: 'Marc Dubois',
        role: 'Creative Director',
        color: '#71717a',
    },
    {
        en: 'The annotation tool changed everything for us.',
        de: 'Das Annotationswerkzeug hat alles verändert.',
        author: 'Lena Strauss',
        role: 'Real Estate Agency',
        color: '#78716c',
    },
];

const Avatar: React.FC<{ name: string; color: string }> = ({ name, color }) => {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
             style={{ background: color }}>
            {initials}
        </div>
    );
};

const TestimonialsWall: React.FC<{ de: boolean }> = ({ de }) => (
    <section className="bg-white dark:bg-zinc-950 px-5 sm:px-8 lg:px-12 py-24 sm:py-32">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
            <p className="font-kumbh font-bold tracking-tighter text-zinc-900 dark:text-white lowercase leading-[0.88] text-4xl sm:text-5xl">
                {de ? 'das sagen andere.' : 'what people say.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TESTIMONIALS.map((item, i) => (
                    <div key={i} className="flex flex-col gap-5 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
                        <p className="text-base sm:text-lg font-kumbh font-medium text-zinc-900 dark:text-white leading-snug">
                            "{de ? item.de : item.en}"
                        </p>
                        <div className="flex items-center gap-3 mt-auto">
                            <Avatar name={item.author} color={item.color} />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.author}</span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">{item.role}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// ── Video card with lightbox ──────────────────────────────
const PremiumVideoCard: React.FC<{
    src: string;
    label: string;
    sub: string;
    variant?: string;
    index?: number;
    de?: boolean;
}> = ({ src, label, sub }) => {
    const thumbRef = useRef<HTMLVideoElement>(null);
    const lbRef    = useRef<HTMLVideoElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const v = thumbRef.current;
        if (!v) return;
        const onMeta = () => { v.currentTime = v.duration; };
        v.addEventListener('loadedmetadata', onMeta);
        return () => v.removeEventListener('loadedmetadata', onMeta);
    }, []);

    useEffect(() => {
        if (open) { lbRef.current?.play(); }
        else { if (lbRef.current) { lbRef.current.pause(); lbRef.current.currentTime = 0; } }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [open]);

    return (
        <div className="flex flex-col gap-4 flex-1">
            {/* Thumbnail */}
            <div className="group relative cursor-pointer" onClick={() => setOpen(true)}>
                <div className="relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 leading-[0]">
                    <video ref={thumbRef} src={src} muted playsInline
                        className="w-full h-auto object-contain group-hover:opacity-95 transition-opacity duration-300" />
                    {/* Dark overlay on thumbnail */}
                    <div className="absolute inset-0 bg-black/25" />
                    {/* Plain triangle play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white/55 group-hover:text-white/85 transition-colors drop-shadow-sm"
                             viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>
            </div>
            {/* Text below video */}
            <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
                {sub && <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">{sub}</p>}
            </div>

            {/* Lightbox */}
            {open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md"
                     style={{ animation: 'lb-in 0.25s ease' }}
                     onClick={() => setOpen(false)}>
                    <style>{`@keyframes lb-in { from { opacity: 0; } to { opacity: 1; } } @keyframes lb-scale { from { transform: scale(0.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
                    <div className="relative w-full max-w-5xl mx-4 sm:mx-8"
                         style={{ animation: 'lb-scale 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                         onClick={e => e.stopPropagation()}>
                        <video ref={lbRef} src={src} controls muted playsInline
                            className="w-full rounded-2xl shadow-2xl" />
                        <button onClick={() => setOpen(false)}
                            className="absolute -top-10 right-0 text-white/50 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom directional cursors for hero navigation
const CURSOR_PREV = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'%3E%3Ccircle cx='22' cy='22' r='20' fill='rgba(0%2C0%2C0%2C0.42)'/%3E%3Cpath d='M25 14 L16 22 L25 30' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E") 22 22, w-resize`;
const CURSOR_NEXT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'%3E%3Ccircle cx='22' cy='22' r='20' fill='rgba(0%2C0%2C0%2C0.42)'/%3E%3Cpath d='M19 14 L28 22 L19 30' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E") 22 22, e-resize`;

// ── VerbSection — hero ────────────────────────────────────
const VERB_SCENES = [
    { verb: 'annotate',   img: '/home/v2/hero-new-2.png' },
    { verb: 'ask',        img: '/home/v2/hero-new-4.png' },
    { verb: 'streamline', img: '/home/v2/hero-new-1.png' },
    { verb: 'upscale',    img: '/home/v2/hero-new-3.png' },
    { verb: 'own',        img: '/home/v2/hero-new-6.png' },
];

const SLOT_OPTIONS = [
    ['Japanisch',  'Klassisch',  'Bauernhof',  'Botanisch',  'Bauhaus'  ],
    ['Tageslicht', 'Abendlicht', 'Goldstunde', 'Bewölkt',    'Kunstlich'],
    ['Romantisch', 'Dramatisch', 'Gemütlich',  'Elegant',    'Lebendig' ],
];
const SLOT_INTERVAL = 1600;

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
    const ty    = phase === 'out' ? '-5px' : phase === 'in' ? '5px' : '0px';
    const op    = phase === 'idle' ? 1 : 0;
    const widest = options.reduce((a, b) => b.length > a.length ? b : a, '');

    return (
        <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 rounded-xl px-3.5 py-2.5">
            <ChevronRight className="w-3 h-3 text-orange-400 shrink-0" />
            <div className="relative overflow-hidden">
                <span className="text-xs text-white font-medium whitespace-nowrap invisible select-none block px-0.5" aria-hidden>{widest}</span>
                <span className="text-xs text-white font-medium whitespace-nowrap absolute inset-0 flex items-center justify-center"
                      style={{ transform: `translateY(${ty})`, opacity: op, transition: 'transform 0.18s ease, opacity 0.18s ease' }}>
                    {label}
                </span>
            </div>
        </div>
    );
};

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
        <div className="flex items-center gap-2.5 bg-zinc-900/80 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 whitespace-nowrap">
            <Mic className="w-3.5 h-3.5 text-white/45 shrink-0" />
            <span className="text-xs text-white/65">
                {words.slice(0, count).join(' ')}
                {count < words.length && <span className="inline-block w-px h-3 bg-white/40 ml-0.5 animate-pulse align-middle" />}
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
    const touchStartX  = useRef<number | null>(null);
    const N = VERB_SCENES.length;

    // Auto-advance
    useEffect(() => {
        const t = setInterval(() => {
            setActive(a => { prevActiveRef.current = a; return (a + 1) % N; });
        }, 5000);
        return () => clearInterval(t);
    }, [N]);

    // Slot tick for scene 2
    useEffect(() => {
        if (active !== 2) return;
        const t = setInterval(() => setSlotTick(n => n + 1), SLOT_INTERVAL);
        return () => clearInterval(t);
    }, [active]);

    // Magnetic verb animation
    useEffect(() => {
        const verbEl = verbSpanRefs.current[active];
        const rightEl = rightSpanRef.current;
        if (!verbEl || !rightEl) return;
        const easing = 'cubic-bezier(0.19, 1, 0.22, 1)';

        verbSpanRefs.current.forEach((el, i) => {
            if (!el) return;
            el.getAnimations().forEach(a => a.cancel());
            if (i !== active) { el.style.opacity = '0'; el.style.transform = 'translateX(-120px)'; }
        });
        rightEl.getAnimations().forEach(a => a.cancel());
        rightEl.style.transform = 'translateX(0)';

        const vAnim = verbEl.animate([
            { transform: 'translateX(-240px)', opacity: 0 },
            { transform: 'translateX(-60px)',  opacity: 0, offset: 0.5 },
            { transform: 'translateX(10px)',   opacity: 1, offset: 0.8 },
            { transform: 'translateX(0)',      opacity: 1 },
        ], { duration: 480, easing, fill: 'none' });
        vAnim.onfinish = () => { verbEl.style.opacity = '1'; verbEl.style.transform = 'translateX(0)'; };

        const sAnim = rightEl.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(10px)', offset: 0.8 },
            { transform: 'translateX(0)' },
        ], { duration: 480, easing, fill: 'none' });
        sAnim.onfinish = () => { rightEl.style.transform = 'translateX(0)'; };

        return () => { vAnim.cancel(); sAnim.cancel(); };
    }, [active]);

    const goToPrev = () => setActive(a => { prevActiveRef.current = a; return (a - 1 + N) % N; });
    const goToNext = () => setActive(a => { prevActiveRef.current = a; return (a + 1) % N; });

    const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd   = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 40) return;
        setActive(a => { prevActiveRef.current = a; return dx < 0 ? (a + 1) % N : (a - 1 + N) % N; });
    };

    const chips = [
        null,
        <AskChip isActive={active === 1} de={de} />,
        <div className="hidden sm:flex items-center gap-1.5">
            {SLOT_OPTIONS.map((opts, i) => (
                <SlotChip key={i} options={opts} tick={slotTick} delayMs={i * 110} />
            ))}
        </div>,
        <div className="flex items-center gap-2.5 bg-zinc-900/80 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 whitespace-nowrap">
            <span className="text-xs text-white/40">1K</span>
            <ArrowRight className="w-3 h-3 text-white/25 shrink-0" />
            <span className="text-xs text-white font-semibold tracking-wide">4 K</span>
            <div className="w-14 h-0.5 bg-white/10 rounded-full overflow-hidden ml-1">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: active === 3 ? '100%' : '0%', transition: 'width 2.4s ease' }} />
            </div>
        </div>,
        null,
    ];

    return (
        <section
            className="relative overflow-hidden bg-white dark:bg-zinc-950 flex flex-col"
            style={{ height: '100svh' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Image slides — flush with page grid (px-5 sm:px-8 lg:px-12) */}
            {VERB_SCENES.map((s, i) => {
                const isActive = active === i;
                const isPrev   = prevActiveRef.current === i && !isActive;
                const xOffset  = isActive ? 0 : isPrev ? -40 : 40;
                const scale    = isActive ? 1 : 0.96;

                return (
                    <div key={i}
                        className="absolute left-5 right-5 sm:left-8 sm:right-8 lg:left-12 lg:right-12 rounded-2xl overflow-hidden"
                        style={{
                            top: '16.67%', height: '50%', zIndex: 0,
                            opacity: isActive ? 1 : 0,
                            transform: `translateX(${xOffset}px) scale(${scale})`,
                            transition: isActive
                                ? 'opacity 0.6s ease 0.1s, transform 0.85s cubic-bezier(0.17,0.84,0.44,1) 0.1s'
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
                        <div className="absolute inset-0 bg-black/20" />
                    </div>
                );
            })}

            {/* Annotate SVG overlay */}
            <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 5, opacity: active === 0 ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                <g transform="translate(155, 185) scale(0.44, 0.44)">
                    <path d="M1 227.453C11.501 121.453 78.9989 21.4536 213.499 2.95358C347.999 -15.5464 523.499 98.9538 504.457 278.547C485.414 458.141 353.921 507.02 230.999 476.953C108.077 446.887 24.9739 321.216 65.6044 161.469"
                        fill="none" stroke="rgba(249,115,22,1)" strokeWidth="6.5" strokeLinecap="round"
                        vectorEffect="non-scaling-stroke" strokeDasharray="1700"
                        strokeDashoffset={active === 0 ? 0 : 1700}
                        style={{ transition: 'stroke-dashoffset 0.95s cubic-bezier(0.4,0,0.2,1) 0s' }} />
                </g>
                <g transform="translate(480, 390) scale(0.58, 0.58)">
                    <path d="M56.9023 176.427C63.6897 174.425 70.477 172.423 159.23 150.451C247.984 128.479 418.498 86.5974 597.958 42.9766"
                        fill="none" stroke="rgba(249,115,22,1)" strokeWidth="6.5" strokeLinecap="round"
                        vectorEffect="non-scaling-stroke" strokeDasharray="700"
                        strokeDashoffset={active === 0 ? 0 : 700}
                        style={{ transition: 'stroke-dashoffset 0.65s cubic-bezier(0.4,0,0.2,1) 0.75s' }} />
                    <path d="M82.0383 112.444C81.9183 112.434 81.7983 112.425 68.9504 126.174C56.1024 139.924 30.5302 167.433 16.078 183.876C1.62586 200.318 -0.931247 204.861 2.16748 206.745C5.26621 208.628 14.0983 207.713 34.5412 208.309C54.984 208.905 86.7701 211.038 121.214 213.836"
                        fill="none" stroke="rgba(249,115,22,0.95)" strokeWidth="6.5" strokeLinecap="round"
                        vectorEffect="non-scaling-stroke" strokeDasharray="280"
                        strokeDashoffset={active === 0 ? 0 : 280}
                        style={{ transition: 'stroke-dashoffset 0.38s cubic-bezier(0.4,0,0.2,1) 1.28s' }} />
                    <path d="M567.805 104.591C567.925 104.6 568.045 104.61 580.893 90.8605C593.741 77.1109 619.314 49.6019 633.766 33.1591C648.218 16.7163 650.775 12.1732 647.676 10.2901C644.578 8.40697 635.745 9.32137 615.303 8.72568C594.86 8.12998 563.074 5.9965 528.63 3.19845"
                        fill="none" stroke="rgba(249,115,22,0.95)" strokeWidth="6.5" strokeLinecap="round"
                        vectorEffect="non-scaling-stroke" strokeDasharray="280"
                        strokeDashoffset={active === 0 ? 0 : 280}
                        style={{ transition: 'stroke-dashoffset 0.38s cubic-bezier(0.4,0,0.2,1) 1.38s' }} />
                </g>
                <g transform="translate(940, 545) scale(0.50, 0.50)">
                    <path d="M1 223.9C1 224.053 1 224.205 15.1792 189.673C29.3584 155.14 57.7169 85.918 76.8559 44.8579C95.995 3.79786 105.055 -7.00251 108.629 6.513C112.202 20.0285 110.013 58.1871 98.0596 139.023C86.1057 219.859 64.4526 342.216 72.1269 347.804C79.8011 353.392 117.459 238.503 141.365 169.909C165.272 101.315 174.286 82.4976 183 67.2496C191.713 52.0016 199.852 40.8938 204.109 38.8611C208.366 36.8283 208.493 44.2073 202.456 87.6164C196.419 131.026 184.215 210.241 177.927 256.236C171.64 302.23 171.64 312.602 205.232 268.948C238.825 225.294 306.01 127.3 343.366 74.6997C380.721 22.0998 386.212 17.8637 389.196 17.5381C393.52 17.0662 392.812 34.0458 390.093 70.8513C388.055 98.4467 373.948 260.493 371.149 288.32C368.35 316.147 368.354 324.98 369.83 328.403C371.306 331.827 374.253 329.575 393.375 303.382C412.498 277.19 447.706 227.124 471.23 195.307C494.754 163.491 505.527 151.439 517.012 139.023"
                        fill="none" stroke="rgba(249,115,22,1)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke" strokeDasharray="2200"
                        strokeDashoffset={active === 0 ? 0 : 2200}
                        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1) 1.0s' }} />
                </g>
            </svg>

            {/* Waveform overlay (scene 1) */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 5, opacity: active === 1 ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                <BarWaveform isActive={active === 1} />
            </div>

            {/* Cursor click zones — desktop only, left=prev right=next */}
            <div className="absolute hidden sm:grid grid-cols-2"
                style={{ top: '16.67%', height: '50%', left: 0, right: 0, zIndex: 8 }}>
                <div style={{ cursor: CURSOR_PREV }} onClick={goToPrev} />
                <div style={{ cursor: CURSOR_NEXT }} onClick={goToNext} />
            </div>

            {/* 1st sixth — navbar spacer */}
            <div style={{ height: '16.67%', flexShrink: 0 }} />
            {/* 2nd sixth — blank */}
            <div style={{ height: '16.67%', flexShrink: 0 }} />
            {/* 3rd sixth — verb typography */}
            <div className="relative z-10 select-none" style={{ height: '16.67%', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 3%' }}>
                <div className="relative flex items-baseline justify-center"
                    style={{ fontSize: 'clamp(1.6rem, 6.5vw, 10rem)', lineHeight: 1, gap: '0.22em' }}>
                    <div className="relative">
                        <span className="font-kumbh font-bold tracking-tighter lowercase whitespace-nowrap invisible" aria-hidden>
                            {VERB_SCENES[active].verb}
                        </span>
                        {VERB_SCENES.map((s, i) => (
                            <span key={i}
                                ref={el => { verbSpanRefs.current[i] = el; }}
                                className="font-kumbh font-bold tracking-tighter text-white lowercase whitespace-nowrap absolute inset-0 flex items-center justify-center"
                                style={{ opacity: 0, transform: 'translateX(-28px)', textShadow: '0 2px 20px rgba(0,0,0,0.25)' }}>
                                {s.verb}
                            </span>
                        ))}
                    </div>
                    <span ref={rightSpanRef}
                        className="font-kumbh font-bold tracking-tighter text-white lowercase whitespace-nowrap"
                        style={{ textShadow: '0 2px 20px rgba(0,0,0,0.25)' }}>
                        your image.
                    </span>
                </div>

                {/* Chips — hidden on mobile */}
                <div className="hidden sm:flex relative h-10 items-center justify-center" style={{ minWidth: 260 }}>
                    {chips.map((chip, i) => (
                        <div key={i} className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            style={{ opacity: active === i ? 1 : 0, transition: 'opacity 0.4s ease' }}>
                            {chip}
                        </div>
                    ))}
                </div>
            </div>

            {/* 4th sixth — blank */}
            <div style={{ height: '16.67%', flexShrink: 0 }} />

            {/* 5th+6th — CTA, aligned with image edges */}
            <div className="relative z-10 px-5 sm:px-8 lg:px-12" style={{ height: '33.33%', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 max-w-6xl w-full">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
                            {de
                                ? 'exposé verwandelt jeden Raum in professionelle Fotos. Mit KI, in Sekunden.'
                                : 'exposé turns any space into professional listing photos. With AI, in seconds.'}
                        </p>
                        <ul className="flex flex-wrap gap-x-4 gap-y-1">
                            {[
                                de ? 'Kein Abo' : 'No subscription',
                                de ? '5 € Startguthaben' : '€5 starter credits',
                                de ? '4K Auflösung' : '4K resolution',
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                                    <span className="w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <Button variant="primary" size="m" onClick={onGetStarted} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                        {de ? 'Kostenlos starten' : 'Get started free'}
                    </Button>
                </div>
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

            {/* 1. HERO */}
            <VerbSection de={de} onGetStarted={onGetStarted} />

            {/* 2. FEATURE MARQUEE */}
            <FeatureMarquee de={de} />

            {/* 3. VIDEO DEMOS + STATS */}
            <section className="bg-white dark:bg-zinc-950 px-5 sm:px-8 lg:px-12 py-24 sm:py-32">
                <div className="max-w-6xl mx-auto flex flex-col gap-10 sm:gap-12">
                    <h2 className="font-kumbh font-bold tracking-tighter text-zinc-900 dark:text-white lowercase leading-[0.88] text-4xl sm:text-5xl lg:text-6xl">
                        {de ? 'sieh exposé in aktion.' : 'see exposé in action.'}
                    </h2>
                    {/* Stats row above videos */}
                    <div className="flex flex-row gap-0 divide-x divide-zinc-100 dark:divide-zinc-800/60">
                        {[
                            { value: '16,430', label: de ? 'Bilder generiert' : 'images generated' },
                            { value: '1,040',  label: de ? 'Kreative' : 'creatives' },
                            { value: '4 K',   label: de ? 'Max. Auflösung' : 'max resolution' },
                        ].map((s, i) => (
                            <div key={i} className="flex flex-col gap-0.5 px-5 sm:px-8 first:pl-0 last:pr-0">
                                <span className="text-2xl sm:text-3xl font-kumbh font-bold tracking-tight text-zinc-900 dark:text-white">{s.value}</span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">{s.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                        <PremiumVideoCard
                            src="/home/v2/demo-batch.mp4"
                            label={de ? 'Set-Bearbeitung' : 'One-Click Sets'}
                            sub={de
                                ? 'Bearbeite hunderte Bilder gleichzeitig mit nur einem Prompt.'
                                : 'Apply your creative vision to entire sets in a single click.'}
                        />
                        <PremiumVideoCard
                            src="/home/v2/demo.mp4"
                            label={de ? 'Anmerkungen' : 'Visual Annotations'}
                            sub={de
                                ? 'Dirigiere die KI mit Zeichnungen direkt auf dem Bild.'
                                : 'Circle details, draw paths, and direct the AI with precision.'}
                        />
                    </div>
                </div>
            </section>

            {/* 4. TESTIMONIALS */}
            <TestimonialsWall de={de} />

            {/* 6. PRICING */}
            <section className="bg-white dark:bg-zinc-950 px-5 sm:px-8 lg:px-12 py-24 sm:py-32">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                    <div className="flex flex-col gap-4">
                        <h2 className="font-kumbh font-bold tracking-tighter text-zinc-900 dark:text-white lowercase leading-[0.88] text-4xl sm:text-5xl lg:text-6xl">
                            {de ? <>nur zahlen<br />was du nutzt.</> : <>pay only for<br />what you use.</>}
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                            {de ? 'Kein Abo. 5 € Startguthaben bei Registrierung.' : 'No subscription. 5 € starter credits on sign-up.'}
                        </p>
                    </div>
                    <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                        {([
                            { res: '0.5 K', price: '0.05 €', label: de ? 'Schneller Entwurf' : 'Quick draft' },
                            { res: '1 K',   price: '0.10 €', label: de ? 'Standard'          : 'Standard'    },
                            { res: '2 K',   price: '0.20 €', label: de ? 'Hohe Qualität'     : 'High quality' },
                            { res: '4 K',   price: '0.40 €', label: de ? 'Volle Auflösung'   : 'Full resolution' },
                        ] as { res: string; price: string; label: string }[]).map((tier, i) => (
                            <div key={i} className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-5">
                                    <span className="font-kumbh font-semibold text-zinc-900 dark:text-white w-10 text-sm">{tier.res}</span>
                                    <span className="text-sm text-zinc-400 dark:text-zinc-500">{tier.label}</span>
                                </div>
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{tier.price}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7. MANIFESTO */}
            <div className="relative w-full overflow-hidden bg-zinc-50 dark:bg-zinc-100 px-5 sm:px-8 py-24 sm:py-32">
                <div className="absolute inset-0 overflow-hidden">
                    <img src="/home/v2/hero-new-5.png" className="absolute inset-0 w-full h-full object-cover scale-110"
                         style={{ filter: 'blur(48px)', opacity: 0.18 }} aria-hidden />
                </div>
                <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center gap-8">
                    <div className="flex flex-col gap-5 font-kumbh font-bold tracking-tighter lowercase leading-snug text-4xl sm:text-5xl lg:text-6xl">
                        <p className="text-zinc-900 dark:text-white">
                            {de
                                ? 'ki beherrscht licht, raum und charakter auf einem level, das bisher elite-studios vorbehalten war.'
                                : 'ai masters light, space, and character at a level once reserved for elite studios.'}
                        </p>
                        <p className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                            {de ? 'diese macht liegt nun in deinen händen.' : 'this power is now yours.'}
                        </p>
                        <p className="text-zinc-900 dark:text-white">
                            {de
                                ? <>übertreffe den professionellen standard. alles was du brauchst, liegt direkt in deinen fingerspitzen. <Logo className="inline-block w-[0.85em] h-[0.85em] align-middle" /></>
                                : <>surpass the professional standard. everything you need is at your fingertips. <Logo className="inline-block w-[0.85em] h-[0.85em] align-middle" /></>}
                        </p>
                    </div>
                    <Button variant="primary" size="l" onClick={onGetStarted} icon={<ChevronRight className="w-5 h-5" />} iconPosition="right">
                        {de ? 'exposé öffnen' : 'open exposé'}
                    </Button>
                </div>
            </div>

            {/* FOOTER */}
            <GlobalFooter t={t} />
        </div>
    );
};
