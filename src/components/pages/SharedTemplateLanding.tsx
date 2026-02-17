import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import { PromptTemplate, TranslationFunction } from '@/types';
import { Button, Theme, Typo, Loader2 } from '@/components/ui/DesignSystem';
import { Wand2, Layout, Zap, Sparkles, Plus, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

interface SharedTemplateLandingProps {
    user: any;
    slugProp?: string; // New: allow passing slug via props
    onImport: (template: PromptTemplate) => void;
    onAuthRequired: (mode: 'signin' | 'signup') => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
}

export const SharedTemplateLanding: React.FC<SharedTemplateLandingProps> = ({
    user,
    slugProp,
    onImport,
    onAuthRequired,
    t,
    currentLang
}) => {
    const { slug: pathSlug } = useParams<{ slug: string }>();
    const slug = slugProp || pathSlug; // Priority to prop
    const [template, setTemplate] = useState<PromptTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (slug) {
            setLoading(true);
            adminService.getPresetBySlug(slug).then(res => {
                setTemplate(res);
                setLoading(false);
            });
        }
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
                <Typo.Body className="text-zinc-500">{currentLang === 'de' ? 'Vorlage wird geladen...' : 'Loading template...'}</Typo.Body>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-6">
                    <Wand2 className="w-8 h-8 text-zinc-300" />
                </div>
                <h1 className={`${Typo.H1} text-2xl mb-2`}>{currentLang === 'de' ? 'Vorlage nicht gefunden' : 'Template not found'}</h1>
                <p className={`${Typo.Body} text-zinc-500 mb-8`}>
                    {currentLang === 'de'
                        ? 'Dieser Link ist ungültig oder die Vorlage wurde entfernt.'
                        : 'This link is invalid or the template has been removed.'}
                </p>
                <Button variant="secondary" onClick={() => navigate('/')}>
                    {t('back_to_app')}
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#050505] flex flex-col items-center overflow-x-hidden">
            {/* Minimal Header */}
            <header className="w-full max-w-7xl px-6 py-8 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
                <Logo size="md" />
                {!user && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onAuthRequired('signin')}
                            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            {currentLang === 'de' ? 'Anmelden' : 'Sign in'}
                        </button>
                        <Button variant="primary" size="sm" onClick={() => onAuthRequired('signup')}>
                            {currentLang === 'de' ? 'Konto erstellen' : 'Create account'}
                        </Button>
                    </div>
                )}
            </header>

            <main className="w-full max-w-xl px-6 py-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
                {/* iCloud-style Sharing Bubble */}
                <div className="mb-4 px-4 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5">
                    <Typo.Micro className="text-zinc-500 font-medium tracking-wide">
                        {currentLang === 'de' ? 'EIN FREUND TEILT EINE VORLAGE' : 'A FRIEND SHARED A TEMPLATE'}
                    </Typo.Micro>
                </div>

                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-zinc-900 to-black dark:from-white dark:to-zinc-200 shadow-2xl flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-white/10 dark:bg-black/5 rounded-3xl blur-sm scale-105" />
                    <Sparkles className="w-10 h-10 text-white dark:text-black relative z-10" />
                </div>

                <h1 className={`${Typo.H1} text-3xl sm:text-4xl text-center mb-4 tracking-tight`}>
                    {template.title}
                </h1>

                <div className="w-full p-6 rounded-3xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/10 mb-8 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wand2 className="w-24 h-24" />
                    </div>
                    <Typo.Micro className="text-zinc-400 mb-3 uppercase tracking-widest">{currentLang === 'de' ? 'VORSCHAU' : 'PREVIEW'}</Typo.Micro>
                    <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-4 relative z-10">
                        {template.prompt}
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-zinc-50 dark:from-[#080808] to-transparent" />
                </div>

                <div className="w-full flex flex-col gap-4 items-center">
                    <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        icon={<ArrowRight className="w-5 h-5" />}
                        className="py-7 text-lg shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.1)]"
                        onClick={() => onImport(template)}
                    >
                        {user ? (currentLang === 'de' ? 'Ausprobieren' : 'Try it out') : (currentLang === 'de' ? 'Jetzt ausprobieren' : 'Try it now')}
                    </Button>
                    {!user && (
                        <p className="text-sm text-zinc-500 mt-2">
                            {currentLang === 'de' ? 'Kostenlos nutzen. Kein Download nötig.' : 'Free to use. No download required.'}
                        </p>
                    )}
                </div>

                {/* What is expose? section */}
                {!user && (
                    <section className="mt-32 w-full pt-20 border-t border-zinc-200 dark:border-white/5 animate-in fade-in duration-1000 delay-500">
                        <Typo.Micro className="text-center text-zinc-400 mb-12 block uppercase tracking-[0.2em]">WAS IST EXPOSÉ?</Typo.Micro>

                        <div className="grid grid-cols-1 gap-12">
                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-zinc-900 dark:text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{currentLang === 'de' ? 'Iteration in Echtzeit' : 'Real-time Iteration'}</h3>
                                    <p className="text-sm text-zinc-500 leading-relaxed">
                                        {currentLang === 'de'
                                            ? 'Verändere deine Bilder blitzschnell durch einfaches Markieren und Beschreiben.'
                                            : 'Transform your images instantly by simply marking and describing what you want.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center">
                                    <Layout className="w-6 h-6 text-zinc-900 dark:text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{currentLang === 'de' ? 'Kreatives Unendliches Canvas' : 'Creative Infinite Canvas'}</h3>
                                    <p className="text-sm text-zinc-500 leading-relaxed">
                                        {currentLang === 'de'
                                            ? 'Organisiere deine Visionen auf einem unbegrenzten Workspace für maximale Freiheit.'
                                            : 'Organize your visions on an unlimited workspace built for total creative freedom.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-zinc-900 dark:text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{currentLang === 'de' ? 'High-End AI Modelle' : 'High-End AI Models'}</h3>
                                    <p className="text-sm text-zinc-500 leading-relaxed">
                                        {currentLang === 'de'
                                            ? 'Greife auf die weltweit stärksten Image-Engines zu, optimiert für professionelle Ergebnisse.'
                                            : 'Access the world\'s most powerful image engines, optimized for professional-grade results.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 p-8 rounded-3xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-center">
                            <h2 className="text-2xl font-bold mb-4">{currentLang === 'de' ? 'Bereit für das nächste Level?' : 'Ready to level up?'}</h2>
                            <Button
                                variant="secondary"
                                onClick={() => onAuthRequired('signup')}
                                className="bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 border-white/10"
                            >
                                {currentLang === 'de' ? 'Kostenlos starten' : 'Get started for free'}
                            </Button>
                        </div>
                    </section>
                )}
            </main>

            <footer className="w-full max-w-7xl px-6 py-20 mt-20 text-center border-t border-zinc-200 dark:border-white/5">
                <Logo size="sm" className="opacity-30 mb-4 mx-auto" grayscale />
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 tracking-[0.3em] uppercase">© 2026 exposé — power to the creators</p>
            </footer>
        </div>
    );
};
