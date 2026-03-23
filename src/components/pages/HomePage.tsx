import React, { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Button } from '@/components/ui/DesignSystem';
import { UniversalStage } from './home-modules/UniversalStage';

interface HomePageProps {
    user: any;
    userProfile: any;
    credits: number;
    onGetStarted: () => void;
    onSignIn?: () => void;
    t: TranslationFunction;
    lang?: string;
}

// PERFORMANCE: UniversalStage is memoized — it only re-renders when progress prop actually changes.
// The scroll listener now pushes progress directly to the stage via a ref/callback instead of
// causing a full React root re-render on every scroll frame.
const MemoizedUniversalStage = React.memo(UniversalStage);

export const HomePage: React.FC<HomePageProps> = ({ user, userProfile, credits, onGetStarted, onSignIn, t, lang }) => {
    const navigate = useNavigate();
    const mainTrackRef = useRef<HTMLElement>(null);
    // Stable ref to hold the current progress so we can pass it without re-rendering
    const progressRef = useRef(0);
    // We still need a small amount of React state to trigger re-renders for stage *transitions*,
    // but we throttle it: only update state when the value changes enough to cross a stage boundary.
    const [stageProgress, setStageProgress] = React.useState(0);

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (mainTrackRef.current) {
                        const rect = mainTrackRef.current.getBoundingClientRect();
                        const windowHeight = window.innerHeight;
                        const travelDistance = rect.height - windowHeight;
                        const p = Math.min(Math.max(-rect.top / travelDistance, 0), 1);
                        progressRef.current = p;

                        // Higher threshold on mobile = fewer React re-renders = smoother scroll
                        const threshold = window.innerWidth < 1024 ? 0.008 : 0.003;
                        setStageProgress(prev => {
                            if (Math.abs(p - prev) > threshold) return p;
                            return prev;
                        });
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">

            <main className="relative z-10">
                {/* 1. THE UNIVERSAL STAGE (Sticky Track) */}
                <section ref={mainTrackRef} className="relative h-[1800vh]">
                    <MemoizedUniversalStage progress={stageProgress} t={t} lang={lang} />
                </section>

                {/* 2. Section 5: Clean CTA (Traditional Scroll) */}
                <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 pt-20 pb-20 overflow-hidden">
                    {/* Background Gradients - hidden on mobile for perf */}
                    <div className="hidden md:block absolute top-1/4 -left-20 w-80 h-80 bg-orange-500/13 rounded-full blur-[120px] pointer-events-none" />
                    <div className="hidden md:block absolute bottom-1/4 -right-20 w-80 h-80 bg-red-600/13 rounded-full blur-[120px] pointer-events-none" />

                    <div className="relative z-10 w-full max-w-5xl mx-auto text-center">
                        <h2 className="text-4xl sm:text-7xl lg:text-8xl font-kumbh font-bold tracking-tighter mb-12 leading-[1.1] lowercase">
                            {t('home_hero_headline').toLowerCase().split('next-gen')[0]}<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 pr-2">next-gen</span> {t('home_hero_headline').toLowerCase().split('next-gen')[1]}
                        </h2>

                        <div className="flex flex-col items-center justify-center gap-12 mt-16">
                            <Button
                                onClick={onGetStarted}
                                variant="primary-mono"
                                size="l"
                                icon={<ChevronLeft className="rotate-180" />}
                                iconPosition="right"
                                className="scale-125 transition-transform hover:scale-[1.3]"
                            >
                                {t('nav_start') || 'Start'}
                            </Button>

                        </div>
                    </div>

                </section>

                <GlobalFooter
                    t={t}
                    onGalleryClick={() => {
                        if (!user) onSignIn?.();
                        else navigate('/');
                    }}
                />
            </main>

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
                .perspective-1000 { perspective: 1000px; }
                @media (max-width: 768px) {
                    .hero-floating-image {
                        --mobile-scale: 1.5;
                        max-width: 95vw;
                    }
                }
            `}</style>
        </div>
    );
};
