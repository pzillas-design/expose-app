import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
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

            {/* ── 2. HOOK ── */}
            <section className={`${snap} flex items-center justify-center bg-zinc-950 px-5 sm:px-10`}>
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
