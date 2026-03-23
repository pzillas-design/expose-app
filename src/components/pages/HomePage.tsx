import React, { useEffect, useState, useRef } from 'react';
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
}

export const HomePage: React.FC<HomePageProps> = ({ user, userProfile, credits, onGetStarted, onSignIn, t }) => {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const mainTrackRef = useRef<HTMLElement>(null);

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
                        setProgress(p);
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
                    <UniversalStage progress={progress} t={t} />
                </section>

                {/* 2. Section 5: Clean CTA (Traditional Scroll) */}
                <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 pt-20 pb-20 overflow-hidden">
                    {/* Background Gradients - Brand Consistency */}
                    <div className="absolute top-1/4 -left-24 md:-left-20 w-64 md:w-80 h-64 md:h-80 bg-orange-500/13 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-1/4 -right-24 md:-right-20 w-64 md:w-80 h-64 md:h-80 bg-red-600/13 rounded-full blur-[120px] pointer-events-none" />

                    <div className="relative z-10 w-full max-w-5xl mx-auto text-center">
                        <h2 className="text-5xl sm:text-7xl lg:text-8xl font-kumbh font-bold tracking-tighter mb-12 leading-[1.1] lowercase">
                            {t('home_hero_headline').toLowerCase().split('next-gen')[0]}<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">next-gen</span>{t('home_hero_headline').toLowerCase().split('next-gen')[1]}
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
