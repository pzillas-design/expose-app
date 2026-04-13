import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Layers, Mic, Zap, SlidersHorizontal, MousePointer2, Euro } from 'lucide-react';
import { Button } from '@/components/ui/DesignSystem';
import { GlobalFooter } from '@/components/layout/GlobalFooter';

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
    | { type: 'usp';   accent: 'dark'|'orange'|'glass'; icon?: React.ReactNode; img?: string; en: string; de: string; sub_en: string; sub_de: string; }
    | { type: 'quote'; accent: 'dark'|'orange'|'glass'; en: string; de: string; author: string; role: string; };

const CARDS: CardDef[] = [
    {
        type: 'usp', accent: 'orange',
        icon: <MousePointer2 className="w-10 h-10 text-white/80" />,
        en: 'Direct the AI.', de: 'Dirigiere die KI.',
        sub_en: 'Draw on the image. Mark exactly where you want the change.', sub_de: 'Direkt aufs Bild zeichnen. Genau zeigen, wo die Änderung hin soll.',
    },
    {
        type: 'usp', accent: 'dark',
        img: '/home/v2/v2-a.png',
        en: 'Run 12 at once.', de: '12 auf einmal.',
        sub_en: 'Parallel generation — compare, pick, move on.', sub_de: 'Parallel generieren — vergleichen, auswählen, weitermachen.',
    },
    {
        type: 'quote', accent: 'glass',
        en: 'What used to take hours takes minutes.', de: 'Was früher Stunden dauerte, dauert jetzt Minuten.',
        author: 'Agentur Donnerkeil', role: 'Creative Agency',
    },
    {
        type: 'usp', accent: 'dark',
        icon: <SlidersHorizontal className="w-10 h-10 text-zinc-400" />,
        en: 'Set it once.', de: 'Einmal aufsetzen.',
        sub_en: 'Variables and presets keep every output on-brand.', sub_de: 'Variables und Presets halten jedes Bild on-brand.',
    },
    {
        type: 'usp', accent: 'orange',
        icon: <Euro className="w-10 h-10 text-white/80" />,
        en: 'Pay per image.', de: 'Pro Bild bezahlen.',
        sub_en: 'No subscription. Credits never expire. From 0.05 €.', sub_de: 'Kein Abo. Credits verfallen nicht. Ab 0,05 €.',
    },
    {
        type: 'quote', accent: 'dark',
        en: 'I direct the AI exactly where I want it.', de: 'Ich dirigiere die KI genau dorthin, wo ich sie haben will.',
        author: 'Sarah Chen', role: 'Interior Photographer',
    },
    {
        type: 'usp', accent: 'glass',
        icon: <Mic className="w-10 h-10 text-white/60" />,
        en: 'Voice control.', de: 'Voice Control.',
        sub_en: 'Describe what you see. The AI listens and acts.', sub_de: 'Beschreibe was du siehst. Die KI hört zu und handelt.',
    },
    {
        type: 'usp', accent: 'dark',
        img: '/home/v2/v2-b.png',
        en: '0.5 K → 4 K.', de: '0,5 K → 4 K.',
        sub_en: 'Draft fast. Export sharp.', sub_de: 'Schnell skizzieren. Scharf exportieren.',
    },
    {
        type: 'usp', accent: 'orange',
        icon: <Layers className="w-10 h-10 text-white/80" />,
        en: 'Stack & compare.', de: 'Stapeln & vergleichen.',
        sub_en: 'Layer versions on top of each other. The best wins.', sub_de: 'Versionen übereinanderlegen. Das Beste gewinnt.',
    },
    {
        type: 'quote', accent: 'glass',
        en: 'Variables alone saves our team hours every week.', de: 'Variables spart unserem Team täglich Stunden.',
        author: 'Marc Dubois', role: 'Creative Director',
    },
];

