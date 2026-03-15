import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, MoreHorizontal, Upload, Wand2, Trash2, Repeat, Bolt, Square, LogOut, SquarePen, RotateCw, Download, Info, Pencil, PanelRight, Plus } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Theme, Typo, RoundIconButton, Button, Tooltip } from '../ui/DesignSystem';
import { DropdownMenu } from '../ui/DropdownMenu';
import { GenerationProgressRing } from '../ui/GenerationProgressRing';
import { CanvasImage } from '@/types';

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
    onDownloadSelected?: () => void;
    onGenerateMoreSelected?: () => void;
    onGenerateMoreDetail?: () => void;
    onOpenCredits?: () => void;
    selectedCount?: number;
    t: (key: any) => string;
    lang?: string;
    mode?: 'grid' | 'detail' | 'create';
    detailInfo?: string;
    detailActions?: React.ReactNode;
    onBack?: () => void;
    hasImages?: boolean;
    onDetailRename?: () => void;
    onDetailDownload?: () => void;
    onDetailDelete?: () => void;
    onDetailInfo?: () => void;
    onDetailRegenerate?: () => void;
    detailHasPrompt?: boolean;
    isSideSheetVisible?: boolean;
    onToggleSideSheet?: () => void;
    onToggleFeedSideSheet?: () => void;
    rightInset?: number;
    generatingImages?: CanvasImage[];
    onNavigateToImage?: (id: string) => void;
    onGenerateMoreById?: (id: string) => void;
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
    onDownloadSelected,
    onGenerateMoreSelected,
    onGenerateMoreDetail,
    onOpenCredits,
    selectedCount = 0,
    t,
    lang,
    mode = 'grid',
    detailInfo,
    detailActions,
    onBack,
    hasImages = true,
    onDetailRename,
    onDetailDownload,
    onDetailDelete,
    onDetailInfo,
    onDetailRegenerate,
    detailHasPrompt,
    isSideSheetVisible,
    onToggleSideSheet,
    onToggleFeedSideSheet,
    rightInset = 0,
    generatingImages = [],
    onNavigateToImage,
    onGenerateMoreById,
}) => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isGridMenuOpen, setIsGridMenuOpen] = useState(false);
    const [isDetailMenuOpen, setIsDetailMenuOpen] = useState(false);
    const createDropdownRef = useRef<HTMLDivElement>(null);
    const mobileCreateDropdownRef = useRef<HTMLDivElement>(null);
    const gridMenuRef = useRef<HTMLDivElement>(null);
    const detailMenuRef = useRef<HTMLDivElement>(null);
    const mobileDetailMenuRef = useRef<HTMLDivElement>(null);

    // Animated credit counter
    const [displayCredits, setDisplayCredits] = useState<number | null>(null);
    const renderCountRef = useRef(0);
    const prevCreditsRef = useRef(credits);
    const animRafRef = useRef<number | null>(null);

    useEffect(() => {
        renderCountRef.current++;

        // Skip first render - don't show initial 0 from props
        if (renderCountRef.current === 1) {
            prevCreditsRef.current = credits;
            return;
        }

        // Second render: display the first real value without animation
        if (renderCountRef.current === 2) {
            setDisplayCredits(credits);
            prevCreditsRef.current = credits;
            return;
        }

        // Third+ renders: animate on changes
        const from = prevCreditsRef.current;
        const to = credits;
        if (from === to) return;
        prevCreditsRef.current = to;

        const duration = 900;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayCredits(from + (to - from) * eased);
            if (progress < 1) {
                animRafRef.current = requestAnimationFrame(animate);
            }
        };

        if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
        animRafRef.current = requestAnimationFrame(animate);

        return () => { if (animRafRef.current) cancelAnimationFrame(animRafRef.current); };
    }, [credits]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;

            if (isCreateOpen
                && (!createDropdownRef.current || !createDropdownRef.current.contains(target))
                && (!mobileCreateDropdownRef.current || !mobileCreateDropdownRef.current.contains(target))) {
                setIsCreateOpen(false);
            }
            if (isGridMenuOpen && gridMenuRef.current && !gridMenuRef.current.contains(target)) {
                setIsGridMenuOpen(false);
            }
            if (isDetailMenuOpen
                && (!detailMenuRef.current || !detailMenuRef.current.contains(target))
                && (!mobileDetailMenuRef.current || !mobileDetailMenuRef.current.contains(target))) {
                setIsDetailMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isCreateOpen, isGridMenuOpen, isDetailMenuOpen]);

    const isDetail = mode === 'detail';
    const isCreate = mode === 'create';

    const balanceDisplay = user && displayCredits !== null && (
        <Tooltip text={t('balance')}>
            <button
                onClick={onOpenCredits}
                className="px-2.5 py-1 bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all font-mono text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95"
            >
                {displayCredits.toFixed(2)}€
            </button>
        </Tooltip>
    );

    const progressRing = (
        <GenerationProgressRing
            generatingImages={generatingImages}
            lang={lang}
            onNavigateToImage={onNavigateToImage}
            onGenerateMore={onGenerateMoreById}
            t={t}
        />
    );

    const leftContent = isCreate ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onBack} variant="ghost" />
        </div>
    ) : isDetail ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onBack} variant="ghost" />
            {progressRing}
        </div>
    ) : isSelectMode ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onCancelSelectMode} variant="ghost" />
            {progressRing}
        </div>
    ) : (
        <div className="flex items-center gap-1">
            {user && (
                <RoundIconButton
                    icon={<Plus className="w-5 h-5" />}
                    onClick={onCreate}
                    variant="ghost"
                    tooltip={t('nav_create')}
                />
            )}
            {progressRing}
        </div>
    );

    const centerContent = isSelectMode ? (
        <span className="text-[13px] font-normal text-zinc-500 dark:text-zinc-400 tabular-nums">
            {selectedCount} {selectedCount === 1 ? t('image_selected_singular') : t('images_selected_plural')}
        </span>
    ) : isDetail && detailInfo ? (
        <div className="flex items-center gap-1.5 relative" ref={detailMenuRef}>
            <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight truncate max-w-[160px]">
                {detailInfo}
            </span>
            <span className="hidden md:contents">
                <RoundIconButton
                    icon={<MoreHorizontal className="w-[18px] h-[18px]" />}
                    onClick={() => setIsDetailMenuOpen(p => !p)}
                    variant="ghost"
                    active={isDetailMenuOpen}
                    tooltip={t('nav_menu')}
                />
                {isDetailMenuOpen && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50">
                        <DropdownMenu
                            items={[
                                { label: t('nav_download'), icon: <Download className="w-4 h-4" />, onClick: () => { setIsDetailMenuOpen(false); onDetailDownload?.(); } },
                                ...(detailHasPrompt ? [{ label: t('generate_more'), icon: <Repeat className="w-4 h-4" />, onClick: () => { setIsDetailMenuOpen(false); onDetailRegenerate?.(); } }] : []),
                                { label: t('nav_info'), onClick: () => { setIsDetailMenuOpen(false); onDetailInfo?.(); } },
                                { label: t('nav_delete'), icon: <Trash2 className="w-4 h-4" />, onClick: () => { setIsDetailMenuOpen(false); onDetailDelete?.(); }, danger: true },
                            ]}
                        />
                    </div>
                )}
            </span>
        </div>
    ) : (
        <button
            type="button"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onBack}
        >
            <Logo className="w-7 h-7" />
        </button>
    );

    const rightContent = isCreate ? null : isDetail ? (
        <div className="flex items-center gap-1">
            {/* Mobile: 3-dot menu in the right corner */}
            <div className="relative md:hidden" ref={mobileDetailMenuRef}>
                <RoundIconButton
                    icon={<MoreHorizontal className="w-[18px] h-[18px]" />}
                    onClick={() => setIsDetailMenuOpen(p => !p)}
                    variant="ghost"
                    active={isDetailMenuOpen}
                />
                {isDetailMenuOpen && (
                    <div className="absolute top-full mt-2 right-0 z-50">
                        <DropdownMenu
                            items={[
                                { label: t('nav_download'), icon: <Download className="w-4 h-4" />, onClick: () => { setIsDetailMenuOpen(false); onDetailDownload?.(); } },
                                ...(detailHasPrompt ? [{ label: t('generate_more'), icon: <Repeat className="w-4 h-4" />, onClick: () => { setIsDetailMenuOpen(false); onDetailRegenerate?.(); } }] : []),
                                { label: t('nav_info'), onClick: () => { setIsDetailMenuOpen(false); onDetailInfo?.(); } },
                                { label: t('nav_delete'), icon: <Trash2 className="w-4 h-4" />, onClick: () => { setIsDetailMenuOpen(false); onDetailDelete?.(); }, danger: true },
                            ]}
                        />
                    </div>
                )}
            </div>
            {/* Desktop: individual icons */}
            <span className="hidden md:contents">
                <RoundIconButton
                    icon={<Download className="w-[18px] h-[18px]" />}
                    onClick={onDetailDownload}
                    variant="ghost"
                    tooltip={t('nav_download')}
                />
            </span>
            {detailHasPrompt && (
                <span className="hidden md:contents">
                    <RoundIconButton
                        icon={<Repeat className="w-[18px] h-[18px]" />}
                        onClick={onDetailRegenerate}
                        variant="ghost"
                        tooltip={t('generate_more')}
                    />
                </span>
            )}
            <span className="hidden md:contents">
                <RoundIconButton
                    icon={<PanelRight className="w-[18px] h-[18px]" />}
                    onClick={onToggleSideSheet}
                    variant="ghost"
                    tooltip={t('nav_sidebar')}
                />
            </span>
        </div>
    ) : isSelectMode ? (
        <div className="flex items-center gap-1">
            {selectedCount > 0 && (
                <RoundIconButton
                    icon={<Download className="w-[18px] h-[18px]" />}
                    onClick={onDownloadSelected}
                    variant="ghost"
                    tooltip={t('nav_download')}
                />
            )}
            <Tooltip text={t('nav_delete')}>
                <button
                    onClick={onDeleteSelected}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                >
                    <Trash2 className="w-[18px] h-[18px]" />
                </button>
            </Tooltip>
            {!isSideSheetVisible && (
                <Button variant="primary" size="s" onClick={onToggleFeedSideSheet}>
                    {t('nav_edit')}
                </Button>
            )}
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
                <div className="flex items-center gap-3">
                    {balanceDisplay}
                    <div className="relative" ref={gridMenuRef}>
                        <RoundIconButton
                            icon={<MoreHorizontal className="w-4 h-4" />}
                            onClick={() => setIsGridMenuOpen(p => !p)}
                            variant="ghost"
                            active={isGridMenuOpen}
                            tooltip={t('nav_menu')}
                        />
                        {isGridMenuOpen && (
                            <div className="absolute top-full mt-2 right-0 z-50">
                                <DropdownMenu
                                    items={[
                                        { label: t('nav_select'), icon: <Square className="w-4 h-4" />, onClick: () => { setIsGridMenuOpen(false); onSelectMode?.(); } },
                                        { label: t('nav_settings'), icon: <Bolt className="w-4 h-4" />, onClick: () => { setIsGridMenuOpen(false); onToggleSettings?.(); } },
                                        { label: t('nav_contact'), separator: true, onClick: () => { setIsGridMenuOpen(false); window.location.href = '/contact'; } },
                                    ]}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );

    return (
        <header className="fixed top-0 left-0 right-0 h-14 z-50 pointer-events-none">
            <div className="flex items-center justify-between px-4 h-full pointer-events-auto bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900">

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
