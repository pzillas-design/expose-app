import React, { useState, useEffect, useRef } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Settings2, ChevronDown, Check } from 'lucide-react';
import * as Hero from './about-modules/HeroSection';
import * as Iterative from './about-modules/IterativeSection';
import * as Precision from './about-modules/PrecisionSection';
import * as Finale from './about-modules/FinaleSection';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

const VariantOverlay = ({ active, variants, onSelect }: { active: string, variants: string[], onSelect: (v: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="absolute top-10 right-10 z-[100]">
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-none text-[10px] font-bold text-white shadow-2xl hover:bg-black transition-all group"
                >
                    <Settings2 className="w-3 h-3 text-orange-500" />
                    <span className="opacity-50 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Design</span>
                    <span className="text-orange-500 uppercase">{active}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-black/95 border border-white/10 rounded-none overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {variants.map(v => (
                            <button
                                key={v}
                                onClick={() => { onSelect(v); setIsOpen(false); }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all ${v === active ? 'bg-orange-500 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {v}
                                {v === active && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const SectionWrapper = ({ id, children, active, variants, onSelect }: { id: string, children: React.ReactNode, active: string, variants: string[], onSelect: (v: string) => void }) => (
    <section id={id} className="relative w-full overflow-hidden border-b border-white/5">
        <VariantOverlay active={active} variants={variants} onSelect={onSelect} />
        {children}
    </section>
);

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrollY, setScrollY] = useState(0);

    // Module States
    // Module States (Hero is now locked to Dive)
    const [iterativeVariant, setIterativeVariant] = useState('Grid');
    const [precisionVariant, setPrecisionVariant] = useState('Sidepanel');
    const [finaleVariant, setFinaleVariant] = useState('Simple');

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getProgress = (start: number, end: number) => {
        const p = (scrollY - start) / (end - start);
        return Math.min(Math.max(p, 0), 1);
    };

    return (
        <div className="bg-[#050505] text-white selection:bg-orange-500 selection:text-white font-sans overflow-x-hidden">
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

            <main className="w-full">
                {/* HERO SECTION - Locked to Dive Variant */}
                <section id="hero" className="relative w-full overflow-hidden border-b border-white/5">
                    <Hero.HeroDive scrollY={scrollY} progress={getProgress(0, 1000)} t={t} />
                </section>

                {/* ITERATIVE SECTION */}
                <SectionWrapper
                    id="iterative"
                    active={iterativeVariant}
                    variants={['Grid', 'Canvas', 'Horizon', 'Dual-Track']}
                    onSelect={setIterativeVariant}
                >
                    {iterativeVariant === 'Grid' && <Iterative.IterativeGrid scrollY={scrollY} progress={getProgress(1000, 2500)} t={t} />}
                    {iterativeVariant === 'Canvas' && <Iterative.IterativeCanvas scrollY={scrollY} progress={getProgress(1000, 2500)} t={t} />}
                    {iterativeVariant === 'Horizon' && <Iterative.IterativeHorizon scrollY={scrollY} progress={getProgress(1000, 2500)} t={t} />}
                    {iterativeVariant === 'Dual-Track' && <Iterative.IterativeDualTrack scrollY={scrollY} progress={getProgress(1000, 2500)} t={t} />}
                </SectionWrapper>

                {/* PRECISION SECTION */}
                <SectionWrapper
                    id="precision"
                    active={precisionVariant}
                    variants={['Sidepanel', 'Blueprint', 'Scanner', 'Magnifier']}
                    onSelect={setPrecisionVariant}
                >
                    {precisionVariant === 'Sidepanel' && <Precision.PrecisionSidepanel progress={getProgress(2500, 4000)} t={t} />}
                    {precisionVariant === 'Blueprint' && <Precision.PrecisionBlueprint progress={getProgress(2500, 4000)} t={t} />}
                    {precisionVariant === 'Scanner' && <Precision.PrecisionScanner progress={getProgress(2500, 4000)} t={t} />}
                    {precisionVariant === 'Magnifier' && <Precision.PrecisionMagnifier progress={getProgress(2500, 4000)} t={t} />}
                </SectionWrapper>

                {/* FINALE SECTION */}
                <SectionWrapper
                    id="finale"
                    active={finaleVariant}
                    variants={['Simple', 'Cinematic', 'Refined']}
                    onSelect={setFinaleVariant}
                >
                    {finaleVariant === 'Simple' && <Finale.FinaleSimple progress={getProgress(4000, 5000)} onCreateBoard={onCreateBoard} />}
                    {finaleVariant === 'Cinematic' && <Finale.FinaleCinematic progress={getProgress(4000, 5000)} onCreateBoard={onCreateBoard} />}
                    {finaleVariant === 'Refined' && <Finale.FinaleRefined progress={getProgress(4000, 5000)} onCreateBoard={onCreateBoard} />}
                </SectionWrapper>

            </main>

            <GlobalFooter t={t} />

            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
                .italic_off { font-style: normal !important; }
            `}</style>
        </div>
    );
};