const ACCENT_STYLES: Record<string, React.CSSProperties> = {
    dark:   { background: 'linear-gradient(145deg, #27272a, #18181b)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 1px 0 rgba(255,255,255,0.07) inset, 0 24px 48px rgba(0,0,0,0.5)' },
    orange: { background: 'linear-gradient(145deg, #f97316, #ea580c, #c2410c)', border: '1px solid rgba(255,150,50,0.3)', boxShadow: '0 1px 0 rgba(255,200,100,0.25) inset, 0 24px 48px rgba(234,88,12,0.35)' },
    glass:  { background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 24px 48px rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' },
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

const CardWall: React.FC<{ de: boolean }> = ({ de }) => {
    const { ref, visible } = useCardWallReveal();
    return (
        <section className="py-24 px-5 sm:px-10 lg:px-16 bg-zinc-950 overflow-hidden">
            <div className="w-full max-w-6xl mx-auto">
                <p className="text-sm text-zinc-500 mb-10 sm:mb-14">why exposé</p>
                <div ref={ref} className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-5 [column-fill:_balance]">
                    {CARDS.map((card, i) => (
                        <div
                            key={i}
                            className="break-inside-avoid mb-4 sm:mb-5 rounded-3xl relative overflow-hidden group cursor-default"
                            style={{
                                ...ACCENT_STYLES[card.accent],
                                opacity: visible ? 1 : 0,
                                transform: visible ? 'translateY(0)' : 'translateY(28px)',
                                transition: `opacity 0.6s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1)`,
                                transitionDelay: `${i * 55}ms`,
                            }}
                        >
                            {/* Glossy top sheen */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-10" />
                            {/* Hover inner glow */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none z-10 rounded-3xl" />

                            {/* Image bg for img cards — text overlaid */}
                            {card.type === 'usp' && card.img && (
                                <div className="relative w-full aspect-[4/3] overflow-hidden">
                                    <img src={card.img} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-8 flex flex-col gap-2">
                                        <h3 className="text-3xl sm:text-4xl font-kumbh font-bold tracking-tight text-white leading-tight">
                                            {de ? card.de : card.en}
                                        </h3>
                                        <p className="text-sm text-white/60 leading-relaxed">
                                            {de ? card.sub_de : card.sub_en}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className={`flex flex-col gap-4 relative z-10 p-7 sm:p-8 ${card.type === 'usp' && card.img ? 'hidden' : ''}`}>
                                {/* Icon */}
                                {card.type === 'usp' && card.icon && !card.img && (
                                    <div className="mb-2">{card.icon}</div>
                                )}

                                {card.type === 'quote' ? (
                                    <>
                                        <p className="text-2xl sm:text-3xl font-kumbh font-semibold tracking-tight text-white leading-snug">
                                            "{de ? card.de : card.en}"
                                        </p>
                                        <div className="flex flex-col gap-0.5 pt-3 border-t border-white/10">
                                            <span className="text-sm font-medium text-white/70">{card.author}</span>
                                            <span className="text-xs text-white/30">{card.role}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className={`font-kumbh font-bold tracking-tight leading-tight text-white ${card.img ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'}`}>
                                            {de ? card.de : card.en}
                                        </h3>
                                        <p className={`text-sm leading-relaxed ${card.accent === 'orange' ? 'text-white/60' : card.accent === 'glass' ? 'text-white/50' : 'text-zinc-400'}`}>
                                            {de ? card.sub_de : card.sub_en}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const HERO_IMGS = [
    { src: '/home/v2/v2-hero-1.png', cls: 'col-span-2 row-span-2' },
    { src: '/home/v2/v2-hero-2.png', cls: 'col-span-1 row-span-1' },
    { src: '/home/v2/v2-hero-3.png', cls: 'col-span-1 row-span-1' },
    { src: '/home/v2/v2-hero-4.png', cls: 'col-span-1 row-span-1' },
    { src: '/home/v2/v2-hero-5.png', cls: 'col-span-1 row-span-1' },
];

const GRID_IMGS = ['/home/v2/v2-a.png', '/home/v2/v2-b.png', '/home/v2/v2-c.png', '/home/v2/v2-d.png'];

export const AboutV2Page: React.FC<AboutV2PageProps> = ({
    user, userProfile, credits, t, lang, onSignIn, onGetStarted,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [imgsIn, setImgsIn] = useState(false);
    const de = lang === 'de';

    useEffect(() => {
        const id = setTimeout(() => setImgsIn(true), 80);
        return () => clearTimeout(id);
    }, []);

    const snap = 'snap-start min-h-screen';

    return (
        <div
            ref={containerRef}
            className="h-screen overflow-y-scroll bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-orange-500 selection:text-white"
            style={{ scrollSnapType: 'y mandatory' }}
        >
            {/* ── 1. HERO ── */}
            <section className={`${snap} flex flex-col lg:flex-row items-center px-5 sm:px-10 lg:px-16 pt-24 pb-10 gap-8 lg:gap-12`}>
                {/* Text */}
                <div className="flex flex-col gap-6 lg:w-2/5 shrink-0">
                    <span className="text-sm text-orange-500 font-medium">exposé</span>
                    <h1 className="text-6xl sm:text-7xl xl:text-[5.5rem] font-kumbh font-bold tracking-tighter leading-[0.92] lowercase">
                        One prompt<br />is never<br />enough.
                    </h1>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                        {de
                            ? 'Iteriere visuell, starte Batches, verfeinere per Voice — alles in einem Workspace.'
                            : 'Iterate visually, run batches, refine with voice — all in one workspace.'}
                    </p>
                    <div className="flex items-center gap-5">
                        <Button variant="primary" size="l" onClick={onGetStarted} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                            {de ? 'Kostenlos starten' : 'Get started free'}
                        </Button>
                        {!user && (
                            <button onClick={onSignIn} className="text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                {de ? 'Anmelden' : 'Sign in'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Bento grid */}
                <div className="w-full lg:w-3/5 grid grid-cols-3 grid-rows-2 gap-2 sm:gap-3 h-[40vh] lg:h-[70vh]">
                    {HERO_IMGS.map((img, i) => (
                        <div
                            key={i}
                            className={`${img.cls} rounded-xl sm:rounded-2xl overflow-hidden`}
                            style={{
                                clipPath: imgsIn ? 'inset(0% 0% 0% 0% round 12px)' : 'inset(50% 0% 50% 0% round 12px)',
                                transition: `clip-path 0.55s cubic-bezier(0.22, 1, 0.36, 1)`,
                                transitionDelay: `${i * 40}ms`,
                            }}
                        >
                            <img src={img.src} alt="" className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 2b. CARD WALL ── */}
            <div className="snap-start">
                <CardWall de={de} />
            </div>

            {/* ── HOOK ── */}
            <section className={`${snap} flex items-center justify-center bg-zinc-950 px-5 sm:px-10 border-t border-white/5`}>
                <p className="max-w-3xl text-center text-4xl sm:text-6xl lg:text-7xl font-kumbh font-bold tracking-tighter leading-[1.05] text-white lowercase">
                    {de
                        ? <>"Ein Prompt. Ein Bild.<br /><span className="text-zinc-600">Das reicht nicht."</span></>
                        : <>"One prompt. One image.<br /><span className="text-zinc-600">That's not enough."</span></>
                    }
                </p>
            </section>

            {/* ── 3. PARALLEL GENERATION ── */}
            <section className={`${snap} flex flex-col justify-center px-5 sm:px-10 lg:px-16 py-16 gap-10`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {GRID_IMGS.map((src, i) => (
                        <div key={i} className="aspect-square sm:aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden">
                            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                    ))}
                </div>
                <div className="max-w-sm">
                    <h2 className="text-3xl sm:text-4xl font-kumbh font-bold tracking-tight leading-tight lowercase mb-2">
                        {t('home_section_iterative_title')}
                    </h2>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">
                        {t('home_section_iterative_desc')}
                    </p>
                </div>
            </section>

            {/* ── 4. VISUAL PROMPTING ── */}
            <section className={`${snap} flex flex-col lg:flex-row items-center px-5 sm:px-10 lg:px-16 py-16 gap-10 lg:gap-16`}>
                <div className="lg:w-2/5 flex flex-col gap-4">
                    <h2 className="text-4xl sm:text-5xl font-kumbh font-bold tracking-tight leading-tight lowercase">
                        {t('home_section_visual_title')}
                    </h2>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-xs">
                        {t('home_section_visual_desc')}
                    </p>
                </div>
                <div className="lg:w-3/5 grid grid-cols-2 gap-2 sm:gap-3 w-full">
                    {['/home/v2/v2-e.png', '/home/v2/v2-h.png'].map((src, i) => (
                        <div key={i} className="aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden">
                            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 5. PRESETS ── */}
            <section className={`${snap} flex flex-col justify-center px-5 sm:px-10 lg:px-16 py-16 gap-8`}>
                <div className="w-full aspect-[16/7] sm:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden">
                    <img src="/home/v2/v2-g.png" alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </div>
                <div className="max-w-sm">
                    <h2 className="text-3xl sm:text-4xl font-kumbh font-bold tracking-tight leading-tight lowercase mb-2">
                        {t('home_section_templates_title')}
                    </h2>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">
                        {t('home_section_templates_desc')}
                    </p>
                </div>
            </section>

            {/* ── 6. STATS ── */}
            <section className={`${snap} flex items-center justify-center px-5 sm:px-10`}>
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

            {/* ── 7. CTA ── */}
            <section className={`${snap} flex flex-col items-center justify-center bg-zinc-950 px-5 sm:px-10 text-center gap-6`}>
                <h2 className="text-6xl sm:text-8xl lg:text-9xl font-kumbh font-bold tracking-tighter leading-[0.9] lowercase text-white">
                    {de ? <>bereit für<br /><span className="text-orange-500">exposé?</span></> : <>ready for<br /><span className="text-orange-500">exposé?</span></>}
                </h2>
                <p className="text-sm text-zinc-500">
                    {de ? 'Kein Abo. 5 € Startguthaben.' : 'No subscription. 5 € starter credits.'}
                </p>
                <Button variant="white" size="l" onClick={onGetStarted} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                    {de ? 'Jetzt starten' : 'Get started'}
                </Button>
            </section>

            {/* ── FOOTER ── */}
            <div className="snap-start">
                <GlobalFooter t={t} />
            </div>
        </div>
    );
};
