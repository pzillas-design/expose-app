import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, MoreHorizontal, PanelBottom, Maximize2, Minus, Upload, Wand2, Trash2, Repeat, Settings2, CircleCheck, LogOut, SquarePen, RotateCw, Download, Info, Pencil, PanelRight, Plus, LayoutGrid, Euro, AudioLines, MicOff } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Theme, Typo, RoundIconButton, Button, Tooltip } from '../ui/DesignSystem';
import { ContextTip, ContextTipChip } from '../ui/ContextTip';
import { DropdownMenu } from '../ui/DropdownMenu';
import { buildDetailMenuItems } from './detailMenu';
import { VoiceModeIndicator, type VoiceUiState } from '../voice/VoiceModeIndicator';
import { useMobile } from '@/hooks/useMobile';
import { MenuLines } from '@/components/ui/CustomIcons';
import { NAV_H, NAV_H_EXPANDED_MOBILE, NAV_H_EXPANDED_DESKTOP } from '@/config/layout';
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
    groupItemCount?: number;
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
    isGroupDrillDown?: boolean;
    /** Spanne der Fassungen im Stapel, z. B. "v1–v12". */
    groupVersionLabel?: string;
    /** Fassung des gezeigten Bildes, z. B. "v3" — steht abgedunkelt hinter dem Namen. */
    detailVersion?: string;
    onCloseGroup?: () => void;
    /** 0 = hero/expanded, 1 = compact. Grid mode only. */
    heroProgress?: number;
    /** Called when upload button is clicked in hero navbar mode */
    onHeroUploadClick?: () => void;
    /** Current detected grid column count */
    gridColumns?: number;
    /** Called to adjust grid columns by +1 or -1 */
    onAdjustColumns?: (delta: number) => void;
    /** 0 = hero/expanded, 1 = compact. Group drill-down mode only. */
    groupHeroProgress?: number;
    /** Called when "Ebenen öffnen" button is clicked in expanded group hero mode */
    onOpenLayerComposer?: () => void;
    /** Whether to show the "Ebenen öffnen" button (group has ≥2 images) */
    canOpenLayerComposer?: boolean;
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
    groupItemCount,
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
    isGroupDrillDown = false,
    groupVersionLabel,
    detailVersion,
    onCloseGroup,
    heroProgress,
    onHeroUploadClick,
    gridColumns,
    onAdjustColumns,
    groupHeroProgress,
    onOpenLayerComposer,
    canOpenLayerComposer = false,
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
    // Direkt gelesen statt durchgereicht: Die Vorliebe meldet ihre Aenderung
    // selbst, also brauchen weder App noch DetailPage davon zu wissen. Ein
    // Durchreichen durch zwei Ebenen waere mehr Code fuer dasselbe Ergebnis.
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

    // Beim Betreten der Galerie meldet diese zuerst Scrollposition 0 und erst
    // danach die wiederhergestellte Position. Die Leiste klappt dadurch
    // sichtbar ein, obwohl niemand gescrollt hat — das wirkt wie ein Ruckeln.
    //
    // Übergänge werden deshalb erst freigegeben, wenn sich die Ansicht gesetzt
    // hat. Bis dahin steht die Leiste sofort im richtigen Zustand. Animiert
    // wird nur noch, was der Nutzer selbst durch Scrollen auslöst.
    //
    // 500 ms entsprechen dem Fenster, in dem die Galerie ihre Scrollposition
    // wiederherstellt (siehe scrollTileToTop in FeedPage).
    const inHeroMode = heroProgress !== undefined && !isDetail && !isCreate && !isSelectMode && !isGroupDrillDown;
    const [heroTransitions, setHeroTransitions] = useState(false);
    useEffect(() => {
        if (!inHeroMode) { setHeroTransitions(false); return; }
        const t = window.setTimeout(() => setHeroTransitions(true), 500);
        return () => window.clearTimeout(t);
    }, [inHeroMode]);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isGallery = !isDetail && !isCreate && (currentPath === '/' || currentPath === '');
    const isSpecialPage = ['/about', '/legal', '/impressum', '/contact', '/privacy', '/datenschutz', '/blog'].includes(currentPath);
    const isBlogPost = /^\/blog\/.+/.test(currentPath);

    // Grid column adjuster inline item — shared across all grid menus
    /**
     * Kachelgroesse als zwei Eintraege mit Text statt als Pille mit + und −.
     *
     * Die Pille war ein Fremdkoerper in einer Liste aus Eintraegen: anderer
     * Treffbereich, anderes Verhalten beim Ueberfahren, und zwei Zeichen, die
     * ohne die Ueberschrift "Zoom" daneben nichts sagen. Als Eintraege
     * verhalten sie sich wie alles andere im Menue, und was sie tun, steht
     * da.
     *
     * Das Menue bleibt offen: Wer vergroessert, will meist zweimal
     * vergroessern.
     */
    const columnAdjusterItem = onAdjustColumns && gridColumns ? [
        {
            label: t('tiles_larger') || 'Kacheln größer',
            icon: <Plus className="w-4 h-4" />,
            separator: true,
            onClick: () => { if ((gridColumns ?? 2) > 2) onAdjustColumns(-1); },
        },
        {
            label: t('tiles_smaller') || 'Kacheln kleiner',
            icon: <Minus className="w-4 h-4" />,
            onClick: () => { if ((gridColumns ?? 2) < 6) onAdjustColumns(1); },
        },
    ] : [];

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

    /*
        Der Ladekreis in der Leiste ist weg.

        Er war immer da, immer gleich gross, und sagte nur "es laeuft etwas" —
        wer wissen wollte was, musste ihn anklicken. An seiner Stelle meldet
        sich jetzt die Benachrichtigung oben rechts von selbst und
        verschwindet wieder (GenerationNotice).
    */
    const progressRing = null;

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
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onBack} variant="soft" tooltip={t('back')} />
            {progressRing}
        </div>
    ) : isCreate ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onBack} variant="soft" tooltip={t('back')} />
            {progressRing}
        </div>
    ) : isSelectMode ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onCancelSelectMode} variant="soft" />
            {progressRing}
        </div>
    ) : isGroupDrillDown ? (
        <div className="flex items-center gap-1">
            <RoundIconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={onCloseGroup} variant="soft" />
            {progressRing}
        </div>
    ) : (
        <div className="flex items-center gap-1">
            {isBlogPost ? (
                <RoundIconButton
                    icon={<ChevronLeft className="w-5 h-5" />}
                    onClick={() => window.history.back()}
                    variant="soft"
                    tooltip="Blog"
                />
            ) : isSpecialPage ? (
                <RoundIconButton
                    icon={<LayoutGrid className="w-5 h-5" />}
                    onClick={user ? (onBack || (() => window.location.href = '/')) : onSignIn}
                    variant="ghost"
                    tooltip={t('nav_gallery') || 'Galerie'}
                />
            ) : (
                <>
                    {/* Single entry point: users kept hitting "Neu erstellen" when they
                        actually wanted to upload. Both options now live inside the
                        create canvas, so the navbar offers one unambiguous button. */}
                    {!isPublic && user && (
                        <RoundIconButton
                            icon={<Plus className="w-5 h-5" />}
                            onClick={onCreate}
                            variant="ghost"
                            tooltip={t('nav_create_tooltip')}
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
            {detailVersion && (
                <span className="text-[13px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                    {detailVersion}
                </span>
            )}
        </div>
    ) : isGroupDrillDown && groupInfo ? (
        <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight truncate max-w-[200px]">
                {groupInfo}
            </span>
            {groupVersionLabel && (
                <span className="text-[13px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                    {groupVersionLabel}
                </span>
            )}
        </div>
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
            <VoiceModeIndicator active={voiceModeActive} state={voiceModeState} level={voiceLevel} error={voiceError} onStop={onStopVoiceMode} onRetry={onRetryVoiceMode} />
            {!isPublic && user && balanceDisplay}
            <div className="relative" ref={gridMenuRef}>
                <RoundIconButton
                    icon={<MenuLines className="w-4 h-4" />}
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
                                ...columnAdjusterItem,
                                { label: t('nav_contact') || 'Kontakt', onClick: () => { setIsGridMenuOpen(false); window.location.href = '/contact'; } },
                                { label: t('nav_logout') || 'Ausloggen', danger: true, onClick: () => { setIsGridMenuOpen(false); onSignOut?.(); } },
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
            {/* Herunterladen bleibt als eigener Knopf: Du hattest zwei Symbole
                genannt, nicht drei, und dieses ist die haeufigste Handlung in
                der Detailansicht. Es steht zusaetzlich im Menue. */}
            <span className="hidden md:contents">
                <RoundIconButton
                    icon={<Download className="w-[18px] h-[18px]" />}
                    onClick={onDetailDownload}
                    variant="ghost"
                    tooltip={t('nav_download')}
                    tooltipShortcut="D"
                />
            </span>
            {/* Ein Menue, rechts, auf allen Breiten. Vorher lag eines in der
                Mitte neben dem Titel und ein zweites rechts fuer das Handy —
                zwei Knoepfe mit demselben Inhalt an zwei Orten. */}
            <div className="relative" ref={mobileDetailMenuRef}>
                <RoundIconButton
                    icon={<MenuLines className="w-[18px] h-[18px]" />}
                    onClick={() => setIsDetailMenuOpen(p => !p)}
                    variant="ghost"
                    active={isDetailMenuOpen}
                    tooltip={t('nav_menu')}
                />
                {isDetailMenuOpen && (
                    <div className="absolute top-full mt-2 right-0 z-50">
                        {/* Die Eintraege kommen aus detailMenu.tsx — dieselbe Liste,
                            die das Blatt der Detailansicht auf dem Desktop zeigt. */}
                        <DropdownMenu
                            items={buildDetailMenuItems({
                                t,
                                hasPrompt: !!detailHasPrompt,
                                onRegenerate: onDetailRegenerate,
                                onDownload: onDetailDownload,
                                onInfo: onDetailInfo,
                                onDelete: onDetailDelete,
                                voiceItems: voiceMenuItem,
                                close: () => setIsDetailMenuOpen(false),
                            })}
                        />
                    </div>
                )}
            </div>
        </div>
    ) : isSelectMode ? (
        <div className="flex items-center gap-1">
            <VoiceModeIndicator active={voiceModeActive} state={voiceModeState} level={voiceLevel} error={voiceError} onStop={onStopVoiceMode} onRetry={onRetryVoiceMode} />
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
                            icon={<MenuLines className="w-4 h-4" />}
                            onClick={() => setIsGridMenuOpen(p => !p)}
                            variant="ghost"
                            active={isGridMenuOpen}
                            tooltip={t('nav_menu')}
                        />
                        {isGallery && voiceFeatureEnabled && !voiceModeActive && (
                            <ContextTip
                                storageKey="expose_tip_voice_assistant_v1"
                                content={
                                    <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                                        {lang === 'de' ? 'Probiere den ' : 'Try the '}
                                        <ContextTipChip
                                            icon={<AudioLines className="h-3.5 w-3.5" />}
                                            label={lang === 'de' ? 'Sprachassistent' : 'Voice assistant'}
                                        />
                                        {lang === 'de'
                                            ? ' aus, bearbeite Bilder per Stimme.'
                                            : ', edit images with your voice.'}
                                    </p>
                                }
                                placement="below"
                                enabled={isGallery && !isSelectMode && !voiceModeActive}
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
                                                ...columnAdjusterItem,
                                                { label: t('nav_contact') || 'Kontakt', onClick: () => { setIsGridMenuOpen(false); window.location.href = '/contact'; } },
                                                { label: t('nav_logout') || 'Ausloggen', danger: true, onClick: () => { setIsGridMenuOpen(false); onSignOut?.(); } },
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

        // ── Die Leiste folgt dem Scroll, statt an Schwellen zu springen ──────
        //
        // heroProgress ist ein stetiger Wert zwischen 0 und 1, der pro
        // Scroll-Frame aktualisiert wird. Vorher wurde davon nur `> 0.4` und
        // `> 0.9` benutzt: Die Hoehe sprang an einem Punkt, der Hintergrund an
        // einem zweiten, und eine 300-ms-Animation hat die beiden Spruenge
        // nachtraeglich weichgezeichnet. Das ist der Grund, warum es nicht
        // rund wirkte — animiert wurde eine Reaktion auf einen Sprung, nicht
        // die Bewegung selbst. Zwischen 0,4 und 0,9 stand die Leiste
        // ausserdem schon schmal da, aber noch voellig durchsichtig, sodass
        // der Inhalt ohne alles dahinter durchlief.
        //
        // Jetzt werden Hoehe und Deckkraft direkt aus hp gerechnet. Die Hoehe
        // bekommt bewusst KEINE CSS-Animation: Sie aendert sich ohnehin jeden
        // Frame, und eine laufende Transition wuerde bei jedem neuen Wert von
        // vorn beginnen — das ergibt genau das gummiartige Nachziehen.
        const expandedH = isMobile ? NAV_H_EXPANDED_MOBILE : NAV_H_EXPANDED_DESKTOP;
        const collapsedH = NAV_H;
        const headerH = expandedH + (collapsedH - expandedH) * hp;
        // Der Untergrund kommt frueher und ist bei zwei Dritteln des Weges
        // voll da — so steht etwas hinter dem Inhalt, bevor er die Leiste
        // erreicht, statt erst kurz vor Schluss aufzutauchen.
        const surfaceOpacity = Math.min(1, Math.max(0, (hp - 0.1) / 0.55));

        return (
            <header
                // Eigener key je Variante: Ohne ihn verwendet React beim Wechsel
                // zwischen Galerie und Detailansicht dasselbe DOM-Element weiter,
                // und transition-all animiert dann zwischen den Zuständen — die
                // Kopfzeile fährt sichtbar ein und blendet kurz einen
                // Weichzeichner ein, den es in dieser Ansicht gar nicht gibt.
                // Mit key wird neu aufgebaut und startet im Endzustand.
                key="nav-gallery"
                style={{ height: `${headerH}px` }}
                className={`fixed top-0 left-0 right-0 z-50 flex items-center px-4 md:px-6 ${
                    // Keine Linie mehr. Die Kante entsteht allein aus dem
                    // Untergrund, und der laeuft unten weich aus.
                    ''
                } ${
                    // Nur die Kindelemente stillstellen, solange die Ansicht
                    // gerade wechselt — Knoepfe und Pfeil skalieren mit
                    // isScrolled und wuerden sonst mitlaufen.
                    heroTransitions ? '' : '[&_*]:!transition-none'
                } ${hp < 0.4 ? 'pointer-events-none' : ''}`}
            >
                {/*
                    Untergrund als eigene Ebene.

                    Der Weichzeichner sitzt bewusst NICHT auf der Kopfzeile
                    selbst: Deren Hoehe aendert sich beim Scrollen jeden Frame,
                    und ein backdrop-filter muesste dann jedes Mal neu
                    abgetastet werden — das war das Flackern, wegen dem der
                    Weichzeichner zwischenzeitlich ganz raus war. Diese Ebene
                    hat eine feste Groesse innerhalb der Kopfzeile und aendert
                    nur ihre Deckkraft, was die Grafikkarte allein erledigt.

                    Stark weichgezeichnet, aber nur leicht eingefaerbt: Man
                    sieht, dass etwas dahinter ist, ohne dass es zur Flaeche
                    wird. Ohne Maske: Ein weiches Auslaufen nach unten sah auf
                    Textseiten wie ein Farbverlauf aus statt wie eine Kante.
                    Eine durchscheinende, weichgezeichnete Flaeche trennt auch
                    mit gerader Unterkante genug — so machen es die
                    Systemleisten von macOS und iOS auch.
                */}
                <div
                    aria-hidden
                    className="absolute inset-0 -z-10 backdrop-blur-2xl bg-white/60 dark:bg-zinc-950/50"
                    style={{
                        opacity: surfaceOpacity,
                    }}
                />
                {/* LEFT: Upload + Create (with labels when expanded) */}
                <div className="flex-1 basis-0 grow flex items-center gap-2 justify-start relative z-10 pointer-events-auto min-w-0">
                    {isBlogPost ? (
                        <button
                            className={`relative flex items-center justify-center rounded-full transition-all duration-300 group ${isScrolled
                                ? 'h-9 w-9 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                : isMobile
                                    ? 'h-10 w-10 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-0'
                                    : 'h-10 px-5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-2'
                                }`}
                            onClick={() => window.history.back()}
                        >
                            <ChevronLeft className={`shrink-0 transition-all duration-300 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`} />
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-center ${isScrolled || isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}
                            >
                                <span className="whitespace-nowrap text-sm font-medium leading-snug text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                    Blog
                                </span>
                            </div>
                        </button>
                    ) : isSpecialPage ? (
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
                                <span className="whitespace-nowrap text-sm font-medium leading-snug text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
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
                                <span className="whitespace-nowrap text-sm font-medium leading-snug text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                    {t('nav_gallery') || 'Galerie'}
                                </span>
                            </div>
                        </button>
                    ) : (
                        user && (
                            <>
                                {/* One entry point only — upload vs. generate is chosen
                                    inside the create canvas. Users kept pressing
                                    "Neu erstellen" when they meant to upload. */}
                                <Tooltip text={t('nav_create_tooltip')} side="bottom">
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
                                            <span className="whitespace-nowrap text-sm font-medium leading-snug text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                                {t('nav_create') || 'Erstellen'}
                                            </span>
                                        </div>
                                    </button>
                                </Tooltip>
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
                                ? 'w-6 h-6'
                                // Eine Stufe kleiner. Nebenbei: In der ausgefahrenen
                                // Angabe stand zweimal eine Hoehe (h-[30.5px] und
                                // h-[52px] ohne lg:), die zweite hat die erste auf
                                // allen Breiten ueberschrieben — das Logo war also
                                // nie quadratisch, sondern immer 52 hoch.
                                : 'w-[26px] h-[26px] md:w-[38px] md:h-[38px] lg:w-[44px] lg:h-[44px] group-active:scale-95'
                                }`}
                        />

                        {/* Text "EXPOSE" — ml transitions to 0 when collapsed so icon stays centered */}
                        <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${isScrolled ? 'w-0 ml-0 opacity-0' : 'w-[62px] md:w-[90px] lg:w-[110px] ml-[10px] opacity-100'
                                }`}
                        >
                            <span
                                className="font-kumbh font-normal text-[16px] md:text-[23px] lg:text-[27px] text-zinc-900 dark:text-white whitespace-nowrap leading-none pb-[1px] md:pb-[1.5px] lg:pb-[2px]"
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
                                        <MenuLines className={`shrink-0 transition-all duration-300 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 ${isScrolled ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`} />
                                        <div
                                            className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-center ${isScrolled || isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'
                                                }`}
                                        >
                                            <span className="whitespace-nowrap text-sm font-medium leading-snug text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 hidden md:inline">
                                                {t('nav_menu') || 'Menü'}
                                            </span>
                                        </div>
                                    </button>
                                    {isGallery && voiceFeatureEnabled && !voiceModeActive && (
                                        <ContextTip
                                            storageKey="expose_tip_voice_assistant_v1"
                                            content={
                                                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                                                    {lang === 'de' ? 'Probiere den ' : 'Try the '}
                                                    <ContextTipChip
                                                        icon={<AudioLines className="h-3.5 w-3.5" />}
                                                        label={lang === 'de' ? 'Sprachassistent' : 'Voice assistant'}
                                                    />
                                                    {lang === 'de'
                                                        ? ' aus und bearbeite Bilder per Stimme.'
                                                        : ' and edit images with your voice.'}
                                                </p>
                                            }
                                            placement="below"
                                            enabled={isGallery && !isSelectMode && !voiceModeActive}
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
                                                    ...columnAdjusterItem,
                                                    { label: t('nav_contact') || 'Kontakt', onClick: () => { setIsGridMenuOpen(false); window.location.href = '/contact'; } },
                                                    { label: t('nav_logout') || 'Ausloggen', danger: true, onClick: () => { setIsGridMenuOpen(false); onSignOut?.(); } },
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

    // Expandable batch / group drill-down header — mirrors the main gallery hero but shows
    // the group title centered and an "Ebenen öffnen" action instead of the logo.
    const isGroupHeroMode = isGroupDrillDown && !isSelectMode && !isDetail && !isCreate && groupHeroProgress !== undefined;

    if (isGroupHeroMode) {
        // The batch header is always the compact bar — no hero expansion,
        // scrolling has no effect. Matches the detail view's header exactly
        // so navigating between the levels never jumps.
        return (
            <header
                key="nav-stack"
                // Keine Übergänge: Diese Kopfzeile ist immer schmal, es gibt
                // nichts zu animieren — und beim Ansichtswechsel wäre jede
                // Animation ein Fehler, kein Effekt.
                className="fixed top-0 left-0 right-0 z-50 h-[var(--nav-h)] flex items-center px-4 md:px-6"
            >
            {/*
                Untergrund als eigene Ebene, nicht auf der Kopfzeile selbst.

                Eine Maske beschneidet ALLE Nachkommen auf die Flaeche des
                maskierten Elements. Lag sie auf der Kopfzeile, verschwand jedes
                Aufklappmenue spurlos: Die Liste steht per `top-full` vollstaendig
                unterhalb der Kopfzeile, also im vollstaendig transparenten Teil
                der Maske. Genau deshalb liess sich das Menue in der
                Detailansicht nicht mehr oeffnen — es wurde geoeffnet, aber nicht
                gezeichnet.

                Gleiche Bauweise wie in der Galerie-Kopfzeile: Der
                Weichzeichner sitzt auf einer Ebene darunter, die Kopfzeile
                selbst beschneidet nichts.
            */}
            <div
                aria-hidden
                className="absolute inset-0 -z-10 backdrop-blur-2xl bg-white/60 dark:bg-zinc-950/50"
            />
                {/* LEFT: Back button */}
                <div className="flex-1 basis-0 grow flex items-center gap-2 justify-start relative z-10 pointer-events-auto">
                    <button
                        className="relative flex items-center justify-center rounded-full transition-all duration-300 group h-9 w-9 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={onCloseGroup}
                    >
                        <ChevronLeft className="shrink-0 w-[18px] h-[18px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                    </button>
                    {progressRing}
                </div>

                {/* CENTER: Group title — same font as the detail view; a folder icon
                    to the left of the title is the minimal "this is a stack" signal. */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 justify-center pointer-events-none z-10 max-w-[60%]">
                    <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                        {groupInfo}
                    </span>
                    {groupVersionLabel && (
                        <span className="text-[13px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                            {groupVersionLabel}
                        </span>
                    )}
                </div>

                {/* RIGHT: balance + menu — the layer composer is now entered via the
                    "Ebenen kombinieren" tile in the grid, so no navbar button here. */}
                <div className="flex-1 basis-0 grow flex items-center gap-2 justify-end relative z-10 pointer-events-auto">
                    {rightContent}
                </div>
            </header>
        );
    }

    return (
        <header
            key="nav-detail"
            className={`fixed top-0 left-0 right-0 z-50 h-[var(--nav-h)] flex items-center px-4 md:px-6`}
        >
            {/*
                Untergrund als eigene Ebene, nicht auf der Kopfzeile selbst.

                Eine Maske beschneidet ALLE Nachkommen auf die Flaeche des
                maskierten Elements. Lag sie auf der Kopfzeile, verschwand jedes
                Aufklappmenue spurlos: Die Liste steht per `top-full` vollstaendig
                unterhalb der Kopfzeile, also im vollstaendig transparenten Teil
                der Maske. Genau deshalb liess sich das Menue in der
                Detailansicht nicht mehr oeffnen — es wurde geoeffnet, aber nicht
                gezeichnet.

                Gleiche Bauweise wie in der Galerie-Kopfzeile: Der
                Weichzeichner sitzt auf einer Ebene darunter, die Kopfzeile
                selbst beschneidet nichts.
            */}
            <div
                aria-hidden
                className="absolute inset-0 -z-10 backdrop-blur-2xl bg-white/60 dark:bg-zinc-950/50"
            />
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
