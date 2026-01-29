import React, { useEffect, useState } from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo } from '@/components/ui/DesignSystem';
import { ChevronDown, Pen, Camera, X, Layout, Command, Layers, Maximize, MousePointer2 } from 'lucide-react';

interface AboutPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

// --- Technical Components ---

const TechnicalGrid = () => (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.03] dark:opacity-[0.07]">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '200px 200px', borderWidth: '2px' }} />
    </div>
);

const BlueprintMockup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const imageRows = [
        ['41.jpg', '42.jpg', '44.jpg'],
        ['11.jpg', '13.jpg', '14.jpg'],
        ['21.jpg', '24.jpg']
    ];

    return (
        <div ref={containerRef} className="relative w-full py-20 px-4 flex flex-col items-center gap-16">
            {imageRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-8 items-center justify-center">
                    {row.map((imageName, imgIndex) => (
                        <div
                            key={imageName}
                            className={`relative group transition-all duration-[1200ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                            style={{ transitionDelay: `${(imgIndex * 150) + (rowIndex * 100)}ms` }}
                        >
                            {/* Technical Overlay */}
                            <div className="absolute -inset-4 border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                <span className="absolute -top-2 -left-2 text-[8px] font-mono p-1 bg-white dark:bg-zinc-950">ID_{imageName.split('.')[0]}</span>
                                <span className="absolute -bottom-2 -right-2 text-[8px] font-mono p-1 bg-white dark:bg-zinc-950">W:320px</span>
                            </div>

                            <div className="w-32 sm:w-64 lg:w-[400px] bg-zinc-100 dark:bg-zinc-900 overflow-hidden shadow-sm">
                                <img
                                    src={`/about/iterativ arbeiten img/${imageName}`}
                                    alt="Technical"
                                    className="w-full grayscale contrast-125 opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 hover:scale-105"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export const AboutPage: React.FC<AboutPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-[#fcfcfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-zinc-900 selection:text-white font-sans">
            <AppNavbar user={user} userProfile={userProfile} credits={credits} onCreateBoard={onCreateBoard} t={t} />

            <main className="flex-1 w-full">
                {/* Section 1: Structural Hero */}
                <section className="relative h-[90vh] flex flex-col items-center justify-center overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
                    <TechnicalGrid />
                    <div className="relative z-10 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-left animate-in fade-in slide-in-from-left-8 duration-1000">
                            <span className="inline-block px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">Structural Intelligence</span>
                            <h1 className="text-6xl sm:text-8xl font-bold tracking-tighter leading-[0.85] mb-8">
                                Bauplan <br />
                                <span className="text-zinc-400 dark:text-zinc-600 italic font-serif">für Gedanken.</span>
                            </h1>
                            <p className="max-w-md text-lg text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                Exposé ist das Werkzeug für digitale Architekten. Wir glauben, dass Kreativität keine Magie ist, sondern messbare Präzision.
                            </p>
                        </div>
                        <div className="relative hidden lg:block aspect-square border border-zinc-200 dark:border-zinc-800 p-8 animate-in fade-in zoom-in duration-1200 delay-300">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[80%] h-[80%] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-full animate-[spin_20s_linear_infinite]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 h-full">
                                <div className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center"><Layout className="w-8 h-8 text-zinc-300" /></div>
                                <div className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center"><Command className="w-8 h-8 text-zinc-300" /></div>
                                <div className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center"><Layers className="w-8 h-8 text-zinc-300" /></div>
                                <div className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center"><Maximize className="w-8 h-8 text-zinc-300" /></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Iteration as Measurement */}
                <section className="relative py-40 overflow-hidden">
                    <div className="max-w-4xl mx-auto px-6 text-center mb-24">
                        <h2 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">Iteration ist Vermessung.</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 text-lg">Jede Generierung verfeinert das Ergebnis. Wir visualisieren diesen Prozess spaltenweise.</p>
                    </div>
                    <div className="w-full">
                        <BlueprintMockup />
                    </div>
                </section>

                {/* Section 3: The Artisan UI */}
                <section className="bg-zinc-900 dark:bg-zinc-950 py-40 text-white overflow-hidden">
                    <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div className="order-2 lg:order-1 relative">
                            <div className="absolute -inset-10 bg-white/5 blur-[100px] rounded-full" />
                            <div className="relative bg-zinc-800 border border-zinc-700 rounded-2xl p-8 shadow-2xl">
                                <div className="flex gap-2 mb-8">
                                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                                </div>
                                <div className="space-y-4">
                                    <div className="h-4 w-[60%] bg-zinc-700 rounded" />
                                    <div className="h-4 w-[80%] bg-zinc-700 rounded" />
                                    <div className="h-32 w-full bg-zinc-900/50 rounded border border-zinc-700 border-dashed flex items-center justify-center">
                                        <MousePointer2 className="w-6 h-6 text-zinc-600" />
                                    </div>
                                    <div className="h-12 w-full bg-zinc-100 rounded" />
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 space-y-8">
                            <h3 className="text-5xl font-bold tracking-tight">Handgefertigte Schnittstelle.</h3>
                            <p className="text-zinc-400 text-xl leading-relaxed">
                                Jedes Pixel ist bewusst gesetzt. Exposé vermeidet unnötigen Lärm, um Raum für Ihre Vision zu schaffen.
                            </p>
                            <div className="flex flex-col gap-4 font-mono text-xs text-zinc-500 uppercase tracking-widest">
                                <div className="flex items-center gap-4">
                                    <span className="w-8 h-[1px] bg-zinc-700" />
                                    <span>Minimalist Framework</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="w-8 h-[1px] bg-zinc-700" />
                                    <span>Performance Driven</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 4: Humble Founder */}
                <section className="py-40 bg-zinc-50 dark:bg-zinc-900/20">
                    <div className="max-w-3xl mx-auto px-6">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-10 flex items-center justify-center overflow-hidden grayscale">
                                <img src="/about/iterativ arbeiten img/11.jpg" alt="Founder placeholder" className="w-full h-full object-cover" />
                            </div>
                            <blockquote className="text-3xl sm:text-4xl font-serif italic text-zinc-900 dark:text-zinc-100 leading-tight mb-8">
                                "Wir bauen keine Bilder. Wir bauen Werkzeuge, die es erlauben, Bilder zu verstehen."
                            </blockquote>
                            <div className="text-zinc-500 dark:text-zinc-400 font-mono text-xs uppercase tracking-[0.34em]">
                                Michael Pzillas, Architekt des Systems
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};

