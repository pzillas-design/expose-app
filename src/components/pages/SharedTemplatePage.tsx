import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction, PromptTemplate } from '@/types';
import { Theme, Typo, Button } from '@/components/ui/DesignSystem';
import { Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';
import { adminService } from '@/services/adminService';

interface SharedTemplatePageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    onSignIn?: () => void;
    t: TranslationFunction;
}

export const SharedTemplatePage: React.FC<SharedTemplatePageProps> = ({
    user,
    userProfile,
    credits,
    onCreateBoard,
    onSignIn,
    t
}) => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [template, setTemplate] = useState<PromptTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setIsVisible(true);
        if (slug) {
            loadTemplate(slug);
        }
    }, [slug]);

    const loadTemplate = async (s: string) => {
        setLoading(true);
        try {
            const data = await adminService.getPresetBySlug(s);
            if (data) {
                setTemplate(data);
            }
        } catch (err) {
            console.error('Failed to load shared template:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTemplate = () => {
        if (template) {
            // Store template data to be picked up by App.tsx
            localStorage.setItem('expose_shared_template', JSON.stringify({
                ...template,
                isImported: true
            }));
        }

        if (!user) {
            if (onSignIn) {
                onSignIn();
            }
        } else {
            // Already logged in: navigate to root to trigger the import logic in App.tsx
            navigate('/');
        }
    };

    return (
        <div className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={credits}
                onCreate={onCreateBoard}
                onSignIn={onSignIn}
                onToggleSettings={() => {}}
                t={t}
            />

            <main className="flex-1 w-full max-w-4xl px-6 flex flex-col items-center justify-center py-32 lg:py-60 mx-auto">

                {/* Product Card - Very sleek & reduced */}
                <div className={`w-full max-w-[480px] transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex flex-col">

                        {/* Content Body */}
                        <div className="p-10 flex-1 flex flex-col items-center text-center gap-8 justify-center">
                            {loading ? (
                                <div className="space-y-4 w-full">
                                    <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded mx-auto animate-pulse" />
                                    <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800 rounded mx-auto animate-pulse" />
                                    <div className="h-12 w-full bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                                </div>
                            ) : template ? (
                                <>
                                    <div className="space-y-4">
                                        <span className={`${Typo.Label} text-orange-500 tracking-[0.2em]`}>
                                            {t('shared_template_label' as any)}
                                        </span>
                                        <h1 className="text-4xl lg:text-5xl font-medium tracking-tight text-zinc-900 dark:text-white capitalize">
                                            {template.title}
                                        </h1>
                                        <p className={`${Typo.Body} text-zinc-500 max-w-[320px] mx-auto text-lg leading-relaxed`}>
                                            {t('shared_template_desc' as any)}
                                        </p>
                                    </div>

                                    <Button
                                        variant="primary"
                                        className="w-full !h-14 !text-[11px] font-black uppercase tracking-[0.1em]"
                                        onClick={handleAddTemplate}
                                    >
                                        {t('shared_template_cta' as any)}
                                    </Button>

                                    <div className="flex items-center gap-2 group cursor-pointer pt-12" onClick={() => navigate('/')}>
                                        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Erfahre mehr über exposé</span>
                                        <ArrowUpRight className="w-3 h-3 text-zinc-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <h1 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-white">
                                            Vorlage nicht gefunden
                                        </h1>
                                        <p className={`${Typo.Body} text-zinc-500 max-w-[300px] mx-auto`}>
                                            Dieser Link scheint ungültig zu sein oder die Vorlage wurde entfernt.
                                        </p>
                                    </div>
                                    <div className="space-y-6 w-full flex flex-col items-center">
                                        <Button variant="secondary" onClick={() => navigate('/')} className="w-full">
                                            Zur Startseite
                                        </Button>
                                        <div className="flex items-center justify-center gap-2 group cursor-pointer pt-6" onClick={() => navigate('/')}>
                                            <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Erfahre mehr über exposé</span>
                                            <ArrowUpRight className="w-3 h-3 text-zinc-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
