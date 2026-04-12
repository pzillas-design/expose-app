import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Button } from '@/components/ui/DesignSystem';
import { UniversalStage } from './home-modules/UniversalStage';
import { StatsSection } from './home-modules/StatsSection';
import { PersonasSection } from './home-modules/PersonasSection';
import { PricingSection } from './home-modules/PricingSection';
import { TestimonialsSection } from './home-modules/TestimonialsSection';

interface HomePageProps {
    user: any;
    userProfile: any;
    credits: number;
    onGetStarted: () => void;
    onSignIn?: () => void;
    t: TranslationFunction;
    lang?: string;
}

export const HomePage: React.FC<HomePageProps> = ({ user, userProfile, credits, onGetStarted, onSignIn, t, lang }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">

            <main className="relative z-10">
                {/* 1. THE UNIVERSAL STAGE (Sticky Track) */}
                <section data-hero-scroll-track className="relative h-[1800vh]">
                    <UniversalStage t={t} lang={lang} />
                </section>

                {/* Stats strip */}
                <StatsSection />

                {/* Personas — built for */}
                <PersonasSection />

                {/* Pricing — pay as you go */}
                <PricingSection />

                {/* Testimonials */}
                <TestimonialsSection />

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

        </div>
    );
};
