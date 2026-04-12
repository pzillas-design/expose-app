import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/DesignSystem';
import { AppNavbar } from '@/components/layout/AppNavbar';
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

const HERO_IMAGES = [
    { src: '/home/1 creation reimagined/6.jpeg',  cls: 'col-span-2 row-span-2' },
    { src: '/home/1 creation reimagined/2.jpeg',  cls: 'col-span-1 row-span-1' },
    { src: '/home/1 creation reimagined/12.jpeg', cls: 'col-span-1 row-span-1' },
    { src: '/home/1 creation reimagined/3.jpeg',  cls: 'col-span-1 row-span-1' },
    { src: '/home/1 creation reimagined/8.jpeg',  cls: 'col-span-1 row-span-1' },
];

const PARALLEL_IMAGES = [
    '/home/2 iterativ/11.jpg',
    '/home/2 iterativ/12.jpg',
    '/home/2 iterativ/21.jpg',
    '/home/2 iterativ/22.jpg',
];

// Hook: section fades in once when 20% visible in the window
function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.15 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return { ref, visible };
}

export const AboutV2Page: React.FC<AboutV2PageProps> = ({
    user, userProfile, credits, t, lang, onSignIn, onGetStarted,
}) => {
    const [heroProgress, setHeroProgress] = useState(0);
    const de = lang === 'de';

    useEffect(() => {
        const onScroll = () => setHeroProgress(Math.min(window.scrollY / (window.innerHeight * 0.5), 1));
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const hook  = useReveal();
    const par   = useReveal();
    const vp    = useReveal();
    const pre   = useReveal();
    const stats = useReveal();
    const cta   = useReveal();

    const [imgsIn, setImgsIn] = useState(false);
    useEffect(() => { const id = setTimeout(() => setImgsIn(true), 100); return () => clearTimeout(id); }, []);

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-orange-500 selection:text-white">
            <AppNavbar
                user={user} userProfile={userProfile} credits={credits || 0}
                t={t} lang={lang}
                onCreate={() => { window.location.href = '/'; }}
                onSignIn={onSignIn}
                heroProgress={heroProgress}
            />

            {/* ── 1. HERO ── */}
            <section className="min-h-screen flex flex-col lg:flex-row items-center px-5 sm:px-10 lg:px-16 pt-24 pb-10 gap-10 lg:gap-12">
                <div className="flex flex-col gap-6 lg:w-2/5 shrink-0">
                    <span className="text-sm text-orange-500 font-medium">exposé</span>
                    <h1 className="text-6xl sm:text-7xl xl:text-[5.5rem] font-kumbh font-bold tracking-tighter leading-[0.92] lowercase">
                        {de ? <>KI-Kreation.<br />Ohne<br />Kompromisse.</> : <>AI creation.<br />Without<br />limits.</>}
                    </h1>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                        {de
                            ? 'Ein Workspace für Designer, die mehr als einen Prompt brauchen.'
                            : 'A workspace for designers who need more than just a prompt.'}
                    </p>
                    <div className="flex items-center gap-4">
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
                <div className="w-full lg:w-3/5 grid grid-cols-3 grid-rows-2 gap-2 sm:gap-3 h-[45vh] lg:h-[72vh]">
                    {HERO_IMAGES.map((img, i) => (
                        <div
                            key={i}
                            className={`${img.cls} rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-700`}
                            style={{ opacity: imgsIn ? 1 : 0, transform: imgsIn ? 'scale(1)' : 'scale(0.96)', transitionDelay: `${i * 110}ms` }}
                        >
                            <img src={img.src} alt="" className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 2. HOOK ── */}
            <div ref={hook.ref}>
                <section className="min-h-screen flex items-center justify-center bg-zinc-950 px-5 sm:px-10">
                    <p className={`max-w-3xl text-center text-4xl sm:text-6xl lg:text-7xl font-kumbh font-bold tracking-tighter leading-[1.05] text-white lowercase transition-all duration-1000 ${hook.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        {de
                            ? <>"Ein Prompt. Ein Bild.<br /><span className="text-zinc-600">Das reicht nicht."</span></>
                            : <>"One prompt. One image.<br /><span className="text-zinc-600">That's not enough."</span></>
                        }
                    </p>
                </section>
            </div>

            {/* ── 3. PARALLEL GENERATION ── */}
            <div ref={par.ref}>
                <section className="min-h-screen flex flex-col justify-center px-5 sm:px-10 lg:px-16 py-16 gap-10">
                    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 transition-all duration-1000 ${par.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        {PARALLEL_IMAGES.map((src, i) => (
                            <div key={i} className="aspect-square sm:aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden">
                                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            </div>
                        ))}
                    </div>
                    <div className={`max-w-sm transition-all duration-1000 delay-300 ${par.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                        <h2 className="text-3xl sm:text-4xl font-kumbh font-bold tracking-tight leading-tight lowercase mb-2">
                            {t('home_section_iterative_title')}
                        </h2>
                        <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">
                            {t('home_section_iterative_desc')}
                        </p>
                    </div>
                </section>
            </div>

            {/* ── 4. VISUAL PROMPTING ── */}
            <div ref={vp.ref}>
                <section className="min-h-screen flex flex-col lg:flex-row items-center px-5 sm:px-10 lg:px-16 py-16 gap-10 lg:gap-16">
                    <div className={`lg:w-2/5 flex flex-col gap-4 transition-all duration-1000 ${vp.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                        <h2 className="text-4xl sm:text-5xl font-kumbh font-bold tracking-tight leading-tight lowercase">
                            {t('home_section_visual_title')}
                        </h2>
                        <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-xs">
                            {t('home_section_visual_desc')}
                        </p>
                    </div>
                    <div className={`lg:w-3/5 grid grid-cols-2 gap-2 sm:gap-3 w-full transition-all duration-1000 delay-200 ${vp.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                        {['/home/4 visual promting/edit_sommer.jpg', '/home/4 visual promting/edit_winter.jpg'].map((src, i) => (
                            <div key={i} className="aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden">
                                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* ── 5. PRESETS ── */}
            <div ref={pre.ref}>
                <section className="min-h-screen flex flex-col justify-center px-5 sm:px-10 lg:px-16 py-16 gap-8">
                    <div className={`w-full aspect-[16/7] sm:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-1000 ${pre.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'}`}>
                        <img src="/home/3 vorlagen/1.jpg" alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </div>
                    <div className={`max-w-sm transition-all duration-1000 delay-300 ${pre.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                        <h2 className="text-3xl sm:text-4xl font-kumbh font-bold tracking-tight leading-tight lowercase mb-2">
                            {t('home_section_templates_title')}
                        </h2>
                        <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">
                            {t('home_section_templates_desc')}
                        </p>
                    </div>
                </section>
            </div>

            {/* ── 6. STATS ── */}
            <div ref={stats.ref}>
                <section className="min-h-screen flex items-center justify-center px-5 sm:px-10">
                    <div className={`w-full max-w-4xl flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800 transition-all duration-1000 ${stats.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        {[
                            { value: '1,643', label: de ? 'Bilder generiert' : 'images generated' },
                            { value: '104',   label: de ? 'Kreative' : 'designers & creatives' },
                            { value: '4 K',   label: de ? 'Max. Auflösung' : 'max resolution' },
                        ].map((s, i) => (
                            <div key={i} className="flex flex-col gap-2 py-10 sm:py-0 sm:px-16 first:pl-0 last:pr-0" style={{ transitionDelay: `${i * 150}ms` }}>
                                <span className="text-5xl sm:text-6xl font-kumbh font-semibold tracking-tight">{s.value}</span>
                                <span className="text-sm text-zinc-400 dark:text-zinc-500">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* ── 7. CTA ── */}
            <div ref={cta.ref}>
                <section className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-5 sm:px-10 text-center gap-6">
                    <div className={`flex flex-col items-center gap-6 transition-all duration-1000 ${cta.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <h2 className="text-6xl sm:text-8xl lg:text-9xl font-kumbh font-bold tracking-tighter leading-[0.9] lowercase text-white">
                            {de ? <>bereit für<br /><span className="text-orange-500">exposé?</span></> : <>ready for<br /><span className="text-orange-500">exposé?</span></>}
                        </h2>
                        <p className="text-sm text-zinc-500">
                            {de ? 'Kein Abo. 5 € Startguthaben.' : 'No subscription. 5 € starter credits.'}
                        </p>
                        <Button variant="white" size="l" onClick={onGetStarted} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                            {de ? 'Jetzt starten' : 'Get started'}
                        </Button>
                    </div>
                </section>
            </div>

            <GlobalFooter t={t} />
        </div>
    );
};
