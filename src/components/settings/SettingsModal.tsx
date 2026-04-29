import React, { useState } from 'react';
import { PRIMARY_PROVIDER } from '@/config/provider';
import { ChevronDown, Check } from 'lucide-react';
import { TranslationFunction, GenerationQuality } from '@/types';
import { LocaleKey } from '@/data/locales';
import { useItemDialog } from '@/components/ui/Dialog';
import { Modal } from '@/components/ui/Modal';
import { CreditsModal } from '../modals/CreditsModal';
import {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    areNotificationsEnabled,
    setNotificationsEnabled
} from '@/utils/notifications';
import { Button } from '../ui/DesignSystem';
import { supabase } from '@/services/supabaseClient';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    qualityMode: GenerationQuality;
    onQualityModeChange: (mode: GenerationQuality) => void;
    currentBalance: number;
    onAddFunds: (amount: number) => void;
    themeMode: 'light' | 'dark' | 'auto';
    onThemeChange: (mode: 'light' | 'dark' | 'auto') => void;
    lang: LocaleKey | 'auto';
    onLangChange: (lang: LocaleKey | 'auto') => void;
    onSignOut: () => void;
    onDeleteAccount: () => Promise<void>;
    updateProfile: (updates: { full_name?: string }) => Promise<void>;
    user: any;
    userProfile: any;
    t: TranslationFunction;
    currentLang?: 'de' | 'en';
    onChangePassword?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose,
    qualityMode, onQualityModeChange, currentBalance, onAddFunds,
    themeMode, onThemeChange, lang, onLangChange, onSignOut, onDeleteAccount, user, userProfile, t,
    currentLang = 'en',
    onChangePassword
}) => {
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const [isResDropdownOpen, setIsResDropdownOpen] = useState(false);
    const [isAppearanceDropdownOpen, setIsAppearanceDropdownOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [notificationsEnabled, setNotificationsEnabledState] = useState(areNotificationsEnabled());
    const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());
    const { confirm } = useItemDialog();

    const closeAll = () => {
        setIsResDropdownOpen(false);
        setIsAppearanceDropdownOpen(false);
        setIsLangDropdownOpen(false);
    };

    const safeQuality = (qualityMode as string) || 'nb2-2k';
    const currentRes = (safeQuality.split('-')[1] ?? '2k') as '1k' | '2k' | '4k';

    const setRes = (res: string) => { onQualityModeChange(`nb2-${res}` as GenerationQuality); closeAll(); };
    const RESOLUTIONS = [
        { id: '05k', label: '0.5K', desc: '512 px' },
        { id: '1k', label: '1K', desc: '1024 px' },
        { id: '2k', label: '2K', desc: '2048 px' },
        { id: '4k', label: '4K', desc: '4096 px' },
    ].filter(r => !(PRIMARY_PROVIDER === 'kie' && r.id === '05k'));
    const THEMES = [
        { id: 'light', label: t('mode_light') },
        { id: 'dark', label: t('mode_dark') },
        { id: 'auto', label: t('mode_system') },
    ];
    const LANGUAGES = [
        { id: 'de', label: 'Deutsch' },
        { id: 'en', label: 'English' },
        { id: 'auto', label: 'Auto' },
    ];

    const handleNotificationToggle = async (enabled: boolean) => {
        if (notificationPermission === 'denied') {
            await confirm({
                title: t('notifications_browser_label'),
                description: t('notifications_allow_in_browser'),
                confirmLabel: 'OK',
                variant: 'danger',
            });
            return;
        }
        if (enabled && notificationPermission !== 'granted') {
            const permission = await requestNotificationPermission();
            setNotificationPermission(permission);
            if (permission !== 'granted') {
                await confirm({
                    title: 'Browser-Benachrichtigungen',
                    description: t('notifications_allow_in_browser'),
                    confirmLabel: 'OK',
                    variant: 'danger',
                });
                return;
            }
        }
        setNotificationsEnabled(enabled);
        setNotificationsEnabledState(enabled);
        // Persist to DB so the setting survives across browsers/devices
        if (user?.id) {
            supabase.from('profiles').update({ notifications_enabled: enabled }).eq('id', user.id)
                .then(({ error }) => { if (error) console.error('[Settings] notifications_enabled save failed:', error); });
        }
    };

    const userInitial = user?.email?.[0]?.toUpperCase() || 'U';

    // ── Shared styles ──────────────────────────────────────────────
    // Dropdown trigger: subtle fill, no border
    const trigger = "w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-all";
    const menu = "absolute top-full left-0 right-0 mt-1.5 p-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50 shadow-sm";

    // Typography tokens
    const sectionLabel = "text-sm text-zinc-500 dark:text-zinc-400 mb-4";
    const fieldLabel = "text-xs text-zinc-400 mb-2";
    const rowTitle = "text-sm text-zinc-700 dark:text-zinc-300";
    const rowSub = "text-xs text-zinc-400 mt-0.5";

    // Toggle
    const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
        <button
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('tab_settings')} maxWidth="md">
            <div className="px-6 pb-8 pt-2 divide-y divide-zinc-200/60 dark:divide-zinc-800/60 max-h-[70vh] overflow-y-auto no-scrollbar">

                {/* ── Konto — hero ── */}
                <section className="pb-7">
                    <p className={sectionLabel}>{t('tab_account')}</p>

                    {/* Profile + email */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0">
                            <span className="text-base font-semibold text-white">{userInitial}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-zinc-800 dark:text-zinc-200 truncate">{user?.email}</p>
                            <button
                                onClick={onChangePassword}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors mt-0.5">
                                {t('settings_change_password')}
                            </button>
                        </div>
                    </div>

                    {/* Balance + Aufladen */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={fieldLabel}>{t('balance')}</p>
                            <span className="text-2xl text-zinc-900 dark:text-white tabular-nums">
                                {(currentBalance || 0).toFixed(2)} €
                            </span>
                        </div>
                        <Button variant="primary-mono" size="m" onClick={() => setIsCreditsModalOpen(true)}>
                            {t('top_up')}
                        </Button>
                    </div>
                </section>

                {/* ── Allgemein ── */}
                <section className="py-7">
                    <div className="space-y-5">

                        {/* Quality / resolution removed — now lives in the per-generation
                            settings modal (gear icon next to the prompt's Generate button). */}

                        <div>
                            <p className={fieldLabel}>{t('app_section')}</p>
                            <div className="relative">
                                <button onClick={() => { closeAll(); setIsAppearanceDropdownOpen(v => !v); }} className={trigger}>
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        {THEMES.find(t_item => t_item.id === themeMode)?.label}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isAppearanceDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isAppearanceDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={closeAll} />
                                        <div className={menu}>
                                            {THEMES.map(t_item => (
                                                <button key={t_item.id}
                                                    onClick={() => { onThemeChange(t_item.id as any); closeAll(); }}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${themeMode === t_item.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}>
                                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{t_item.label}</span>
                                                    {themeMode === t_item.id && <Check className="w-3.5 h-3.5 text-zinc-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Language */}
                        <div>
                            <p className={fieldLabel}>{t('lang_section')}</p>
                            <div className="relative">
                                <button onClick={() => { closeAll(); setIsLangDropdownOpen(v => !v); }} className={trigger}>
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        {LANGUAGES.find(l => l.id === lang)?.label}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isLangDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={closeAll} />
                                        <div className={menu}>
                                            {LANGUAGES.map(l_item => (
                                                <button key={l_item.id}
                                                    onClick={() => { onLangChange(l_item.id as any); closeAll(); }}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${lang === l_item.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}>
                                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{l_item.label}</span>
                                                    {lang === l_item.id && <Check className="w-3.5 h-3.5 text-zinc-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Notifications */}
                        {isNotificationSupported() && (
                            <div className="flex items-center justify-between gap-4 pt-2">
                                <div>
                                    <p className={rowTitle}>{t('notifications_browser_label')}</p>
                                    <p className={rowSub}>{t('notifications_browser_desc')}</p>
                                </div>
                                <Toggle checked={notificationsEnabled} onChange={() => handleNotificationToggle(!notificationsEnabled)} />
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Sonstiges ── */}
                <section className="pt-6">
                    <div className="flex items-center justify-between">
                        <button
                            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            onClick={onSignOut}
                        >
                            {t('logout_btn')}
                        </button>
                        <button
                            className="text-xs text-red-400 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            onClick={async () => {
                                const confirmed = await confirm({
                                    title: t('settings_delete_account'),
                                    description: t('settings_delete_account_desc'),
                                    confirmLabel: t('delete'),
                                    cancelLabel: t('cancel'),
                                    variant: 'danger'
                                });
                                if (confirmed) onDeleteAccount();
                            }}
                        >
                            {t('delete_account_permanently')}
                        </button>
                    </div>
                </section>
            </div>

            <CreditsModal
                isOpen={isCreditsModalOpen}
                onClose={() => setIsCreditsModalOpen(false)}
                currentBalance={currentBalance}
                onAddFunds={onAddFunds}
                t={t}
            />
        </Modal>
    );
};
