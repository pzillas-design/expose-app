import React, { useState } from 'react';
import {
    LogOut, Globe, Moon, Sun, Monitor, Loader2, Check, ChevronDown, Trash2
} from 'lucide-react';
import { TranslationFunction, GenerationQuality } from '@/types';
import { LocaleKey } from '@/data/locales';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';

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

export const SettingsPage: React.FC<SettingsPageProps> = ({
    qualityMode, onQualityModeChange, currentBalance, onAddFunds,
    themeMode, onThemeChange, lang, onLangChange, onSignOut, user, userProfile, t, onCreateBoard
}) => {
    const [customAmount, setCustomAmount] = useState('');
    const [isTopUpExpanded, setIsTopUpExpanded] = useState(false);
    const [showMinError, setShowMinError] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState(false);
    const [isAppearanceDropdownOpen, setIsAppearanceDropdownOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

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

    const THEMES = [
        { id: 'light', label: t('mode_light'), icon: Sun },
        { id: 'dark', label: t('mode_dark'), icon: Moon },
        { id: 'auto', label: t('mode_system'), icon: Monitor }
    ];

    const LANGUAGES = [
        { id: 'de', label: 'Deutsch' },
        { id: 'en', label: 'English' },
        { id: 'auto', label: 'Auto' }
    ];

    const userInitial = user?.email?.[0]?.toUpperCase() || 'U';

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={currentBalance}
                onCreateBoard={onCreateBoard}
                t={t}
            />

            <main className="max-w-xl mx-auto w-full px-4 sm:px-6 flex-1 py-12 sm:py-24">
                <div className="mb-12 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Einstellung
                    </h1>
                </div>

                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* --- KONTO SECTION --- */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-xl p-6 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-sm border border-zinc-200 dark:border-zinc-700">
                                {userInitial}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 italic">Konto</span>
                                <span className="text-xs text-zinc-500">{user?.email}</span>
                            </div>
                        </div>
                        <button
                            onClick={onSignOut}
                            className="px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all text-xs font-bold"
                        >
                            Abmelden
                        </button>
                    </div>

                    {/* --- BALANCE & TOP-UP --- */}
                    <div className="bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl p-6 shadow-sm overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Guthaben</span>
                                <div className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-white flex items-baseline">
                                    {(currentBalance || 0).toFixed(2)}
                                    <span className="text-lg text-zinc-400 ml-1 font-medium">€</span>
                                </div>
                            </div>

                            {!isTopUpExpanded && (
                                <button
                                    onClick={() => setIsTopUpExpanded(true)}
                                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold hover:scale-[1.02] transition-all active:scale-95"
                                >
                                    Aufladen
                                </button>
                            )}
                        </div>

                        {isTopUpExpanded && (
                            <div className="mt-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 border-t border-zinc-200 dark:border-white/5 pt-6">
                                <div className="flex items-center justify-center border border-zinc-200 dark:border-white/10 rounded-lg p-3 bg-white dark:bg-zinc-800">
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
                                        className="w-full bg-transparent text-center text-2xl font-bold outline-none placeholder-zinc-300 dark:placeholder-zinc-700 p-0 m-0 [appearance:textfield]"
                                    />
                                    <span className="text-zinc-400 dark:text-zinc-600 ml-2 text-xl font-bold">€</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setIsTopUpExpanded(false)}
                                        className="py-2.5 px-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        onClick={handleAddFundsConfirm}
                                        disabled={isProcessing}
                                        className="py-2.5 px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('billing_btn')}
                                    </button>
                                </div>
                                {showMinError && <p className="text-[10px] text-red-500 text-center font-bold">Minimum 5.00 €</p>}
                            </div>
                        )}
                    </div>

                    {/* --- SETTINGS CONTROLS (Unified Style) --- */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Quality Selection */}
                        <div className="relative group">
                            <button
                                onClick={() => {
                                    setIsQualityDropdownOpen(!isQualityDropdownOpen);
                                    setIsAppearanceDropdownOpen(false);
                                    setIsLangDropdownOpen(false);
                                }}
                                className="w-full flex items-center justify-between p-5 rounded-xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-sm"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">Qualität</span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                                        {MODES.find(m => m.id === qualityMode)?.label}
                                    </span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isQualityDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isQualityDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsQualityDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-xl shadow-xl flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50 ring-1 ring-zinc-900/5 dark:ring-white/5">
                                        {MODES.map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => { onQualityModeChange(m.id); setIsQualityDropdownOpen(false); }}
                                                className={`flex items-center justify-between p-3 rounded-lg transition-all ${qualityMode === m.id ? 'bg-zinc-50 dark:bg-white/5' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`text-[13px] font-bold ${qualityMode === m.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                        {m.label}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400">{m.desc} · {m.price}</span>
                                                </div>
                                                {qualityMode === m.id && <Check className="w-4 h-4 text-zinc-900 dark:text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Theme Dropdown */}
                            <div className="relative group">
                                <button
                                    onClick={() => {
                                        setIsAppearanceDropdownOpen(!isAppearanceDropdownOpen);
                                        setIsQualityDropdownOpen(false);
                                        setIsLangDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between p-5 rounded-xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-sm"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1 text-left">Design</span>
                                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                                            {THEMES.find(t_item => t_item.id === themeMode)?.label}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isAppearanceDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isAppearanceDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setIsAppearanceDropdownOpen(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-xl shadow-xl flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50 ring-1 ring-zinc-900/5 dark:ring-white/5">
                                            {THEMES.map((t_item) => (
                                                <button
                                                    key={t_item.id}
                                                    onClick={() => { onThemeChange(t_item.id as any); setIsAppearanceDropdownOpen(false); }}
                                                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${themeMode === t_item.id ? 'bg-zinc-50 dark:bg-white/5' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                                                >
                                                    <span className={`text-[13px] font-bold ${themeMode === t_item.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                        {t_item.label}
                                                    </span>
                                                    {themeMode === t_item.id && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Language Dropdown */}
                            <div className="relative group">
                                <button
                                    onClick={() => {
                                        setIsLangDropdownOpen(!isLangDropdownOpen);
                                        setIsQualityDropdownOpen(false);
                                        setIsAppearanceDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between p-5 rounded-xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-sm"
                                >
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">Sprache</span>
                                        <span className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                                            {LANGUAGES.find(l => l.id === lang)?.label}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isLangDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setIsLangDropdownOpen(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-xl shadow-xl flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50 ring-1 ring-zinc-900/5 dark:ring-white/5">
                                            {LANGUAGES.map((l_item) => (
                                                <button
                                                    key={l_item.id}
                                                    onClick={() => { onLangChange(l_item.id as any); setIsLangDropdownOpen(false); }}
                                                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${lang === l_item.id ? 'bg-zinc-50 dark:bg-white/5' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                                                >
                                                    <span className={`text-[13px] font-bold ${lang === l_item.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                        {l_item.label}
                                                    </span>
                                                    {lang === l_item.id && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- DANGER ZONE (Bottom Link) --- */}
                    <div className="pt-12 text-center">
                        <button
                            className="text-[11px] font-bold text-zinc-300 dark:text-zinc-800 hover:text-red-400 transition-colors uppercase tracking-[0.2em]"
                            onClick={() => {
                                if (confirm('Möchtest du dein Konto wirklich dauerhaft löschen?')) {
                                    // Handle delete
                                }
                            }}
                        >
                            Konto löschen
                        </button>
                    </div>
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
