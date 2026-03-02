import React, { useState } from 'react';
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
import { Theme, Button } from '../ui/DesignSystem';

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
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose,
    qualityMode, onQualityModeChange, currentBalance, onAddFunds,
    themeMode, onThemeChange, lang, onLangChange, onSignOut, onDeleteAccount, user, userProfile, t
}) => {
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState(false);
    const [isAppearanceDropdownOpen, setIsAppearanceDropdownOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [notificationsEnabled, setNotificationsEnabledState] = useState(areNotificationsEnabled());
    const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());
    const [showPermissionHint, setShowPermissionHint] = useState(false);
    const { confirm } = useItemDialog();

    const handleNotificationToggle = async (enabled: boolean) => {
        if (notificationPermission === 'denied') {
            setShowPermissionHint(true);
            setTimeout(() => setShowPermissionHint(false), 3000);
            return;
        }
        if (enabled && notificationPermission !== 'granted') {
            const permission = await requestNotificationPermission();
            setNotificationPermission(permission);
            if (permission !== 'granted') {
                setShowPermissionHint(true);
                setTimeout(() => setShowPermissionHint(false), 3000);
                return;
            }
        }
        setNotificationsEnabled(enabled);
        setNotificationsEnabledState(enabled);
    };

    const MODES: { id: GenerationQuality, label: string, desc: string, price: string }[] = [
        { id: 'pro-1k', label: 'Nano Banana Pro 1K', desc: '1024 px', price: '0.10 €' },
        { id: 'pro-2k', label: 'Nano Banana Pro 2K', desc: '2048 px', price: '0.25 €' },
        { id: 'pro-4k', label: 'Nano Banana Pro 4K', desc: '4096 px', price: '0.50 €' },
        { id: 'nb2-1k', label: 'Nano Banana 2 · 1K', desc: '1024 px · schnell', price: '0.07 €' },
        { id: 'nb2-2k', label: 'Nano Banana 2 · 2K', desc: '2048 px · schnell', price: '0.17 €' },
        { id: 'nb2-4k', label: 'Nano Banana 2 · 4K', desc: '4096 px · schnell', price: '0.35 €' },
    ];

    const THEMES = [
        { id: 'light', label: t('mode_light') },
        { id: 'dark', label: t('mode_dark') },
        { id: 'auto', label: t('mode_system') }
    ];

    const LANGUAGES = [
        { id: 'de', label: 'Deutsch' },
        { id: 'en', label: 'English' },
        { id: 'auto', label: 'Auto' }
    ];

    const userInitial = user?.email?.[0]?.toUpperCase() || 'U';

    const card = "bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl";
    const pickerTrigger = "w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all";
    const pickerMenu = `absolute top-full left-0 right-0 mt-1.5 p-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50 text-left shadow-sm`;

    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 px-1 mb-2">{children}</p>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('tab_settings') || 'Settings'}
            maxWidth="md"
        >
            <div className="px-6 pb-6 pt-2 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">

                {/* ── Account ── */}
                <section>
                    <SectionLabel>{t('tab_account')}</SectionLabel>
                    <div className={`${card} p-4 space-y-3`}>

                        {/* Profile row */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{userInitial}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-400 mb-0.5">{t('settings_email_label')}</p>
                                <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{user?.email}</p>
                            </div>
                            <Button variant="ghost" size="s" onClick={onSignOut}>
                                {t('logout_btn')}
                            </Button>
                        </div>

                        <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60" />

                        {/* Balance row */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-zinc-400 mb-1">{t('balance')}</p>
                                <span className="text-xl font-semibold text-zinc-900 dark:text-white tabular-nums">
                                    {(currentBalance || 0).toFixed(2)} €
                                </span>
                            </div>
                            <Button variant="primary-mono" size="s" onClick={() => setIsCreditsModalOpen(true)}>
                                {t('top_up')}
                            </Button>
                        </div>
                    </div>
                </section>

                {/* ── General ── */}
                <section>
                    <SectionLabel>{t('tab_general')}</SectionLabel>
                    <div className="space-y-2.5">

                        {/* Quality */}
                        <div className={`${card} p-4`}>
                            <p className="text-xs text-zinc-400 mb-2.5">{t('creation_quality_label')}</p>
                            <div className="relative">
                                <button
                                    onClick={() => { setIsQualityDropdownOpen(!isQualityDropdownOpen); setIsAppearanceDropdownOpen(false); setIsLangDropdownOpen(false); }}
                                    className={pickerTrigger}
                                >
                                    <span className="text-sm text-zinc-900 dark:text-white">
                                        {MODES.find(m => m.id === qualityMode)?.label}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isQualityDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isQualityDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setIsQualityDropdownOpen(false)} />
                                        <div className={pickerMenu}>
                                            {MODES.map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => { onQualityModeChange(m.id); setIsQualityDropdownOpen(false); }}
                                                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${qualityMode === m.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                                                >
                                                    <div className="flex flex-col items-start">
                                                        <span className={`text-[13px] ${qualityMode === m.id ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>{m.label}</span>
                                                        <span className="text-[10px] text-zinc-400">{m.desc} · {m.price}</span>
                                                    </div>
                                                    {qualityMode === m.id && <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Theme + Language */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {/* Theme */}
                            <div className={`${card} p-4`}>
                                <p className="text-xs text-zinc-400 mb-2.5">{t('app_section')}</p>
                                <div className="relative">
                                    <button
                                        onClick={() => { setIsAppearanceDropdownOpen(!isAppearanceDropdownOpen); setIsQualityDropdownOpen(false); setIsLangDropdownOpen(false); }}
                                        className={pickerTrigger}
                                    >
                                        <span className="text-sm text-zinc-900 dark:text-white">
                                            {THEMES.find(t_item => t_item.id === themeMode)?.label}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isAppearanceDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isAppearanceDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsAppearanceDropdownOpen(false)} />
                                            <div className={pickerMenu}>
                                                {THEMES.map((t_item) => (
                                                    <button
                                                        key={t_item.id}
                                                        onClick={() => { onThemeChange(t_item.id as any); setIsAppearanceDropdownOpen(false); }}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${themeMode === t_item.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                                                    >
                                                        <span className={`text-[13px] ${themeMode === t_item.id ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>{t_item.label}</span>
                                                        {themeMode === t_item.id && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Language */}
                            <div className={`${card} p-4`}>
                                <p className="text-xs text-zinc-400 mb-2.5">{t('lang_section')}</p>
                                <div className="relative">
                                    <button
                                        onClick={() => { setIsLangDropdownOpen(!isLangDropdownOpen); setIsQualityDropdownOpen(false); setIsAppearanceDropdownOpen(false); }}
                                        className={pickerTrigger}
                                    >
                                        <span className="text-sm text-zinc-900 dark:text-white">
                                            {LANGUAGES.find(l => l.id === lang)?.label}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isLangDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsLangDropdownOpen(false)} />
                                            <div className={pickerMenu}>
                                                {LANGUAGES.map((l_item) => (
                                                    <button
                                                        key={l_item.id}
                                                        onClick={() => { onLangChange(l_item.id as any); setIsLangDropdownOpen(false); }}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${lang === l_item.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                                                    >
                                                        <span className={`text-[13px] ${lang === l_item.id ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>{l_item.label}</span>
                                                        {lang === l_item.id && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        {isNotificationSupported() && (() => {
                            const subtitle = notificationsEnabled
                                ? 'Wird nach jeder Generierung ausgelöst'
                                : notificationPermission === 'denied'
                                    ? 'Im Browser gesperrt'
                                    : notificationPermission === 'granted'
                                        ? 'Aktuell deaktiviert'
                                        : 'Erlaubnis wird beim Aktivieren angefragt';

                            return (
                                <div className={`${card} p-4`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm text-zinc-900 dark:text-white">Benachrichtigungen</p>
                                            <p className={`text-xs mt-0.5 transition-colors ${showPermissionHint ? 'text-red-500' : 'text-zinc-400'}`}>
                                                {showPermissionHint ? 'In den Browser-Einstellungen erlauben' : subtitle}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleNotificationToggle(!notificationsEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${notificationsEnabled ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </section>

                {/* ── Danger ── */}
                <section>
                    <SectionLabel>{t('delete_account_section')}</SectionLabel>
                    <Button
                        variant="danger"
                        size="m"
                        className="w-full"
                        onClick={async () => {
                            const confirmed = await confirm({
                                title: t('delete'),
                                description: t('settings_delete_account_desc'),
                                confirmLabel: t('delete').toUpperCase(),
                                cancelLabel: t('cancel').toUpperCase(),
                                variant: 'danger'
                            });
                            if (confirmed) onDeleteAccount();
                        }}
                    >
                        {t('delete_account_permanently')}
                    </Button>
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
