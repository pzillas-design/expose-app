
import React, { useState } from 'react';
import {
    LogOut, Globe, Mail,
    Moon, Sun, Monitor, Loader2, CreditCard, Check, ChevronDown, Info, Shield
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

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={currentBalance}
                onCreateBoard={onCreateBoard}
                t={t}
            />

            <main className="max-w-xl mx-auto w-full px-4 sm:px-6 flex-1 py-12 sm:py-16">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        {t('tab_account')} & {t('tab_general')}
                    </h1>
                    <p className="text-sm text-zinc-500">
                        {user?.email}
                    </p>
                </div>

                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* --- KONTO ABSCHNITT --- */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
                            {t('tab_account')}
                        </h2>

                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-100 rounded-2xl p-8 space-y-6 text-white dark:text-zinc-900 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                <Shield className="w-24 h-24" />
                            </div>

                            <div className="relative space-y-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t('balance')}</span>
                                <div className="text-5xl font-bold tracking-tighter flex items-baseline">
                                    {(currentBalance || 0).toFixed(2)}
                                    <span className="text-2xl text-zinc-500 ml-1.5 font-medium">€</span>
                                </div>
                            </div>

                            <div className="relative">
                                {!isTopUpExpanded ? (
                                    <button
                                        onClick={() => setIsTopUpExpanded(true)}
                                        className="w-full py-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-sm font-bold hover:scale-[1.01] transition-all shadow-lg active:scale-95"
                                    >
                                        {t('top_up')}
                                    </button>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="relative">
                                            <div className="flex items-center justify-center border-2 border-white/20 dark:border-zinc-900/10 rounded-xl p-4 bg-white/5 dark:bg-zinc-900/5 backdrop-blur-md">
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
                                                    className="w-full bg-transparent text-center text-3xl font-bold outline-none placeholder-white/20 dark:placeholder-zinc-900/20 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <span className="text-white/40 dark:text-zinc-900/40 ml-2 text-2xl font-bold">€</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setIsTopUpExpanded(false)}
                                                className="py-3 px-4 bg-white/10 dark:bg-zinc-900/5 rounded-xl text-sm font-bold hover:bg-white/20 dark:hover:bg-zinc-900/10 transition-colors"
                                            >
                                                {t('cancel')}
                                            </button>
                                            <button
                                                onClick={handleAddFundsConfirm}
                                                disabled={isProcessing}
                                                className="py-3 px-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-sm font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (customAmount ? t('checkout_pay').replace('{{amount}}', parseFloat(customAmount).toFixed(2)) : t('billing_btn'))}
                                            </button>
                                        </div>

                                        {showMinError && <p className="text-xs text-red-300 dark:text-red-500 text-center font-bold">Min. 5.00 €</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sign Out Card */}
                        <button
                            onClick={onSignOut}
                            className="group w-full flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 hover:border-red-200 dark:hover:border-red-900/30 transition-all font-bold"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                                    <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-red-500 transition-colors" />
                                </div>
                                <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-red-600 dark:group-hover:text-red-400">
                                    {t('sign_out')}
                                </span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-red-400 transition-colors" />
                        </button>
                    </section>

                    {/* --- ALLGEMEIN ABSCHNITT --- */}
                    <section className="space-y-6">
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
                            {t('tab_general')}
                        </h2>

                        {/* Quality Mode */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-zinc-900 dark:text-white px-1">{t('gen_modal_quality')}</label>
                            <div className="relative">
                                <button
                                    onClick={() => setIsQualityDropdownOpen(!isQualityDropdownOpen)}
                                    className="w-full flex items-center justify-between p-5 rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-sm"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                                            {MODES.find(m => m.id === qualityMode)?.label}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                                                {MODES.find(m => m.id === qualityMode)?.price}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                                                {MODES.find(m => m.id === qualityMode)?.desc}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${isQualityDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isQualityDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setIsQualityDropdownOpen(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-3 p-2 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-2xl shadow-2xl flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50 ring-1 ring-zinc-900/5 dark:ring-white/5">
                                            {MODES.map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => { onQualityModeChange(m.id); setIsQualityDropdownOpen(false); }}
                                                    className={`
                                                        flex items-center justify-between p-3.5 rounded-xl text-left transition-all
                                                        ${qualityMode === m.id ? 'bg-zinc-100 dark:bg-white/5' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}
                                                    `}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-bold ${qualityMode === m.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                                            {m.label}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-zinc-400 tracking-tight">{m.price}</span>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                            <span className="text-xs font-medium text-zinc-400 tracking-tight">{m.desc}</span>
                                                        </div>
                                                    </div>
                                                    {qualityMode === m.id && <Check className="w-4 h-4 text-zinc-900 dark:text-white" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Appearance & Language */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-zinc-900 dark:text-white px-1 uppercase tracking-tight text-[10px] opacity-50">{t('app_section')}</label>
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-white/5 p-1.5 flex gap-1 shadow-sm">
                                    {[
                                        { id: 'light', icon: Sun },
                                        { id: 'dark', icon: Moon },
                                        { id: 'auto', icon: Monitor }
                                    ].map((m) => {
                                        const isSelected = themeMode === m.id;
                                        const Icon = m.icon;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => onThemeChange(m.id as any)}
                                                className={`
                                                    flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all duration-300
                                                    ${isSelected
                                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md'
                                                        : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}
                                                `}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-bold text-zinc-900 dark:text-white px-1 uppercase tracking-tight text-[10px] opacity-50">{t('lang_section')}</label>
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-white/5 p-1.5 flex gap-1 shadow-sm">
                                    {[
                                        { id: 'de', label: 'DE' },
                                        { id: 'en', label: 'EN' },
                                        { id: 'auto', label: 'AUTO' }
                                    ].map((l) => {
                                        const isSelected = lang === l.id;
                                        return (
                                            <button
                                                key={l.id}
                                                onClick={() => onLangChange(l.id as any)}
                                                className={`
                                                    flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300
                                                    ${isSelected
                                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md'
                                                        : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}
                                                `}
                                            >
                                                {l.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
