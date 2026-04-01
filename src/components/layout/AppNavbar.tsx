import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, MoreHorizontal, Upload, Wand2, Trash2, Repeat, Settings2, CircleCheck, LogOut, SquarePen, RotateCw, Download, Info, Pencil, PanelRight, Plus, LayoutGrid, Euro, AudioLines, MicOff } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Theme, Typo, RoundIconButton, Button, Tooltip } from '../ui/DesignSystem';
import { ContextTip, ContextTipChip } from '../ui/ContextTip';
import { DropdownMenu } from '../ui/DropdownMenu';
import { GenerationProgressRing } from '../ui/GenerationProgressRing';
import { VoiceModeIndicator, type VoiceUiState } from '../voice/VoiceModeIndicator';
import { useMobile } from '@/hooks/useMobile';
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
    groupInfo?: string;
    detailActions?: React.ReactNode;
    onBack?: () => void;
    hasImages?: boolean;
    imageCount?: number;
    onDetailRename?: () => void;
    onDetailDownload?: () => void;
    onDetailDelete?: () => void;
    onDetailInfo?: () => void;
    onDetailRegenerate?: () => void;
    detailHasPrompt?: boolean;
    detailIsNew?: boolean;
    isSideSheetVisible?: boolean;
    isFeedSideSheetVisible?: boolean;
    onToggleSideSheet?: () => void;
    onToggleFeedSideSheet?: () => void;
    rightInset?: number;
    generatingImages?: CanvasImage[];
    onNavigateToImage?: (id: string) => void;
    onGenerateMoreById?: (id: string) => void;
    isGroupDrillDown?: boolean;
    onCloseGroup?: () => void;
    /** 0 = hero/expanded, 1 = compact. Grid mode only. */
    heroProgress?: number;
    /** Called when upload button is clicked in hero navbar mode */
    onHeroUploadClick?: () => void;
    isPublic?: boolean;
    onStartApp?: () => void;
    voiceFeatureEnabled?: boolean;
    voiceModeActive?: boolean;
    voiceModeState?: VoiceUiState;
    voiceLevel?: number;
    voiceError?: string | null;
    onStartVoiceMode?: () => void;
    onStopVoiceMode?: () => void;
    onRetryVoiceMode?: () => void;
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
    groupInfo,
    detailActions,
    onBack,
    hasImages = true,
    imageCount = 0,
    onDetailRename,
    onDetailDownload,
    onDetailDelete,
    onDetailInfo,
    onDetailRegenerate,
    detailHasPrompt,
    detailIsNew = false,
    isSideSheetVisible,
    isFeedSideSheetVisible,
    onToggleSideSheet,
    onToggleFeedSideSheet,
    rightInset = 0,
    generatingImages = [],
    onNavigateToImage,
    onGenerateMoreById,
    isGroupDrillDown = false,
    onCloseGroup,
    heroProgress,
    onHeroUploadClick,
    isPublic = false,
    onStartApp,
    voiceFeatureEnabled = false,
    voiceModeActive = false,
    voiceModeState = 'off',
    voiceLevel = 0,
    voiceError,
    onStartVoiceMode,
    onStopVoiceMode,
    onRetryVoiceMode
}) => {
    const isMobile = useMobile();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isGridMenuOpen, setIsGridMenuOpen] = useState(false);
    const [isDetailMenuOpen, setIsDetailMenuOpen] = useState(false);
    const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
    const createDropdownRef = useRef<HTMLDivElement>(null);
    const mobileCreateDropdownRef = useRef<HTMLDivElement>(null);
    const gridMenuRef = useRef<HTMLDivElement>(null);
    const detailMenuRef = useRef<HTMLDivElement>(null);
    const mobileDetailMenuRef = useRef<HTMLDivElement>(null);
    const publicMenuRef = useRef<HTMLDivElement>(null);

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
            if (isPublicMenuOpen && publicMenuRef.current && !publicMenuRef.current.contains(target)) {
                setIsPublicMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isCreateOpen, isGridMenuOpen, isDetailMenuOpen, isPublicMenuOpen]);

    const isDetail = mode === 'detail';
    const isCreate = mode === 'create';
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isGallery = !isDetail && !isCreate && (currentPath === '/' || currentPath === '');
    const isSpecialPage = ['/about', '/legal', '/impressum', '/contact', '/privacy', '/datenschutz'].includes(currentPath);

    const balanceDisplay = user && displayCredits !== null && (
        <Tooltip text={t('balance')}>
            <button
                onClick={onOpenCredits}
                className={`relative flex items-center justify-center rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group ${isMobile ? 'h-9 w-9 gap-0' : 'h-9 px-3 gap-1.5'}`}
            >
                <Euro className="shrink-0 w-[14px] h-[14px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
                {!isMobile && (
                    <span className="whitespace-nowrap font-medium leading-none text-[11px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                        {displayCredits.toFixed(2)}
                    </span>
                )}
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
            autoCloseWhenDone={mode === 'detail'}
        />
    );

    const voiceMenuItem = voiceFeatureEnabled
        ? [{
            label: voiceModeActive
                ? (lang === 'de' ? 'Sprachassistent beenden' : 'Stop assistant')
                : (lang === 'de' ? 'Sprachassistent' : 'Voice assistant'),
            icon: voiceModeActive ? <MicOff className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />,
            onClick: () => {
                setIsGridMenuOpen(false);
                if (voiceModeActive) {
                    onStopVoiceMode?.();
                } else {
                    onStartVoiceMode?.();
                }
            }
        }]
        : [];

    const leftContent = isDetail ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onBack} variant="ghost" />
            {progressRing}
        </div>
    ) : isCreate ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onBack} variant="ghost" />
            {progressRing}
        </div>
    ) : isSelectMode ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onCancelSelectMode} variant="ghost" />
            {progressRing}
        </div>
    ) : isGroupDrillDown ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onCloseGroup} variant="ghost" />
            {progressRing}
        </div>
    ) : (
        <div className="flex items-center gap-1">
            {isSpecialPage ? (
                <RoundIconButton
                    icon={<LayoutGrid className="w-5 h-5" />}
                    onClick={user ? (onBack || (() => window.location.href = '/')) : onSignIn}
                    variant="ghost"
                    tooltip={t('nav_gallery') || 'Galerie'}
                />
            ) : (
                <>
                    {!isPublic && user && (
                        <RoundIconButton
                            icon={<Upload className="w-5 h-5" />}
                            onClick={onHeroUploadClick}
                            variant="ghost"
                            tooltip={t('nav_upload')}
                        />
                    )}
                    {!isPublic && user && (
                        <RoundIconButton
                            icon={<Plus className="w-5 h-5" />}
                            onClick={onCreate}
                            variant="ghost"
                            tooltip={t('nav_create')}
                        />
                    )}
                </>
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
    ) : isGroupDrillDown && groupInfo ? (
        <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight truncate max-w-[220px]">
            {groupInfo}
        </span>
    ) : (
        <button
            type="button"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => { if (onBack) onBack(); else window.location.href = '/'; }}
        >
            <Logo className="w-7 h-7" />
        </button>
    );

    const rightContent = isCreate ? (
        <div className="flex items-center gap-2">
            {!isPublic && user && balanceDisplay}
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
                                { 
                                    label: isGallery ? (t('nav_select') || 'Bilder markieren') : (t('nav_gallery') || 'Galerie'), 
                                    icon: isGallery ? <CircleCheck className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />, 
                                    onClick: () => { 
                                        setIsGridMenuOpen(false); 
                                        if (isGallery) onSelectMode?.(); 
                                        else window.location.href = '/';
                                    } 
                                },
                                { label: t('nav_settings') || 'Einstellungen', icon: <Settings2 className="w-4 h-4" />, onClick: () => { setIsGridMenuOpen(false); onToggleSettings?.(); } },
                                ...voiceMenuItem,
                                { label: t('nav_contact') || 'Kontakt', separator: true, onClick: () => { setIsGridMenuOpen(false); window.location.href = '/contact'; } },
                                { label: t('nav_logout') || 'Ausloggen', danger: true, separator: true, onClick: () => { setIsGridMenuOpen(false); onSignOut?.(); } },
                            ]}
                        />
                    </div>
                )}
            </div>
        </div>
    ) : isDetail ? (
        <div className="flex items-center gap-2">
            <VoiceModeIndicator active={voiceModeActive} state={voiceModeState} level={voiceLevel} error={voiceError} onStop={onStopVoiceMode} onRetry={onRetryVoiceMode} />
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
                    tooltipShortcut="D"
                />
            </span>
            {detailHasPrompt && (
                <span className="relative hidden md:block">
                    <RoundIconButton
                        icon={<Repeat className="w-[18px] h-[18px]" />}
                        onClick={onDetailRegenerate}
                        variant="ghost"
                        tooltip={t('generate_more')}
                    />
                    <ContextTip
                        storageKey="expose_tip_generate_more_button_v4"
                        content={
                                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                                    {lang === 'de' ? 'Tippe auf ' : 'Click '}
                                <ContextTipChip
                                    icon={<Repeat className="h-3.5 w-3.5" />}
                                />
                                {lang === 'de'
                                    ? ', um mehr Varianten wie diese zu generieren.'
                                    : ' to generate more variations like this.'}
                                </p>
                        }
                        placement="below"
                        enabled={detailIsNew && detailHasPrompt}
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
            {!isFeedSideSheetVisible && (
                <Button variant="primary" size="s" onClick={onToggleFeedSideSheet}>
                    {t('nav_edit')}
                </Button>
            )}
        </div>
    ) : (
        <>
            {isPublic ? (
                <div className="flex items-center gap-3">
                    <Button
                        onClick={onStartApp}
                        variant="primary-mono"
                        size="s"
                        icon={<ChevronLeft className="w-4 h-4 rotate-180" />}
                        iconPosition="right"
                        className="min-w-[88px]"
                    >
                        {t('nav_start') || 'Start'}
                    </Button>
                </div>
            ) : !user ? (
                <button
                    onClick={onSignIn}
                    className="px-4 h-8 text-[12px] font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:opacity-90 transition-all"
                >
                    {t('login_btn') || 'Login'}
                </button>
            ) : (
                <div className="flex items-center gap-3">
                    {balanceDisplay}
                    <VoiceModeIndicator active={voiceModeActive} state={voiceModeState} level={voiceLevel} error={voiceError} onStop={onStopVoiceMode} onRetry={onRetryVoiceMode} />
                    <div className="relative" ref={gridMenuRef}>
                        <RoundIconButton
                            icon={<MoreHorizontal className="w-4 h-4" />}
                            onClick={() => setIsGridMenuOpen(p => !p)}
                            variant="ghost"
                            active={isGridMenuOpen}
                            tooltip={t('nav_menu')}
                        />
                        {isGallery && (
                            <ContextTip
                                storageKey="expose_tip_select_images_v1"
                                content={
                                    <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                                        {lang === 'de' ? 'Gehe zu ' : 'Go to '}
                                        <ContextTipChip
                                            icon={<CircleCheck className="h-3.5 w-3.5" />}
                                            label={lang === 'de' ? 'Bilder auswählen' : 'Select images'}
                                        />
                                        {lang === 'de'
                                            ? ', um mehrere Bilder gleichzeitig zu bearbeiten.'
                                            : ' to edit multiple images at once.'}
                                    </p>
                                }
                                placement="below"
                                enabled={isGallery && imageCount >= 2 && !isSelectMode}
                                anchorClassName="absolute left-0 top-0 h-9 w-9 pointer-events-none"
                            />
                        )}
                        {isGridMenuOpen && (
                            <div className="absolute top-full mt-2 right-0 z-50">
                                <DropdownMenu
                                            items={[
                                                { 
                                                    label: isGallery ? (t('nav_select') || 'Bilder markieren') : (t('nav_gallery') || 'Galerie'), 
                                                    icon: isGallery ? <CircleCheck className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />, 
                                                    onClick: () => { 
                                                        setIsGridMenuOpen(false); 
                                                        if (isGallery) onSelectMode?.(); 
                                                        else window.location.href = '/';
                                                    } 
                                                },
                                                { label: t('nav_settings') || 'Einstellungen', icon: <Settings2 className="w-4 h-4" />, onClick: () => { setIsGridMenuOpen(false); onToggleSettings?.(); } },
                                                ...voiceMenuItem,
                                                { label: t('nav_contact') || 'Kontakt', separator: true, onClick: () => { setIsGridMenuOpen(false); window.location.href = '/contact'; } },
                                                { label: t('nav_logout') || 'Ausloggen', danger: true, separator: true, onClick: () => { setIsGridMenuOpen(false); onSignOut?.(); } },
                                            ]}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );

    // Expanded navbar — 3-column layout, collapses on scroll with CSS transitions
    // Expandable only for non-functional top-level pages
    const isHeroMode = heroProgress !== undefined && !isDetail && !isCreate && !isSelectMode && !isGroupDrillDown;

    if (isHeroMode) {
        const hp = heroProgress!;
        const isScrolled = hp > 0.4;
        const showBorder = hp > 0.9;

        return (
            <header
                className={`fixed top-0 left-0 right-0 z-50 flex items-center px-4 md:px-6 transition-all duration-300 border-b ${showBorder
                    ? 'border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/85'
                    : 'border-transparent bg-white/0 dark:bg-zinc-950/0'
                    } ${isScrolled
                        ? 'h-14 backdrop-blur-none'
                        : 'h-[88px] md:h-[148px] backdrop-blur-none border-transparent pointer-events-none'
                    }`}
            >
                {/* LEFT: Upload + Create (with labels when expanded) */}
                <div className="flex-1 basis-0 grow flex items-center gap-2 justify-start relative z-10 pointer-events-auto min-w-0">
                    {isSpecialPage ? (
                        <button
                            className={`relative flex items-center justify-center rounded-full transition-all duration-300 group ${isScrolled
                                ? 'h-9 w-9 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                : isMobile
                                    ? 'h-10 w-10 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                    : 'h-10 px-5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-2'
                                }`}
                            onClick={user ? (onBack || (() => window.location.href = '/')) : onSignIn}
                        >
                            <LayoutGrid className={`shrink-0 transition-all duration-300 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`} />
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-center ${isScrolled || isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'
                                    }`}
                            >
                                <span className="whitespace-nowrap text-sm font-medium leading-none text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                    {t('nav_gallery') || 'Galerie'}
                                </span>
                            </div>
                        </button>
                    ) : isPublic ? (
                        <button
                            className={`relative flex items-center justify-center rounded-full transition-all duration-300 group ${isScrolled
                                ? 'h-9 w-9 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                : isMobile
                                    ? 'h-10 w-10 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                    : 'h-10 px-5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-2'
                                }`}
                            onClick={user ? (onBack || (() => window.location.href = '/')) : onSignIn}
                        >
                            <LayoutGrid className={`shrink-0 transition-all duration-300 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`} />
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-center ${isScrolled || isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'
                                    }`}
                            >
                                <span className="whitespace-nowrap text-sm font-medium leading-none text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                    {t('nav_gallery') || 'Galerie'}
                                </span>
                            </div>
                        </button>
                    ) : (
                        user && (
                            <>
                                <button
                                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 group ${isScrolled
                                        ? 'h-9 w-9 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                        : isMobile
                                            ? 'h-10 w-10 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                            : 'h-10 px-5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-2'
                                        }`}
                                    onClick={onHeroUploadClick}
                                >
                                    <Upload className={`shrink-0 transition-all duration-300 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`} />
                                    <div
                                        className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-center ${isScrolled || isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'
                                            }`}
                                    >
                                        <span className="whitespace-nowrap text-sm font-medium leading-none text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                            {t('nav_upload') || 'Hochladen'}
                                        </span>
                                    </div>
                                </button>
                                <button
                                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 group ${isScrolled
                                        ? 'h-9 w-9 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                        : isMobile
                                            ? 'h-10 w-10 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                            : 'h-10 px-5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-2'
                                        }`}
                                    onClick={onCreate}
                                >
                                    <Plus className={`shrink-0 transition-all duration-300 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`} />
                                    <div
                                        className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-center ${isScrolled || isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'
                                            }`}
                                    >
                                        <span className="whitespace-nowrap text-sm font-medium leading-none text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                            {t('nav_create') || 'Generieren'}
                                        </span>
                                    </div>
                                </button>
                            </>
                        )
                    )}
                    {progressRing}
                </div>

                {/* CENTER: Logo + Wordmark — absolute for true centering regardless of left/right width */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center group cursor-pointer z-10 pointer-events-auto" onClick={() => { if (onBack) onBack(); else window.location.href = '/'; }}>
                    <div className="flex items-center justify-center">
                        {/* Official Logo */}
                        <Logo
                            className={`shrink-0 object-contain transition-all duration-500 ease-out ${isScrolled
                                ? 'w-7 h-7'
                                : 'w-[30.5px] h-[30.5px] md:w-[45px] md:h-[45px] lg:w-[52px] h-[52px] group-active:scale-95'
                                }`}
                        />

                        {/* Text "EXPOSE" — ml transitions to 0 when collapsed so icon stays centered */}
                        <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${isScrolled ? 'w-0 ml-0 opacity-0' : 'w-[72px] md:w-[106px] lg:w-[129px] ml-[11.4px] opacity-100'
                                }`}
                        >
                            <span
                                className="font-kumbh font-normal text-[18.5px] md:text-[27px] lg:text-[31.5px] text-zinc-900 dark:text-white whitespace-nowrap leading-none pb-[1px] md:pb-[1.5px] lg:pb-[2px]"
                                style={{ letterSpacing: '-0.005em' }}
                            >
                                exposé
                            </span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: System Actions / Login */}
                <div className="flex-1 basis-0 grow flex items-center justify-end pointer-events-auto min-w-0">
                    <div className="flex items-center gap-1.5">
                        {isPublic ? (
                            <>
                                <Button
                                    onClick={onStartApp}
                                    variant="primary-mono"
                                    size={isScrolled ? "s" : "m"}
                                    icon={<ChevronLeft className="w-4 h-4 rotate-180" />}
                                    iconPosition="right"
                                    className="min-w-[88px]"
                                >
                                    {t('nav_start') || 'Start'}
                                </Button>
                            </>
                        ) : !user ? (
                            <button
                                onClick={onSignIn}
                                className={`px-5 transition-all duration-300 font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:opacity-90 ${isScrolled ? 'h-8 text-[12px]' : 'h-10 text-[13px]'}`}
                            >
                                {t('login_btn') || 'Login'}
                            </button>
                        ) : (
                            <>
                                {credits !== undefined && credits !== null && user && (
                                    <Tooltip text={t('balance')}>
                                        <button
                                            onClick={onOpenCredits}
                                            className={`relative flex items-center justify-center rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300 group ${isScrolled
                                                ? isMobile ? 'h-9 w-9 gap-0' : 'h-9 px-3 gap-1.5'
                                                : isMobile ? 'h-10 w-10 gap-0' : 'h-10 px-5 gap-2'
                                            }`}
                                        >
                                            <Euro className={`shrink-0 transition-all duration-300 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'w-[14px] h-[14px]' : 'w-4 h-4'}`} />
                                            {!isMobile && (
                                                <span className={`whitespace-nowrap font-medium leading-none text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'text-[11px]' : 'text-sm'}`}>
                                                    {(displayCredits ?? credits).toFixed(2)}
                                                </span>
                                            )}
                                        </button>
                                    </Tooltip>
                                )}

                                <VoiceModeIndicator active={voiceModeActive} state={voiceModeState} level={voiceLevel} error={voiceError} onStop={onStopVoiceMode} onRetry={onRetryVoiceMode} large={!isScrolled} />

                                <div className="relative" ref={gridMenuRef}>
                                    <button
                                        className={`relative flex items-center justify-center rounded-full transition-all duration-300 group ${isScrolled
                                            ? 'h-9 w-9 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                            : isMobile
                                                ? 'h-10 w-10 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                                : 'h-10 px-5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-2'
                                            }`}
                                        onClick={() => setIsGridMenuOpen(p => !p)}
                                    >
                                        <MoreHorizontal className={`shrink-0 transition-all duration-300 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`} />
                                        <div
                                            className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-center ${isScrolled || isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'
                                                }`}
                                        >
                                            <span className="whitespace-nowrap text-sm font-medium leading-none text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                                {t('nav_menu') || 'Menü'}
                                            </span>
                                        </div>
                                    </button>
                                    {isGallery && (
                                        <ContextTip
                                            storageKey="expose_tip_select_images_v1"
                                            content={
                                                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                                                    {lang === 'de' ? 'Gehe zu ' : 'Go to '}
                                                    <ContextTipChip
                                                        icon={<CircleCheck className="h-3.5 w-3.5" />}
                                                        label={lang === 'de' ? 'Bilder auswählen' : 'Select images'}
                                                    />
                                                    {lang === 'de'
                                                        ? ', um mehrere Bilder gleichzeitig zu bearbeiten.'
                                                        : ' to edit multiple images at once.'}
                                                </p>
                                            }
                                            placement="below"
                                            enabled={isGallery && imageCount >= 2 && !isSelectMode}
                                            anchorClassName={isScrolled || isMobile
                                                ? 'absolute left-0 top-0 h-9 w-9 pointer-events-none'
                                                : 'absolute left-0 top-0 h-10 w-10 pointer-events-none'}
                                        />
                                    )}
                                    {isGridMenuOpen && (
                                        <div className="absolute top-full mt-2 right-0 z-50">
                                            <DropdownMenu
                                                items={[
                                                    {
                                                        label: isGallery ? (t('nav_select') || 'Bilder markieren') : (t('nav_gallery') || 'Galerie'),
                                                        icon: isGallery ? <CircleCheck className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />,
                                                        onClick: () => {
                                                            setIsGridMenuOpen(false);
                                                            if (isGallery) onSelectMode?.();
                                                            else window.location.href = '/';
                                                        }
                                                    },
                                                    { label: t('nav_settings') || 'Einstellungen', icon: <Settings2 className="w-4 h-4" />, onClick: () => { setIsGridMenuOpen(false); onToggleSettings?.(); } },
                                                    ...voiceMenuItem,
                                                    { label: t('nav_contact') || 'Kontakt', separator: true, onClick: () => { setIsGridMenuOpen(false); window.location.href = '/contact'; } },
                                                    { label: t('nav_logout') || 'Ausloggen', danger: true, separator: true, onClick: () => { setIsGridMenuOpen(false); onSignOut?.(); } },
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 h-14 bg-white/90 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 md:px-6 transition-all duration-300`}
        >
            {/* LEFT: Back or Actions */}
            <div className="flex-1 basis-0 grow flex items-center justify-start gap-1 min-w-0">
                {leftContent}
            </div>

            {/* CENTER: Title / Logo */}
            <div className="flex-none flex items-center justify-center mx-4 whitespace-nowrap min-w-0">
                {centerContent}
            </div>

            {/* RIGHT: User / System */}
            <div className="flex-1 basis-0 grow flex items-center justify-end gap-1 min-w-0">
                {rightContent}
            </div>
        </header>
    );
};
