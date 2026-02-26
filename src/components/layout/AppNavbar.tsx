import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, MoreHorizontal, Plus, Upload, Wand2, Trash2, RefreshCcw, Settings, CheckSquare, LogOut, SquarePen, RotateCw } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Theme, Typo, RoundIconButton, Button, Tooltip } from '../ui/DesignSystem';
import { DropdownMenu } from '../ui/DropdownMenu';

interface AppNavbarProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreate: () => void;
    onSignIn?: () => void;
    onToggleSettings?: () => void;
    onSignOut?: () => void;
    onSelectMode?: () => void;
    isSelectMode?: boolean;
    onCancelSelectMode?: () => void;
    onDeleteSelected?: () => void;
    onGenerateMoreSelected?: () => void;
    onGenerateMoreDetail?: () => void;
    selectedCount?: number;
    t: (key: any) => string;
    mode?: 'grid' | 'detail';
    detailInfo?: string;
    detailActions?: React.ReactNode;
    onBack?: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
    user,
    userProfile,
    credits,
    onCreate,
    onSignIn,
    onToggleSettings,
    onSignOut,
    onSelectMode,
    isSelectMode,
    onCancelSelectMode,
    onDeleteSelected,
    onGenerateMoreSelected,
    onGenerateMoreDetail,
    selectedCount = 0,
    t,
    mode = 'grid',
    detailInfo,
    detailActions,
    onBack
}) => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isGridMenuOpen, setIsGridMenuOpen] = useState(false);
    const createDropdownRef = useRef<HTMLDivElement>(null);
    const gridMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;

            if (isCreateOpen && createDropdownRef.current && !createDropdownRef.current.contains(target)) {
                setIsCreateOpen(false);
            }

            if (isGridMenuOpen && gridMenuRef.current && !gridMenuRef.current.contains(target)) {
                setIsGridMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isCreateOpen, isGridMenuOpen]);

    const isDetail = mode === 'detail';
    const isGerman = t('current_lang') === 'de';

    const leftContent = isDetail ? (
        <div className="flex items-center gap-4">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onBack} variant="ghost" />
            <Tooltip text={isGerman ? 'Guthaben anzeigen' : 'Show balance'}>
                <button
                    onClick={onToggleSettings}
                    className="text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                >
                    {credits.toFixed(2)} €
                </button>
            </Tooltip>
        </div>
    ) : isSelectMode ? (
        <button
            onClick={onCancelSelectMode}
            className="px-4 h-8 text-[12px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-full transition-all"
        >
            {isGerman ? 'Abbrechen' : 'Cancel'}
        </button>
    ) : (
        user && (
            <div className="relative" ref={createDropdownRef}>
                <RoundIconButton
                    icon={<Plus className="w-5 h-5" />}
                    onClick={() => setIsCreateOpen(!isCreateOpen)}
                    variant="ghost"
                    active={isCreateOpen}
                />
                {isCreateOpen && (
                    <div className="absolute top-full left-0 mt-2 z-50">
                        <DropdownMenu
                            items={[
                                { label: 'Generieren', icon: <SquarePen className="w-4 h-4" />, onClick: () => { setIsCreateOpen(false); onCreate(); } },
                                { label: 'Hochladen', icon: <Upload className="w-4 h-4" />, onClick: () => { setIsCreateOpen(false); } },
                            ]}
                        />
                    </div>
                )}
            </div>
        )
    );

    const centerContent = isSelectMode ? (
        <span className="text-[13px] font-normal text-zinc-500 dark:text-zinc-400 tabular-nums">
            {selectedCount} {isGerman ? (selectedCount === 1 ? 'Bild ausgewählt' : 'Bilder ausgewählt') : (selectedCount === 1 ? 'image selected' : 'images selected')}
        </span>
    ) : isDetail && detailInfo ? (
        <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight truncate max-w-[200px]">
            {detailInfo}
        </span>
    ) : (
        <button
            type="button"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onBack}
        >
            <Logo className="w-7 h-7" />
        </button>
    );

    const rightContent = isDetail ? (
        <div className="flex items-center gap-1">
            {detailActions}
        </div>
    ) : isSelectMode ? (
        <div className="flex items-center gap-1">
            <Tooltip text={isGerman ? 'Löschen' : 'Delete'}>
                <button
                    onClick={onDeleteSelected}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </Tooltip>
            <Tooltip text={isGerman ? 'Neu generieren' : 'Regenerate'}>
                <button
                    onClick={onGenerateMoreSelected}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                    <RefreshCcw className="w-4 h-4" />
                </button>
            </Tooltip>
        </div>
    ) : (
        <>
            {!user ? (
                <button
                    onClick={onSignIn}
                    className="px-4 h-8 text-[12px] font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:opacity-90 transition-all"
                >
                    {t('login_btn') || 'Login'}
                </button>
            ) : (
                <div className="relative" ref={gridMenuRef}>
                    <RoundIconButton
                        icon={<MoreHorizontal className="w-4 h-4" />}
                        onClick={() => setIsGridMenuOpen(p => !p)}
                        variant="ghost"
                        active={isGridMenuOpen}
                    />
                    {isGridMenuOpen && (
                        <div className="absolute top-full mt-2 right-0 z-50">
                            <DropdownMenu
                                items={[
                                    { label: isGerman ? 'Einstellungen' : 'Settings', icon: <Settings className="w-4 h-4" />, onClick: () => { setIsGridMenuOpen(false); onToggleSettings?.(); } },
                                    { label: isGerman ? 'Auswählen' : 'Select', icon: <CheckSquare className="w-4 h-4" />, onClick: () => { setIsGridMenuOpen(false); onSelectMode?.(); } },
                                    { label: isGerman ? 'Kontakt' : 'Contact', onClick: () => { setIsGridMenuOpen(false); window.open('/contact', '_blank'); }, separator: true },
                                    { label: 'Impressum', onClick: () => { setIsGridMenuOpen(false); window.open('/impressum', '_blank'); } },
                                    { label: isGerman ? 'Abmelden' : 'Sign out', icon: <LogOut className="w-4 h-4" />, onClick: () => { setIsGridMenuOpen(false); onSignOut?.(); }, separator: true },
                                ]}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );

    return (
        <header className="absolute top-0 left-0 right-0 h-14 z-50 pointer-events-none">
            {/* The background is completely transparent here to let canvas show through,
                but we add a subtle gradient if needed, or just let the elements themselves have backgrounds */}
            <div className="flex items-center justify-between px-4 h-full pointer-events-auto bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-900">

                <div className="flex items-center w-1/3">
                    {leftContent}
                </div>

                <div className="flex items-center justify-center gap-2 w-1/3">
                    {centerContent}
                </div>

                <div className="flex items-center justify-end gap-2 w-1/3">
                    {rightContent}
                </div>
            </div>
        </header>
    );
};
