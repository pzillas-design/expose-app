
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Shield, LogOut, Mail, Globe, LayoutDashboard, Trash, ArrowRight,
    Moon, Sun, Monitor, Loader2, User, Sliders, Info, X, ChevronRight, CreditCard, Check, ChevronDown
} from 'lucide-react';
import { TranslationFunction, GenerationQuality } from '@/types';
import { Button, IconButton, Theme, Typo } from '@/components/ui/DesignSystem';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { LocaleKey } from '@/data/locales';
import { AppNavbar } from '../layout/AppNavbar';
import { useToast } from '../ui/Toast';

interface SettingsPageProps {
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    currentBalance: number;
    onAddFunds: (amount: number) => void;
    themeMode: 'light' | 'dark' | 'auto';
    onThemeChange: (mode: 'light' | 'dark' | 'auto') => void;
    lang: LocaleKey | 'auto';
    onLangChange: (lang: LocaleKey | 'auto') => void;
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
    themeMode, onThemeChange, lang, onLangChange, onSignOut, updateProfile, user, userProfile, t, onCreateBoard
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
    const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState(false);
    const { showToast } = useToast();

    const handleUpdateName = async () => {
        if (!name.trim() || name === userProfile?.full_name) return;
        setIsUpdatingName(true);
        try {
            await updateProfile({ full_name: name });
            showToast(t('profile_updated') || 'Profile updated', 'success');
        } catch (err) {
            showToast(t('failed_update_profile') || 'Failed to update profile', 'error');
        } finally {
            setIsUpdatingName(false);
        }
    };

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
        { id: 'fast', label: 'Nano Banana', desc: '1024 px', price: t('price_free') },
        { id: 'pro-1k', label: 'Nano Banana Pro 1K', desc: '1024 px', price: '0.10 €' },
        { id: 'pro-2k', label: 'Nano Banana Pro 2K', desc: '2048 px', price: '0.25 €' },
        { id: 'pro-4k', label: 'Nano Banana Pro 4K', desc: '4096 px', price: '0.50 €' },
    ];

    const TABS = [
        { id: 'account' as const, label: t('tab_account'), icon: User },
        { id: 'general' as const, label: t('tab_general'), icon: Sliders },
    ];

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={currentBalance}
                onCreateBoard={onCreateBoard}
                t={t}
            />

            <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 flex-1 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Einstellungen</h1>
                    <p className="text-sm text-zinc-500">Verwalte deinen Account und App-Einstellungen.</p>
                </div>

                {/* Tab Navigation - Mobile Optimized */}
                <nav className="flex gap-1 p-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-white/5 mb-6 overflow-x-auto no-scrollbar">
                    {TABS.map((tabItem) => {
                        const Icon = tabItem.icon;
                        const isActive = activeTab === tabItem.id;
                        return (
                            <button
                                key={tabItem.id}
                                onClick={() => navigate(`/settings/${tabItem.id}`)}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap
                                    ${isActive
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tabItem.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* --- ACCOUNT TAB --- */}
                    {activeTab === 'account' && (
                        <div className="space-y-4">
                            {/* Profile Card */}
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-white/5 p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-600 dark:text-zinc-300 shadow-inner border-2 border-white dark:border-zinc-800">
                                        {userProfile?.full_name ? userProfile.full_name.charAt(0) : user?.email?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white truncate">{user?.email || ''}</h2>
                                        <p className="text-xs text-zinc-500">Persönlicher Account</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Vollständiger Name</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Dein Name"
                                            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/20"
                                        />
                                        {name !== (userProfile?.full_name || '') && (
                                            <button
                                                onClick={handleUpdateName}
                                                disabled={isUpdatingName}
                                                className="px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                                            >
                                                {isUpdatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Balance Card */}
                            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-100 rounded-2xl border border-zinc-800 dark:border-zinc-200 p-6 space-y-4 text-white dark:text-zinc-900 shadow-lg">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">{t('balance')}</span>
                                        <div className="text-4xl font-bold tracking-tight">
                                            {(currentBalance || 0).toFixed(2)}<span className="text-2xl text-zinc-400 dark:text-zinc-600 ml-1">€</span>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white/10 dark:bg-zinc-900/10 rounded-xl">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="w-full">
                                    {!isTopUpExpanded ? (
                                        <button
                                            onClick={() => setIsTopUpExpanded(true)}
                                            className="w-full py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-sm font-semibold hover:scale-[1.02] transition-transform shadow-sm"
                                        >
                                            {t('top_up')}
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <div className="flex items-center justify-center border-2 border-white/20 dark:border-zinc-900/20 rounded-xl p-3 bg-white/10 dark:bg-zinc-900/10 backdrop-blur-sm">
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
                                                        className="w-full bg-transparent text-center text-2xl font-bold outline-none placeholder-white/30 dark:placeholder-zinc-900/30 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <span className="text-white/50 dark:text-zinc-900/50 ml-1 text-xl font-medium">€</span>
                                                </div>
                                                <button
                                                    onClick={() => setIsTopUpExpanded(false)}
                                                    className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-zinc-900 rounded-full text-zinc-900 dark:text-white shadow-md hover:scale-110 transition-transform"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleAddFundsConfirm}
                                                className="w-full py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-sm font-semibold hover:scale-[1.02] transition-transform shadow-sm disabled:opacity-50"
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (customAmount ? t('checkout_pay').replace('{{amount}}', parseFloat(customAmount).toFixed(2)) : t('checkout_btn'))}
                                            </button>

                                            {showMinError && <p className="text-xs text-red-300 dark:text-red-600 text-center">{t('checkout_min_amount')}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Membership Card */}
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-white/5 p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Mitgliedschaft</span>
                                        <div className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">
                                            {userProfile?.role === 'pro' ? 'Pro Plan' : 'Free Account'}
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                        Aktiv
                                    </div>
                                </div>
                                <button className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-xl text-sm font-semibold cursor-not-allowed">
                                    Upgrade (Demnächst)
                                </button>
                            </div>

                            {/* Sign Out */}
                            <button
                                onClick={onSignOut}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                {t('sign_out')}
                            </button>
                        </div>
                    )}

                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* Quality Mode Section */}
                            <div className="space-y-3">
                                <div>
                                    <h2 className="text-base font-semibold tracking-tight mb-1">{t('gen_section')}</h2>
                                    <p className="text-xs text-zinc-500">{t('gen_desc')}</p>
                                </div>

                                {/* Quality Mode Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsQualityDropdownOpen(!isQualityDropdownOpen)}
                                        className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 transition-all"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                                                {MODES.find(m => m.id === qualityMode)?.label || 'Nano Banana'}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                                    {MODES.find(m => m.id === qualityMode)?.price || 'Free'}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                                    {MODES.find(m => m.id === qualityMode)?.desc || '1024 px'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isQualityDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isQualityDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsQualityDropdownOpen(false)} />
                                            <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl shadow-xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                                                {MODES.map((m) => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => { onQualityModeChange(m.id); setIsQualityDropdownOpen(false); }}
                                                        className={`
                                                            flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors
                                                            ${qualityMode === m.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                                                        `}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-medium ${qualityMode === m.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                                {m.label}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-zinc-400 dark:text-zinc-500">{m.price}</span>
                                                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                                <span className="text-xs text-zinc-400 dark:text-zinc-500">{m.desc}</span>
                                                            </div>
                                                        </div>
                                                        {qualityMode === m.id && <Check className="w-4 h-4 text-black dark:text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                            {/* Appearance Section */}
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold tracking-tight text-zinc-500 uppercase">{t('app_section')}</h2>
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/50 dark:border-white/5 p-1.5">
                                    <div className="grid grid-cols-3 gap-1">
                                        {[
                                            { id: 'light', label: t('mode_light'), icon: Sun },
                                            { id: 'dark', label: t('mode_dark'), icon: Moon },
                                            { id: 'auto', label: t('mode_system'), icon: Monitor }
                                        ].map((m) => {
                                            const isSelected = themeMode === m.id;
                                            const Icon = m.icon;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => onThemeChange(m.id as any)}
                                                    className={`
                                                        flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-medium transition-all duration-300
                                                        ${isSelected
                                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                                                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                                                    `}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    <span className="hidden sm:inline">{m.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Language Section */}
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold tracking-tight text-zinc-500 uppercase">{t('lang_section')}</h2>
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/50 dark:border-white/5 p-1.5">
                                    <div className="grid grid-cols-3 gap-1">
                                        {[
                                            { id: 'de', label: t('lang_de') },
                                            { id: 'en', label: t('lang_en') },
                                            { id: 'auto', label: t('lang_auto') }
                                        ].map((l) => {
                                            const isSelected = lang === l.id;
                                            return (
                                                <button
                                                    key={l.id}
                                                    onClick={() => onLangChange(l.id as any)}
                                                    className={`
                                                        flex items-center justify-center py-3 rounded-lg text-xs font-medium transition-all duration-300
                                                        ${isSelected
                                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                                                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                                                    `}
                                                >
                                                    {l.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Logo className="w-8 h-8" />
                        <Wordmark className="h-5 text-zinc-900 dark:text-white" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <a
                            href="/about"
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            <Info className="w-4 h-4" />
                            Über
                        </a>

                        <a
                            href="https://pzillas.com"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            <Globe className="w-4 h-4" />
                            Website
                        </a>

                        <a
                            href="mailto:hello@expose.ae"
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            <Mail className="w-4 h-4" />
                            Support
                        </a>
                    </div>

                    <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 pt-4">
                        {t('about_desc')}
                    </p>
                </footer>
            </main>
        </div>
    );
};
