import React, { useEffect, Suspense, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { RotateCw, Download, Info, Trash2, Loader2, Upload, ImageIcon } from 'lucide-react';
import { RoundIconButton, Theme, Typo } from '@/components/ui/DesignSystem';
import { useNanoController } from '@/hooks/useNanoController';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AuthModal } from '@/components/modals/AuthModal';
import { CreationModal } from '@/components/modals/CreationModal';
import { CreditsModal } from '@/components/modals/CreditsModal';
import { FeedPage } from '@/components/pages/FeedPage';
import { DetailPage } from '@/components/pages/DetailPage';
import { CreatePage } from '@/components/pages/CreatePage';

// (rest of imports omitted for brevity in targetContent but I will replace the whole block)

// Lazy loaded pages
const HomePage = React.lazy(() => import('@/components/pages/HomePage').then(m => ({ default: m.HomePage })));
const ImpressumPage = React.lazy(() => import('@/components/pages/ImpressumPage').then(m => ({ default: m.ImpressumPage })));
const SettingsModal = React.lazy(() => import('@/components/settings/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SharedTemplatePage = React.lazy(() => import('@/components/pages/SharedTemplatePage').then(m => ({ default: m.SharedTemplatePage })));
const HeroPlayground = React.lazy(() => import('@/components/pages/HeroPlayground').then(m => ({ default: m.HeroPlayground })));
const AdminDashboard = React.lazy(() => import('@/components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ImageInfoModal = React.lazy(() => import('@/components/canvas/ImageInfoModal').then(m => ({ default: m.ImageInfoModal })));
import { AdminRoute } from '@/components/admin/AdminRoute';
import { useItemDialog } from '@/components/ui/Dialog';

class ModalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error) { console.error('[SettingsModal] render error:', error); }
    render() { return this.state.hasError ? null : this.props.children; }
}

const ProtectedRoute = ({ user, isAuthLoading, children, onAuthRequired }: { user: any, isAuthLoading: boolean, children: React.ReactNode, onAuthRequired: () => void }) => {
    const location = useLocation();
    useEffect(() => {
        if (!isAuthLoading && !user) {
            onAuthRequired();
        }
    }, [user, isAuthLoading, onAuthRequired]);

    if (isAuthLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-800" /></div>;
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }
    return <>{children}</>;
};

export function App() {
    const { state, actions, langSetting, t } = useNanoController();
    const { confirm } = useItemDialog();
    const navigate = useNavigate();
    const location = useLocation();

    const {
        user, isAuthLoading, isAuthModalOpen, authError, authEmail, authModalMode,
        allImages, isCanvasLoading, credits, userProfile
    } = state;

    const {
        setAuthModalMode, setIsAuthModalOpen, setAuthError, setAuthEmail,
        handleSignOut, handleCreateNew, handleDeleteImage, handleDownload, ensureValidSession,
        setQualityMode, setThemeMode, setLang, handleDeleteAccount, updateProfile
    } = actions;

    // Track whether last image selection was from a user action (arrows/thumbs) vs programmatic (generation)
    const isUserNavigationRef = React.useRef(false);

    const [isCreationModalOpen, setIsCreationModalOpen] = React.useState(false);
    const [isDetailExiting, setIsDetailExiting] = React.useState(false);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = React.useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
    const [infoImageId, setInfoImageId] = React.useState<string | null>(null);
    const [detailSidebarWidth, setDetailSidebarWidth] = React.useState(380);
    const [detailSideSheetVisible, setDetailSideSheetVisible] = React.useState(true);
    const [feedSideSheetVisible, setFeedSideSheetVisible] = React.useState(false);
    const [expandedGroupId, setExpandedGroupId] = React.useState<string | null>(null);
    const [feedHeroProgress, setFeedHeroProgress] = React.useState(0);
    const [createMode, setCreateMode] = React.useState<'choose' | 'create'>('choose');

    // Initial auth check / redirect logic
    useEffect(() => {
        if (!isAuthLoading && user && location.pathname === '/') {
            // Keep on home for now, or redirect to feed? 
            // The user said: "bild feed is jetz die startseite für angemeldete user"
            // So if logged in and on /, show feed.
        }
    }, [user, isAuthLoading, location.pathname]);

    // Single source of truth for route sync.
    // We use a ref to avoid the feedback loop: navigate → URL change → handleSelection → activeId change → navigate...
    const isNavigatingProgrammatically = React.useRef(false);
    const pathnameRef = React.useRef(location.pathname);
    // True once activeId has been set at least once — guards against premature redirect on page refresh
    // (on mount activeId=null before images load; we must not redirect to '/' in that window)
    const activeIdEverSetRef = React.useRef(false);
    React.useEffect(() => {
        if (state.activeId) activeIdEverSetRef.current = true;
    }, [state.activeId]);

    useEffect(() => {
        pathnameRef.current = location.pathname;
        if (location.pathname !== '/create') {
            setCreateMode('choose');
        } else {
            const params = new URLSearchParams(location.search);
            if (params.get('m') === 'create') {
                setCreateMode('create');
            }
        }
    }, [location.pathname, location.search]);

    // Keep URL in sync with active selection only while user is already in detail view.
    // This prevents forced jumps back into detail when the user intentionally returns to grid.
    useEffect(() => {
        // If activeId cleared while in detail view (e.g. last image in group deleted) → go to grid
        if (!state.activeId) {
            // Only redirect if activeId was previously set — avoids premature redirect on page refresh
            // before images have loaded and the URL-sync effect has had a chance to restore activeId.
            if (pathnameRef.current.startsWith('/image/') && activeIdEverSetRef.current) {
                isNavigatingProgrammatically.current = true;
                navigate('/', { replace: true });
            }
            return;
        }
        if (!pathnameRef.current.startsWith('/image/')) return;
        const urlId = pathnameRef.current.split('/').pop();
        if (urlId === state.activeId) return; // Already in sync, do nothing
        isNavigatingProgrammatically.current = true;
        navigate(`/image/${state.activeId}`, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.activeId, navigate]);

    // When URL changes (from browser back/forward), update state.activeId — but skip if WE triggered the navigation
    useEffect(() => {
        if (isNavigatingProgrammatically.current) {
            isNavigatingProgrammatically.current = false;
            return;
        }
        if (location.pathname.startsWith('/image/')) {
            const urlId = location.pathname.split('/').pop();
            if (urlId && urlId !== state.activeId) {
                actions.handleSelection(urlId, false, false);
            }
        }
    }, [location.pathname, state.activeId, actions.handleSelection]);


    // Close SideSheet when navigating to a generating image via generation (not user arrow/thumb clicks)
    useEffect(() => {
        if (!state.activeId) return;
        const targetImg = allImages.find(i => i.id === state.activeId);
        if (targetImg?.isGenerating && !isUserNavigationRef.current) {
            setDetailSideSheetVisible(false);
        }
        isUserNavigationRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.activeId]);

    const handleSelectImage = (id: string) => {
        isUserNavigationRef.current = true; // Mark as user-initiated (preserve SideSheet state)
        actions.handleSelection(id, false, false);
        isNavigatingProgrammatically.current = true;
        const img = allImages.find(i => i.id === id);
        const isGenerated = !!(img?.generationPrompt || img?.parentId);
        const isMobile = window.innerWidth < 768;
        const alreadyInDetail = location.pathname.startsWith('/image/');
        if (isMobile) {
            // Mobile always shows sidesheet
            setDetailSideSheetVisible(true);
        } else if (!alreadyInDetail) {
            // Entering detail view fresh from grid: apply default rule (original=show, generated=hide)
            setDetailSideSheetVisible(!isGenerated);
        }
        // else: navigating within detail view — keep current sidesheet toggle state
        navigate(`/image/${id}`);
    };

    const handleBackToFeed = useCallback(() => {
        setIsDetailExiting(true);
        setTimeout(() => {
            setIsDetailExiting(false);
            navigate('/');
        }, 180);
    }, [navigate]);

    // Detail-view delete: navigate to the adjacent image URL BEFORE removing the deleted image from state.
    // Without this, DetailPage's `!img → onBack()` fires and the 180ms timer navigates to grid,
    // overriding the correct navigation that App.tsx's activeId-sync effect would have done.
    const handleDetailDelete = React.useCallback(async (id: string) => {
        const flat = state.allImages;
        const currentIdx = flat.findIndex(i => i.id === id);
        const nextImg = flat[currentIdx + 1] || flat[currentIdx - 1];
        await actions.handleDeleteImage(id, false, () => {
            // Called after confirm but BEFORE setRows — navigate while img still exists
            isNavigatingProgrammatically.current = true;
            if (nextImg) {
                actions.selectAndSnap(nextImg.id);
                navigate(`/image/${nextImg.id}`, { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        });
    }, [state.allImages, actions, navigate]);

    // ── Global drag-and-drop ──────────────────────────────────────────────────
    const actionsRef = React.useRef(actions);
    React.useEffect(() => { actionsRef.current = actions; }, [actions]);
    const locationRef2 = React.useRef(location.pathname);
    React.useEffect(() => { locationRef2.current = location.pathname; }, [location.pathname]);

    // Which drop zone is the cursor over (detail view only)
    const [dragZone, setDragZone] = React.useState<'image' | 'sidesheet' | null>(null);
    const dragResetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        let counter = 0;

        const resetDrag = () => {
            counter = 0;
            actionsRef.current.setIsDragOver(false);
            setDragZone(null);
        };

        const onEnter = (e: DragEvent) => {
            if (!e.dataTransfer?.types.includes('Files')) return;
            counter++;
            actionsRef.current.setIsDragOver(true);
        };
        const onLeave = (e: DragEvent) => {
            counter = Math.max(0, counter - 1);
            if (counter === 0) resetDrag();
        };
        const onOver = (e: DragEvent) => {
            e.preventDefault();
            // Auto-reset if dragover stops firing (e.g. user drops outside app window)
            if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
            dragResetTimer.current = setTimeout(resetDrag, 400);
            // Track which zone cursor is over (only in detail view)
            if (locationRef2.current.startsWith('/image/')) {
                const sidesheetW = 380;
                setDragZone(e.clientX > window.innerWidth - sidesheetW ? 'sidesheet' : 'image');
            }
        };
        const onDrop = async (e: DragEvent) => {
            if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
            resetDrag();
            // FeedPage handles drops on its own container via React onDrop
            if (locationRef2.current === '/') return;
            // SideSheet marks handled drops to prevent double-upload
            if ((e as any).__sideSheetHandled) return;
            e.preventDefault();
            const files = (Array.from(e.dataTransfer?.files || []) as File[]).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) return;
            files.forEach(f => actionsRef.current.processFile(f));
        };
        document.addEventListener('dragenter', onEnter);
        document.addEventListener('dragleave', onLeave);
        document.addEventListener('dragover', onOver);
        document.addEventListener('drop', onDrop);
        return () => {
            document.removeEventListener('dragenter', onEnter);
            document.removeEventListener('dragleave', onLeave);
            document.removeEventListener('dragover', onOver);
            document.removeEventListener('drop', onDrop);
            if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
        };
    }, []); // intentionally empty: actionsRef + locationRef2 handle staleness

    // ── Global clipboard paste upload (Cmd+V / Ctrl+V) ───────────────────────
    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            // Only handle when user is logged in and on an app route
            if (!actionsRef.current?.processFile) return;
            const loc = locationRef2.current;
            if (loc !== '/' && !loc.startsWith('/image/') && loc !== '/create') return;

            const items = e.clipboardData?.items;
            if (!items) return;

            // Check if clipboard contains images
            const imageFiles: File[] = [];
            let hasText = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) imageFiles.push(file);
                }
                if (items[i].type === 'text/plain') hasText = true;
            }

            if (imageFiles.length === 0) return;

            // If focus is in a text field and clipboard also has text, let the
            // browser handle it normally (user likely wants to paste text)
            const tag = (e.target as HTMLElement)?.tagName;
            const isTextField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
            if (isTextField && hasText) return;

            // On detail view → add as reference image instead of uploading
            if (loc.startsWith('/image/')) {
                e.preventDefault();
                document.dispatchEvent(new CustomEvent('paste-reference-image', { detail: imageFiles[0] }));
                return;
            }

            // Image paste → treat as upload (works everywhere, including from text fields)
            e.preventDefault();
            if (imageFiles.length === 1) {
                // Single image → navigate to detail view (same as drop/upload button)
                actionsRef.current.processFile(imageFiles[0]).then((id: string | undefined) => {
                    if (id) {
                        isNavigatingProgrammatically.current = true;
                        navigate(`/image/${id}`);
                    }
                });
            } else {
                imageFiles.forEach(f => actionsRef.current.processFile(f));
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, []);

    // ── Global scroll progress for landing pages ──────────────────────────────
    const [globalScrollProgress, setGlobalScrollProgress] = React.useState(0);
    React.useEffect(() => {
        const handleScroll = () => {
            const HERO_SCROLL_DISTANCE = 120;
            const p = Math.min(window.scrollY / HERO_SCROLL_DISTANCE, 1);
            setGlobalScrollProgress(p);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isAppLayout = user && (location.pathname === '/' || location.pathname.startsWith('/image/') || location.pathname === '/create');
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isPublicLanding = !user && (location.pathname === '/' || location.pathname === '/about' || location.pathname === '/impressum');
    
    // Pages that should have an expandable Hero header
    const expandableRoutes = ['/', '/about', '/impressum'];
    const isExpandableRoute = expandableRoutes.includes(location.pathname);

    const outerContainerClasses = isAppLayout
        ? "h-[100dvh] bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-[Inter,system-ui,-apple-system,sans-serif] selection:bg-orange-500 selection:text-white flex flex-col overflow-hidden"
        : "min-h-[100dvh] bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-[Inter,system-ui,-apple-system,sans-serif] selection:bg-orange-500 selection:text-white flex flex-col";

    const mainContainerClasses = isAppLayout
        ? "flex-1 flex flex-col overflow-hidden pt-14"
        : "flex-1 flex flex-col";

    const showGlobalNavbar = !isAdminRoute;

    return (
        <div className={outerContainerClasses}>

            {showGlobalNavbar && (
                <AppNavbar
                    user={user}
                    userProfile={userProfile}
                    isPublic={!user}
                    credits={credits || 0}
                    onCreate={() => navigate('/create?m=create')}
                    onSignIn={() => {
                        setAuthModalMode('signin');
                        setIsAuthModalOpen(true);
                    }}
                    onStartApp={() => {
                        if (user) { navigate('/'); return; }
                        setAuthModalMode('signup');
                        setIsAuthModalOpen(true);
                    }}
                    onOpenCredits={() => setIsCreditsModalOpen(true)}
                    onToggleSettings={() => { setIsSettingsModalOpen(true); actions.refreshImageCount?.(); }}
                    onSignOut={handleSignOut}
                    onSelectMode={() => {
                        actions.setIsSelectMode(true);
                        setExpandedGroupId(null);
                    }}
                    isSelectMode={state.isSelectMode}
                    onCancelSelectMode={() => {
                        actions.setIsSelectMode(false);
                        actions.deselectAll();
                        setFeedSideSheetVisible(false);
                    }}
                    onDeleteSelected={async () => {
                        const count = state.selectedIds?.length || 0;
                        const confirmed = await confirm({
                            title: t('delete') || 'Löschen',
                            description: state.currentLang === 'de'
                                ? `Möchtest du wirklich ${count} Bild${count !== 1 ? 'er' : ''} löschen?`
                                : `Delete ${count} image${count !== 1 ? 's' : ''}?`,
                            confirmLabel: t('delete') || 'LÖSCHEN',
                            cancelLabel: t('cancel') || 'ABBRECHEN',
                            variant: 'danger'
                        });
                        if (!confirmed) return;
                        state.selectedIds.forEach((id: string) => actions.handleDeleteImage(id, true));
                        actions.setIsSelectMode(false);
                        actions.deselectAll();
                    }}
                    onDownloadSelected={() => {
                        if (state.selectedIds?.length) actions.handleDownload(state.selectedIds);
                    }}
                    onGenerateMoreSelected={() => {
                        state.selectedIds.forEach((id: string) => actions.handleGenerateMore(id));
                    }}
                    onGenerateMoreDetail={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) actions.handleGenerateMore(id);
                        }
                    }}
                    selectedCount={state.selectedIds?.length || 0}
                    t={t}
                    lang={state.currentLang}
                    mode={location.pathname === '/create' ? 'create' : location.pathname.startsWith('/image/') ? 'detail' : 'grid'}
                    rightInset={location.pathname.startsWith('/image/') ? detailSidebarWidth : 0}
                    hasImages={allImages.length > 0}
                    detailInfo={(() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            const img = allImages.find(i => i.id === id);
                            if (img) return img.title || 'Untitled';
                        }
                        return undefined;
                    })()}
                    groupInfo={(() => {
                        if (expandedGroupId) {
                            const row = state.rows.find((r: any) => r.id === expandedGroupId);
                            const root = row?.items?.find((item: any) => !item.parentId) || row?.items?.[0];
                            return root?.title || row?.title || undefined;
                        }
                        return undefined;
                    })()}
                    detailActions={null}
                    detailHasPrompt={(() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            const img = allImages.find(i => i.id === id);
                            return !!(img?.generationPrompt);
                        }
                        return false;
                    })()}
                    isGroupDrillDown={!!expandedGroupId}
                    onCloseGroup={() => setExpandedGroupId(null)}
                    onBack={location.pathname === '/create'
                        ? () => { if (createMode === 'create') setCreateMode('choose'); else handleBackToFeed(); }
                        : handleBackToFeed}
                    onDetailRename={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) setInfoImageId(id);
                        }
                    }}
                    onDetailDownload={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) actions.handleDownload(id);
                        }
                    }}
                    onDetailDelete={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) handleDetailDelete(id);
                        }
                    }}
                    onDetailInfo={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) setInfoImageId(id);
                        }
                    }}
                    onDetailRegenerate={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) actions.handleGenerateMore(id);
                        }
                    }}
                    isSideSheetVisible={detailSideSheetVisible}
                    isFeedSideSheetVisible={feedSideSheetVisible}
                    onToggleSideSheet={() => setDetailSideSheetVisible(v => !v)}
                    onToggleFeedSideSheet={() => setFeedSideSheetVisible(v => !v)}
                    generatingImages={allImages.filter(i => i.isGenerating && (i.generationPrompt || i.parentId))}
                    onNavigateToImage={(id) => { handleSelectImage(id); }}
                    onGenerateMoreById={(id) => actions.handleGenerateMore(id)}
                    heroProgress={isExpandableRoute
                        ? (location.pathname === '/' && user ? feedHeroProgress : globalScrollProgress)
                        : undefined}
                    onHeroUploadClick={() => { (document.getElementById('feed-upload-input') as HTMLInputElement | null)?.click(); }}
                />
            )}


            {/* Drag-drop overlay — two zones in detail view, single card elsewhere */}
            {state.isDragOver && location.pathname !== '/' && (() => {
                const isDetail = location.pathname.startsWith('/image/');
                const lang = state.currentLang;
                if (isDetail) {
                    const sidesheetW = detailSidebarWidth;
                    return (
                        <div className="fixed inset-0 z-[100] pointer-events-none">
                            <div className="absolute inset-0 bg-black/30" />
                            {/* Left zone: Upload */}
                            <div
                                className="absolute inset-y-0 left-0 flex items-center justify-center"
                                style={{ right: sidesheetW }}
                            >
                                <div className={`flex flex-col items-center gap-3 px-8 py-6 ${Theme.Colors.ModalBg} border ${Theme.Geometry.RadiusXl} transition-all duration-150 ${dragZone === 'image' ? 'scale-[1.06] border-orange-400 dark:border-orange-500' : Theme.Colors.Border}`}>
                                    <Upload className={`transition-all duration-150 ${dragZone === 'image' ? 'w-8 h-8 text-orange-500' : 'w-6 h-6 text-zinc-400 dark:text-zinc-500'}`} />
                                    <p className={`${Typo.Body} text-sm ${dragZone === 'image' ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                        {lang === 'de' ? 'Hier ablegen zum Hochladen' : 'Drop here to upload'}
                                    </p>
                                </div>
                            </div>
                            {/* Right zone: Reference image */}
                            <div
                                className="absolute inset-y-0 right-0 flex items-center justify-center"
                                style={{ width: sidesheetW }}
                            >
                                <div className={`flex flex-col items-center gap-3 px-8 py-6 ${Theme.Colors.ModalBg} border ${Theme.Geometry.RadiusXl} transition-all duration-150 ${dragZone === 'sidesheet' ? 'scale-[1.06] border-orange-400 dark:border-orange-500' : Theme.Colors.Border}`}>
                                    <ImageIcon className={`transition-all duration-150 ${dragZone === 'sidesheet' ? 'w-8 h-8 text-orange-500' : 'w-6 h-6 text-zinc-400 dark:text-zinc-500'}`} />
                                    <p className={`${Typo.Body} text-sm text-center ${dragZone === 'sidesheet' ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                        {lang === 'de' ? 'Als Referenz hinzufügen' : 'Add as reference'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-black/50" />
                        <div className={`relative flex flex-col items-center gap-3 px-10 py-8 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusXl}`}>
                            <Upload className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            <p className={`${Typo.Body} text-sm text-zinc-600 dark:text-zinc-400`}>
                                {lang === 'de' ? 'Dateien hier ablegen' : 'Drop files here'}
                            </p>
                        </div>
                    </div>
                );
            })()}

            <main className={mainContainerClasses}>
                <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-white dark:bg-black"><Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-800" /></div>}>
                    <Routes>
                        <Route path="/" element={
                            user ? (
                                <FeedPage
                                    images={allImages}
                                    rows={state.rows}
                                    isLoading={isCanvasLoading}
                                    hasMore={state.hasMore}
                                    onSelectImage={handleSelectImage}
                                    onCreateNew={() => navigate('/create')}
                                    onGenerate={() => navigate('/create?m=create')}
                                    onUpload={async (files) => {
                                        const arr = Array.from(files ?? []);
                                        if (arr.length === 0) return;
                                        if (arr.length === 1) {
                                            const id = await actions.processFile(arr[0]);
                                            if (id) {
                                                setDetailSideSheetVisible(true);
                                                isNavigatingProgrammatically.current = true;
                                                navigate(`/image/${id}`);
                                            }
                                        } else {
                                            arr.forEach(f => actions.processFile(f));
                                            // multiple uploads → back to top-level grid so user sees all incoming images
                                            setExpandedGroupId(null);
                                        }
                                    }}
                                    onLoadMore={actions.handleLoadMore}
                                    isFetchingMore={state.isFetchingMore}
                                    isSelectMode={state.isSelectMode}
                                    isSelectionSideSheetOpen={feedSideSheetVisible}
                                    selectedIds={state.selectedIds}
                                    onToggleSelect={(id, isRange) => {
                                        if (!state.isSelectMode) {
                                            // Entering select mode for first time — reset to exactly this image
                                            actions.selectAndSnap(id);
                                            return;
                                        }
                                        if (isRange) {
                                            // Shift+click — extend selection range, never deselects
                                            actions.handleSelection(id, false, true);
                                        } else {
                                            const isCurrentlySelected = state.selectedIds.includes(id);
                                            const willBeZero = isCurrentlySelected && state.selectedIds.length === 1;
                                            actions.handleSelection(id, true, false);
                                            if (willBeZero) {
                                                actions.setIsSelectMode(false);
                                            }
                                        }
                                    }}
                                    expandedGroupId={expandedGroupId}
                                    onExpandedGroupChange={setExpandedGroupId}
                                    lastViewedId={state.activeId}
                                    state={state}
                                    actions={actions}
                                    t={t}
                                    onScrollProgress={setFeedHeroProgress}
                                />
                            ) : (
                                <HomePage
                                    user={user}
                                    userProfile={userProfile}
                                    credits={credits}
                                    t={t}
                                    lang={state.currentLang}
                                    onSignIn={() => {
                                        setAuthModalMode('signin');
                                        setIsAuthModalOpen(true);
                                    }}
                                    onGetStarted={() => {
                                        setAuthModalMode('signup');
                                        setIsAuthModalOpen(true);
                                    }}
                                />
                            )
                        } />
                        <Route path="/about" element={
                            <HomePage
                                user={user}
                                userProfile={userProfile}
                                credits={credits}
                                t={t}
                                lang={state.currentLang}
                                onSignIn={() => {
                                    setAuthModalMode('signin');
                                    setIsAuthModalOpen(true);
                                }}
                                onGetStarted={() => {
                                    if (user) {
                                        navigate('/');
                                        return;
                                    }
                                    setAuthModalMode('signup');
                                    setIsAuthModalOpen(true);
                                }}
                            />
                        } />

                        <Route path="/image/:id" element={
                            <ProtectedRoute user={user} isAuthLoading={isAuthLoading} onAuthRequired={() => {
                                setAuthModalMode('signin');
                                setIsAuthModalOpen(true);
                            }}>
                                <DetailPage
                                    images={allImages}
                                    selectedId={location.pathname.split('/').pop() || ''}
                                    onBack={handleBackToFeed}
                                    onSelectImage={handleSelectImage}
                                    onDelete={handleDetailDelete}
                                    onDownload={handleDownload}
                                    onInfo={(id) => setInfoImageId(id)}
                                    onSidebarWidthChange={setDetailSidebarWidth}
                                    isSideSheetVisible={detailSideSheetVisible}
                                    onSideSheetVisibleChange={setDetailSideSheetVisible}
                                    isExiting={isDetailExiting}
                                    hasMore={state.hasMore}
                                    onLoadMore={actions.handleLoadMore}
                                    state={state}
                                    actions={actions}
                                    t={t}
                                />
                            </ProtectedRoute>
                        } />

                        <Route path="/create" element={
                            <ProtectedRoute user={user} isAuthLoading={isAuthLoading} onAuthRequired={() => {
                                setAuthModalMode('signin');
                                setIsAuthModalOpen(true);
                            }}>
                                <CreatePage
                                    onCreateNew={handleCreateNew}
                                    onUpload={async (files) => {
                                        const arr = Array.from(files);
                                        if (arr.length === 0) return;
                                        if (arr.length === 1) {
                                            const id = await actions.processFile(arr[0]);
                                            if (id) {
                                                setDetailSideSheetVisible(true);
                                                isNavigatingProgrammatically.current = true;
                                                navigate(`/image/${id}`);
                                            }
                                        } else {
                                            arr.forEach(f => actions.processFile(f));
                                            isNavigatingProgrammatically.current = true;
                                            navigate('/');
                                        }
                                    }}
                                    onBack={() => navigate('/')}
                                    createMode={createMode}
                                    onCreateModeChange={setCreateMode}
                                    state={state}
                                    actions={actions}
                                    t={t}
                                />
                            </ProtectedRoute>
                        } />

                        <Route path="/admin/:tab?" element={
                            <AdminRoute user={user} userProfile={userProfile} isAuthLoading={isAuthLoading}>
                                <AdminDashboard
                                    user={user}
                                    userProfile={userProfile}
                                    credits={credits}
                                    onCreateBoard={() => setIsCreationModalOpen(true)}
                                    t={t}
                                />
                            </AdminRoute>
                        } />

                        <Route path="/impressum" element={<ImpressumPage
                            user={user}
                            userProfile={userProfile}
                            credits={credits}
                            t={t}
                            onCreateNew={() => setIsCreationModalOpen(true)}
                            onSignIn={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
                        />} />
                        <Route path="/legal" element={<Navigate to="/impressum" replace />} />
                        <Route path="/s/:slug" element={
                            <SharedTemplatePage
                                user={user}
                                userProfile={userProfile}
                                credits={credits || 0}
                                onCreateBoard={() => navigate('/create')}
                                onSignIn={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
                                t={t}
                            />
                        } />

                        {/* Dev playground — delete when done */}
                        <Route path="/playground" element={<React.Suspense fallback={null}><HeroPlayground /></React.Suspense>} />

                        {/* Legacy Redirects */}
                        <Route path="/projects/*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </main>

            {/* Modals */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                error={authError}
                onClearError={() => setAuthError(null)}
                email={authEmail}
                onEmailChange={setAuthEmail}
                mode={authModalMode}
                onModeChange={setAuthModalMode}
                t={t}
            />

            <CreationModal
                isOpen={isCreationModalOpen}
                onClose={() => setIsCreationModalOpen(false)}
                onGenerate={handleCreateNew}
                t={t}
            />

            <CreditsModal
                isOpen={isCreditsModalOpen}
                onClose={() => setIsCreditsModalOpen(false)}
                currentBalance={credits || 0}
                onAddFunds={actions.handleAddFunds}
                t={t}
            />

            <ModalErrorBoundary>
                <Suspense fallback={null}>
                    {isSettingsModalOpen && user && (
                        <SettingsModal
                            isOpen={isSettingsModalOpen}
                            onClose={() => setIsSettingsModalOpen(false)}
                            qualityMode={state.qualityMode}
                            onQualityModeChange={setQualityMode}
                            currentBalance={credits || 0}
                            onAddFunds={actions.handleAddFunds}
                            themeMode={state.themeMode}
                            onThemeChange={setThemeMode}
                            lang={langSetting}
                            onLangChange={setLang}
                            user={user}
                            userProfile={userProfile}
                            onSignOut={() => {
                                setIsSettingsModalOpen(false);
                                handleSignOut();
                            }}
                            onDeleteAccount={handleDeleteAccount}
                            updateProfile={updateProfile}
                            t={t}
                            currentLang={state.currentLang}
                            imageCount={state.imageCount}
                            imageLimit={state.imageLimit}
                            storageAutoDelete={state.storageAutoDelete}
                            onStorageAutoDeleteChange={actions.handleStorageAutoDeleteChange}
                            onChangePassword={() => {
                                setIsSettingsModalOpen(false);
                                setAuthModalMode('update-password');
                                setIsAuthModalOpen(true);
                            }}
                        />
                    )}
                </Suspense>
                <Suspense fallback={null}>
                    {infoImageId && (() => {
                        const infoImg = allImages.find(i => i.id === infoImageId);
                        return infoImg ? (
                            <ImageInfoModal
                                image={infoImg}
                                onClose={() => setInfoImageId(null)}
                                onUpdateImageTitle={actions.handleUpdateImageTitle}
                                onGenerateMore={(id) => { actions.handleGenerateMore(id); setInfoImageId(null); }}
                                t={t}
                                currentLang={langSetting as 'de' | 'en'}
                            />
                        ) : null;
                    })()}
                </Suspense>
            </ModalErrorBoundary>
        </div>
    );
}
