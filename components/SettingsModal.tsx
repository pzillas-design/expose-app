
import React, { useState, useEffect } from 'react';
import {
    X, Shield, LogOut, Mail, Globe, CreditCard, LayoutDashboard, Trash2, ArrowRight,
    Moon, Sun, Monitor
} from 'lucide-react';
import { GenerationQuality, TranslationFunction } from '../types';
import { Theme, Typo, Button, IconButton } from './ui/DesignSystem';
import { Logo } from './ui/Logo';
import { LocaleKey } from '../data/locales';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    currentBalance: number;
    onAddFunds: (amount: number) => void;
    initialTab?: 'general' | 'account' | 'about';
    themeMode: 'light' | 'dark' | 'auto';
    onThemeChange: (mode: 'light' | 'dark' | 'auto') => void;
    lang: LocaleKey | 'auto';
    onLangChange: (lang: LocaleKey | 'auto') => void;
    onOpenAdmin: () => void;
    onSignOut: () => void;
    user: any;
    userProfile: any;
    t: TranslationFunction;
}

type TabId = 'account' | 'general' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose, qualityMode, onQualityModeChange, currentBalance, onAddFunds,
    initialTab, themeMode, onThemeChange, lang, onLangChange, onOpenAdmin, onSignOut, user, userProfile, t
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('account');
    const [customAmount, setCustomAmount] = useState('');
    const [isTopUpExpanded, setIsTopUpExpanded] = useState(false);
    const [showMinError, setShowMinError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab || 'account');
            setCustomAmount('');
            setIsTopUpExpanded(false);
            setShowMinError(false);
        }
    }, [isOpen, initialTab]);

    const handleAddFundsConfirm = () => {
        const finalAmount = parseFloat(customAmount);

        if (!finalAmount || finalAmount < 5) {
            setShowMinError(true);
            return;
        }

        onAddFunds(finalAmount);
        setCustomAmount('');
        setIsTopUpExpanded(false);
        setShowMinError(false);
    };

    if (!isOpen) return null;

    const MODES: { id: GenerationQuality, label: string, desc: string, price: string }[] = [
        { id: 'fast', label: 'Nano Banana', desc: '1024 × 1024 px', price: 'Free' },
        { id: 'pro-1k', label: 'Nano Banana Pro 1K', desc: '1024 × 1024 px', price: '0.50 €' },
        { id: 'pro-2k', label: 'Nano Banana Pro 2K', desc: '2048 × 2048 px', price: '1.00 €' },
        { id: 'pro-4k', label: 'Nano Banana Pro 4K', desc: '4096 × 4096 px', price: '2.00 €' },
    ];

    const TABS = [
        { id: 'account' as const, label: t('tab_account') },
        { id: 'general' as const, label: t('tab_general') },
        { id: 'about' as const, label: t('tab_about') },
    ];

    return (
        <div
            className={`fixed inset-0 z-[60] bg-zinc-950/60 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200`}
            onClick={onClose}
        >
            <div
                className={`
            w-full max-w-4xl h-full max-h-[800px] sm:h-[90vh]
            ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg}
            overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in fade-in duration-200
        `}
                onClick={(e) => e.stopPropagation()}
            >

                {/* --- SIDEBAR (Desktop) / HEADER (Mobile) --- */}
                {/* Changed background from SurfaceSubtle to PanelBg to match right side */}
                <div className={`md:w-64 ${Theme.Colors.PanelBg} border-b md:border-b-0 md:border-r ${Theme.Colors.Border} shrink-0 flex flex-col`}>
                    <div className="p-6 pb-8 flex items-center justify-between md:justify-start gap-3">
                        <h1 className={`${Typo.H2} text-xl ${Theme.Colors.TextHighlight}`}>{t('settings_title')}</h1>
                        <div className="md:hidden">
                            <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-1 overflow-x-auto md:overflow-visible flex md:flex-col pb-4 md:pb-0 no-scrollbar items-center md:items-stretch gap-2 md:gap-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                            whitespace-nowrap px-4 py-3 ${Theme.Geometry.Radius} text-sm font-medium transition-all text-left flex items-center gap-3 shrink-0
                            ${activeTab === tab.id
                                        // Active state: Border visible
                                        ? `${Theme.Colors.SurfaceSubtle} ${Theme.Colors.TextHighlight} shadow-sm border border-zinc-200 dark:border-zinc-800`
                                        // Inactive state: Border transparent (prevents layout shift/jump)
                                        : `${Theme.Colors.TextSecondary} hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-black dark:hover:text-white border border-transparent`}
                        `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className={`hidden md:block p-4 mt-auto border-t ${Theme.Colors.Border} space-y-1`}>
                        {userProfile?.role === 'admin' && (
                            <button
                                onClick={() => { onClose(); onOpenAdmin(); }}
                                className={`flex items-center gap-3 px-3 py-2.5 ${Theme.Geometry.Radius} text-sm font-medium transition-all w-full text-left text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                {t('admin_dashboard')}
                            </button>
                        )}
                        <button
                            onClick={onSignOut}
                            className={`flex items-center gap-3 px-3 py-2.5 ${Theme.Geometry.Radius} text-sm font-medium transition-all w-full text-left text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
                        >
                            <LogOut className="w-4 h-4" />
                            {t('sign_out')}
                        </button>
                    </div>
                </div>

                {/* --- CONTENT --- */}
                <div className={`flex-1 relative flex flex-col ${Theme.Colors.PanelBg} min-w-0 overflow-hidden`}>
                    {/* Desktop Close Button */}
                    <div className="hidden md:flex absolute top-4 right-4 z-20">
                        <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} tooltip={t('close')} />
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-8 md:p-12">
                        <div className="max-w-xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">

                            {/* --- ACCOUNT TAB --- */}
                            {activeTab === 'account' && (
                                <div className="flex flex-col h-full items-center max-w-sm mx-auto">

                                    <div className="flex-1 flex flex-col items-center justify-center w-full space-y-10">
                                        {/* Profile Info */}
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-400 dark:text-zinc-600 shadow-inner overflow-hidden">
                                                {userProfile?.full_name ? userProfile.full_name.charAt(0) : user?.email?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-center">
                                                <h2 className={`${Typo.H2} text-base`}>{userProfile?.full_name || 'Guest'}</h2>
                                                <p className={`${Typo.Body} text-zinc-400`}>{user?.email || ''}</p>
                                            </div>
                                        </div>

                                        {/* Balance Hero */}
                                        <div className="text-center space-y-2">
                                            <span className={Typo.Label}>{t('balance')}</span>
                                            <div className={`text-5xl font-light tracking-tight ${Theme.Colors.TextHighlight} font-mono`}>
                                                {currentBalance.toFixed(2)}<span className="text-2xl text-zinc-300 dark:text-zinc-700 ml-1">€</span>
                                            </div>
                                        </div>

                                        {/* Interaction Area */}
                                        <div className="w-full">
                                            {!isTopUpExpanded ? (
                                                <Button
                                                    onClick={() => setIsTopUpExpanded(true)}
                                                    className="w-full"
                                                >
                                                    {t('top_up')}
                                                </Button>
                                            ) : (
                                                <div className="animate-in fade-in zoom-in-95 duration-200 w-full space-y-3">
                                                    <div className="relative group">
                                                        <div className={`
                                                    flex items-center justify-center border ${Theme.Colors.Border} ${Theme.Geometry.Radius} p-4 
                                                    ${Theme.Colors.Surface} 
                                                    group-focus-within:border-zinc-400 dark:group-focus-within:border-zinc-500 
                                                    transition-colors
                                                `}>
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
                                                                autoFocus
                                                                className={`w-full bg-transparent text-center text-3xl font-medium outline-none ${Theme.Colors.TextHighlight} placeholder-zinc-300 dark:placeholder-zinc-700 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono`}
                                                            />
                                                            <span className="text-zinc-400 ml-1 text-xl font-light">€</span>
                                                        </div>

                                                        <button
                                                            onClick={() => setIsTopUpExpanded(false)}
                                                            className={`absolute -top-2.5 -right-2.5 p-1 ${Theme.Colors.Surface} rounded-full border ${Theme.Colors.Border} text-zinc-400 hover:text-black dark:hover:text-white transition-colors shadow-sm z-10`}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <Button
                                                        onClick={handleAddFundsConfirm}
                                                        className="w-full"
                                                    >
                                                        {customAmount ? `Pay ${parseFloat(customAmount).toFixed(2)} €` : 'Checkout'}
                                                    </Button>

                                                    <div className="flex justify-between items-center px-1 h-4">
                                                        {showMinError ? (
                                                            <span className="text-[10px] text-red-500 animate-in fade-in slide-in-from-left-1">
                                                                Min. 5.00 €
                                                            </span>
                                                        ) : <span />}

                                                        <div className="flex items-center gap-1.5 text-zinc-400 opacity-60">
                                                            <Shield className="w-3 h-3" />
                                                            <span className="text-[10px]">Secure by Stripe</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- GENERAL TAB --- */}
                            {activeTab === 'general' && (
                                <div className="space-y-12">

                                    {/* Model Selection */}
                                    <section className="space-y-4">
                                        <div>
                                            <h2 className={Typo.H2}>{t('gen_section')}</h2>
                                            <p className={Typo.Micro}>{t('gen_desc')}</p>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {MODES.map((mode) => {
                                                const isSelected = qualityMode === mode.id;
                                                return (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => onQualityModeChange(mode.id)}
                                                        className={`
                                                    w-full flex flex-col items-start gap-1 p-4 ${Theme.Geometry.Radius} border text-left transition-all
                                                    ${isSelected
                                                                ? `${Theme.Colors.SurfaceSubtle} border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100`
                                                                : `${Theme.Colors.Surface} ${Theme.Colors.Border} ${Theme.Colors.SurfaceHover}`}
                                                `}
                                                    >
                                                        <div className="flex items-center justify-between w-full mb-0.5">
                                                            <span className={`font-medium ${isSelected ? Theme.Colors.TextHighlight : Theme.Colors.TextPrimary}`}>
                                                                {mode.label}
                                                            </span>
                                                            <span className={`font-mono text-xs ${isSelected ? Theme.Colors.TextHighlight : 'text-zinc-500'}`}>
                                                                {mode.price}
                                                            </span>
                                                        </div>
                                                        <span className={`text-xs ${Theme.Colors.TextSubtle} font-mono`}>{mode.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <div className={`h-px ${Theme.Colors.SurfaceSubtle} w-full`} />

                                    {/* Appearance */}
                                    <section className="space-y-4">
                                        <h2 className={Typo.H2}>{t('app_section')}</h2>
                                        <div className="flex flex-col sm:flex-row gap-3">
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
                                                    flex-1 flex items-center justify-center gap-2 py-3 px-4 ${Theme.Geometry.Radius} border text-sm font-medium transition-all
                                                    ${isSelected
                                                                ? `${Theme.Colors.AccentBg} ${Theme.Colors.AccentFg} border-transparent`
                                                                : `${Theme.Colors.Surface} ${Theme.Colors.Border} ${Theme.Colors.TextSecondary} ${Theme.Colors.SurfaceHover}`}
                                                `}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        {m.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    {/* Language */}
                                    <section className="space-y-4">
                                        <h2 className={Typo.H2}>{t('lang_section')}</h2>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            {[
                                                { id: 'de', label: 'Deutsch' },
                                                { id: 'en', label: 'English' },
                                                { id: 'auto', label: 'Auto' }
                                            ].map((l) => {
                                                const isSelected = lang === l.id;
                                                return (
                                                    <button
                                                        key={l.id}
                                                        onClick={() => onLangChange(l.id as any)}
                                                        className={`
                                                    flex-1 flex items-center justify-center gap-2 py-3 px-4 ${Theme.Geometry.Radius} border text-sm font-medium transition-all
                                                    ${isSelected
                                                                ? `${Theme.Colors.AccentBg} ${Theme.Colors.AccentFg} border-transparent`
                                                                : `${Theme.Colors.Surface} ${Theme.Colors.Border} ${Theme.Colors.TextSecondary} ${Theme.Colors.SurfaceHover}`}
                                                `}
                                                    >
                                                        {l.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <div className={`h-px ${Theme.Colors.SurfaceSubtle} w-full`} />

                                    <section>
                                        <button className={`w-full flex items-center justify-between p-4 ${Theme.Geometry.Radius} ${Theme.Colors.DangerBorder} ${Theme.Colors.DangerBg} group text-left hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors`}>
                                            <div className="flex items-center gap-3">
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                <span className={`text-sm font-medium ${Theme.Colors.Danger}`}>{t('delete_account')}</span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    </section>
                                </div>
                            )}

                            {/* --- ABOUT TAB --- */}
                            {activeTab === 'about' && (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-10 py-10">
                                    <div className="relative group cursor-default">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/40 to-purple-200/40 dark:from-amber-900/30 dark:to-purple-900/30 blur-3xl rounded-full opacity-60 animate-pulse" />
                                        <Logo className="w-40 h-40 relative z-10 opacity-90 grayscale-[0.1]" />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-light tracking-tighter">Exposé</h3>
                                        <p className={`text-sm ${Theme.Colors.TextSecondary} max-w-md mx-auto leading-relaxed`}>
                                            {t('about_desc')}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 w-full max-w-sm">
                                        <a href="https://pzillas.com" target="_blank" rel="noreferrer" className={`flex items-center justify-between p-4 ${Theme.Geometry.Radius} ${Theme.Colors.Border} ${Theme.Colors.SurfaceHover} transition-colors group ${Theme.Colors.Surface}`}>
                                            <div className="flex items-center gap-3">
                                                <Globe className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                                <span className={`text-sm font-medium ${Theme.Colors.TextPrimary}`}>Website</span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500" />
                                        </a>
                                        <a href="mailto:hello@expose.ae" className={`flex items-center justify-between p-4 ${Theme.Geometry.Radius} ${Theme.Colors.Border} ${Theme.Colors.SurfaceHover} transition-colors group ${Theme.Colors.Surface}`}>
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                                <span className={`text-sm font-medium ${Theme.Colors.TextPrimary}`}>Contact Support</span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
