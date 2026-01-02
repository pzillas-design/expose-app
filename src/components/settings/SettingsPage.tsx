
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Shield, LogOut, Mail, Globe, LayoutDashboard, Trash2, ArrowRight,
    Moon, Sun, Monitor, Loader2, User, Sliders, Info, X
} from 'lucide-react';
import { TranslationFunction, GenerationQuality } from '@/types';
import { Button, IconButton, Theme, Typo } from '@/components/ui/DesignSystem';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { LocaleKey } from '@/data/locales';
import { AppNavbar } from '../layout/AppNavbar';

interface SettingsPageProps {
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    currentBalance: number;
    onAddFunds: (amount: number) => void;
    themeMode: 'light' | 'dark' | 'auto';
    onThemeChange: (mode: 'light' | 'dark' | 'auto') => void;
    lang: LocaleKey | 'auto';
    onLangChange: (lang: LocaleKey | 'auto') => void;
    onOpenAdmin: () => void;
    onSignOut: () => void;
    updateProfile: (updates: { full_name?: string }) => Promise<void>;
    user: any;
    userProfile: any;
    t: TranslationFunction;
    onCreateBoard: () => void;
}

type TabId = 'account' | 'general' | 'about';

export const SettingsPage: React.FC<SettingsPageProps> = ({
    qualityMode, onQualityModeChange, currentBalance, onAddFunds,
    themeMode, onThemeChange, lang, onLangChange, onOpenAdmin, onSignOut, updateProfile, user, userProfile, t, onCreateBoard
}) => {
    const { tab } = useParams<{ tab?: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>((tab as TabId) || 'account');
    const [customAmount, setCustomAmount] = useState('');
    const [isTopUpExpanded, setIsTopUpExpanded] = useState(false);
    const [showMinError, setShowMinError] = useState(false);
    const [name, setName] = useState(userProfile?.full_name || '');
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (tab && (tab === 'account' || tab === 'general' || tab === 'about')) {
            setActiveTab(tab as TabId);
        }
    }, [tab]);

    const handleAddFundsConfirm = async () => {
        const finalAmount = parseFloat(customAmount);
        if (!finalAmount || finalAmount < 5) {
            setShowMinError(true);
            return;
        }
        setIsProcessing(true);
        try {
            await onAddFunds(finalAmount);
        } finally {
            setIsProcessing(false);
        }
    };

    const MODES: { id: GenerationQuality, label: string, desc: string, price: string }[] = [
        { id: 'fast', label: 'Nano Banana', desc: '1024 × 1024 px', price: 'Free' },
        { id: 'pro-1k', label: 'Nano Banana Pro 1K', desc: '1024 × 1024 px', price: '0.10 €' },
        { id: 'pro-2k', label: 'Nano Banana Pro 2K', desc: '2048 × 2048 px', price: '0.25 €' },
        { id: 'pro-4k', label: 'Nano Banana Pro 4K', desc: '4096 × 4096 px', price: '0.50 €' },
    ];

    const TABS = [
        { id: 'account' as const, label: t('tab_account'), icon: User },
        { id: 'general' as const, label: t('tab_general'), icon: Sliders },
        { id: 'about' as const, label: t('tab_about'), icon: Info },
    ];

    const getPageStyles = () => {
        return 'bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col';
    };

    return (
        <div className={getPageStyles()}>
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={currentBalance}
                onCreateBoard={onCreateBoard}
                t={t}
            />

            <main className="max-w-[1700px] mx-auto w-full px-8 lg:px-12 2xl:px-16 flex-1 py-12">
                <div className="flex flex-col lg:flex-row gap-12 items-start h-full">

                    {/* Sidebar Navigation */}
                    <div className="w-full lg:w-72 lg:sticky lg:top-32 space-y-8">
                        <div>
                            <h1 className="text-xl font-medium tracking-tight mb-2">Einstellungen</h1>
                            <p className="text-sm text-zinc-500">Verwalte deinen Account und App-Einstellungen.</p>
                        </div>

                        <nav className="flex lg:flex-col gap-1 p-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-white/5 overflow-x-auto no-scrollbar">
                            {TABS.map((tabItem) => {
                                const Icon = tabItem.icon;
                                const isActive = activeTab === tabItem.id;
                                return (
                                    <button
                                        key={tabItem.id}
                                        onClick={() => navigate(`/settings/${tabItem.id}`)}
                                        className={`
                                            flex items-center gap-3 px-5 py-3 rounded-xl text-[13px] font-medium transition-all duration-300 whitespace-nowrap lg:w-full
                                            ${isActive
                                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50'}
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tabItem.label}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                            {userProfile?.role === 'admin' && (
                                <button
                                    onClick={onOpenAdmin}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all w-full"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    {t('admin_dashboard')}
                                </button>
                            )}
                            <button
                                onClick={onSignOut}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full"
                            >
                                <LogOut className="w-4 h-4" />
                                {t('sign_out')}
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 w-full max-w-3xl">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">

                            {/* --- ACCOUNT TAB --- */}
                            {activeTab === 'account' && (
                                <div className="space-y-12">
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-6 p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-white/5 shadow-sm">
                                            <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-400 dark:text-zinc-600 shadow-inner overflow-hidden border border-zinc-200 dark:border-zinc-800">
                                                {userProfile?.full_name ? userProfile.full_name.charAt(0) : user?.email?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="space-y-1">
                                                <h2 className="text-lg font-medium tracking-tight text-zinc-900 dark:text-white">{user?.email || ''}</h2>
                                                <p className="text-sm text-zinc-500">Persönlicher Account</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Balance Card */}
                                            <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-white/5 shadow-sm space-y-6">
                                                <div className="space-y-1">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{t('balance')}</span>
                                                    <div className="text-4xl font-mono font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                                                        {(currentBalance || 0).toFixed(2)}<span className="text-xl text-zinc-300 dark:text-zinc-700 ml-1.5">€</span>
                                                    </div>
                                                </div>

                                                <div className="w-full">
                                                    {!isTopUpExpanded ? (
                                                        <Button
                                                            onClick={() => setIsTopUpExpanded(true)}
                                                            variant="primary"
                                                            className="w-full h-12"
                                                        >
                                                            {t('top_up')}
                                                        </Button>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="relative group">
                                                                <div className="flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50 dark:bg-zinc-950 group-focus-within:border-zinc-400 dark:group-focus-within:border-zinc-600 transition-colors">
                                                                    <input
                                                                        type="number"
                                                                        value={customAmount}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                                setCustomAmount(val);
                                                                                if (showMinError) setShowMinError(false);
                                                                            }
                                                                        }}
                                                                        placeholder="0.00"
                                                                        className="w-full bg-transparent text-center text-2xl font-medium outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 dark:placeholder-zinc-700 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
                                                                    />
                                                                    <span className="text-zinc-400 ml-1 text-xl font-light">€</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => setIsTopUpExpanded(false)}
                                                                    className="absolute -top-2.5 -right-2.5 p-1.5 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-black dark:hover:text-white transition-colors shadow-sm"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            <Button
                                                                onClick={handleAddFundsConfirm}
                                                                className="w-full h-12"
                                                                disabled={isProcessing}
                                                            >
                                                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (customAmount ? t('checkout_pay').replace('{{amount}}', parseFloat(customAmount).toFixed(2)) : t('checkout_btn'))}
                                                            </Button>

                                                            {showMinError && <p className="text-[10px] text-red-500 text-center">{t('checkout_min_amount')}</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Subscription/Role Card Placeholder */}
                                            <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-white/5 shadow-sm flex flex-col justify-between">
                                                <div className="space-y-1">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Mitgliedschaft</span>
                                                    <div className="text-2xl font-medium text-zinc-900 dark:text-white">
                                                        {userProfile?.role === 'pro' ? 'Pro Plan' : 'Free Account'}
                                                    </div>
                                                </div>
                                                <Button variant="secondary" className="w-full h-12 opacity-50 cursor-not-allowed">
                                                    Upgrade (Demnächst)
                                                </Button>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* --- GENERAL TAB --- */}
                            {activeTab === 'general' && (
                                <div className="space-y-12">
                                    <section className="space-y-6">
                                        <div>
                                            <h2 className="text-lg font-medium tracking-tight mb-1">{t('gen_section')}</h2>
                                            <p className="text-sm text-zinc-500">{t('gen_desc')}</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {MODES.map((mode) => {
                                                const isSelected = qualityMode === mode.id;
                                                return (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => onQualityModeChange(mode.id)}
                                                        className={`
                                                            flex flex-col items-start gap-1 p-5 rounded-2xl border text-left transition-all duration-300
                                                            ${isSelected
                                                                ? 'bg-zinc-900 dark:bg-white border-transparent shadow-lg scale-[1.02]'
                                                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20'
                                                            }
                                                        `}
                                                    >
                                                        <div className="flex items-center justify-between w-full mb-1">
                                                            <span className={`font-medium text-sm ${isSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'}`}>
                                                                {mode.label}
                                                            </span>
                                                            <span className={`font-mono text-[10px] ${isSelected ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500'}`}>
                                                                {mode.price}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[11px] font-mono ${isSelected ? 'text-zinc-500' : 'text-zinc-500'}`}>{mode.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        {/* Appearance */}
                                        <section className="space-y-4">
                                            <h2 className="text-lg font-medium tracking-tight">{t('app_section')}</h2>
                                            <div className="grid grid-cols-3 gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/5">
                                                {[
                                                    { id: 'light', label: 'Light', icon: Sun },
                                                    { id: 'dark', label: 'Dark', icon: Moon },
                                                    { id: 'auto', label: 'System', icon: Monitor }
                                                ].map((m) => {
                                                    const isSelected = themeMode === m.id;
                                                    const Icon = m.icon;
                                                    return (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => onThemeChange(m.id as any)}
                                                            className={`
                                                                flex flex-col items-center gap-2 py-2.5 rounded-lg text-[11px] font-medium transition-all duration-300
                                                                ${isSelected
                                                                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5'
                                                                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}
                                                            `}
                                                        >
                                                            <Icon className="w-3.5 h-3.5" />
                                                            {m.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        {/* Language */}
                                        <section className="space-y-4">
                                            <h2 className="text-lg font-medium tracking-tight">{t('lang_section')}</h2>
                                            <div className="grid grid-cols-3 gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/5">
                                                {[
                                                    { id: 'de', label: 'DE' },
                                                    { id: 'en', label: 'EN' },
                                                    { id: 'auto', label: 'Auto' }
                                                ].map((l) => {
                                                    const isSelected = lang === l.id;
                                                    return (
                                                        <button
                                                            key={l.id}
                                                            onClick={() => onLangChange(l.id as any)}
                                                            className={`
                                                                flex flex-col items-center justify-center py-2.5 rounded-lg text-[11px] font-medium transition-all duration-300
                                                                ${isSelected
                                                                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5'
                                                                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}
                                                            `}
                                                        >
                                                            {l.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}

                            {/* --- ABOUT TAB --- */}
                            {activeTab === 'about' && (
                                <div className="space-y-12">
                                    <div className="p-12 bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-white/5 shadow-sm text-center space-y-10 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/20 to-purple-200/20 dark:from-amber-900/10 dark:to-purple-900/10 blur-3xl opacity-60" />

                                        <div className="relative space-y-8">
                                            <Logo className="w-24 h-24 mx-auto drop-shadow-2xl" />
                                            <div className="space-y-3">
                                                <Wordmark className="h-10 text-zinc-900 dark:text-white mx-auto" />
                                                <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
                                                    {t('about_desc')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                                            <a href="https://pzillas.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <Globe className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white" />
                                                    <span className="text-sm font-medium">Website</span>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                                            </a>
                                            <a href="mailto:hello@expose.ae" className="flex items-center justify-between p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <Mail className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white" />
                                                    <span className="text-sm font-medium">Support</span>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
