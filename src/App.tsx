import React, { useEffect, Suspense, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { RotateCw, Download, Info, Trash2, Loader2 } from 'lucide-react';
import { RoundIconButton } from '@/components/ui/DesignSystem';
import { useNanoController } from '@/hooks/useNanoController';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { AuthModal } from '@/components/modals/AuthModal';
import { CreationModal } from '@/components/modals/CreationModal';
import { CreditsModal } from '@/components/modals/CreditsModal';
import { FeedPage } from '@/components/pages/FeedPage';
import { DetailPage } from '@/components/pages/DetailPage';

// (rest of imports omitted for brevity in targetContent but I will replace the whole block)

// Lazy loaded pages
const HomePage = React.lazy(() => import('@/components/pages/HomePage').then(m => ({ default: m.HomePage })));
const ContactPage = React.lazy(() => import('@/components/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const ImpressumPage = React.lazy(() => import('@/components/pages/ImpressumPage').then(m => ({ default: m.ImpressumPage })));
const SettingsModal = React.lazy(() => import('@/components/settings/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SharedTemplatePage = React.lazy(() => import('@/components/pages/SharedTemplatePage').then(m => ({ default: m.SharedTemplatePage })));
const AdminDashboard = React.lazy(() => import('@/components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ImageInfoModal = React.lazy(() => import('@/components/canvas/ImageInfoModal').then(m => ({ default: m.ImageInfoModal })));
import { AdminRoute } from '@/components/admin/AdminRoute';
import { useItemDialog } from '@/components/ui/Dialog';

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

    const [isCreationModalOpen, setIsCreationModalOpen] = React.useState(false);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = React.useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
    const [infoImageId, setInfoImageId] = React.useState<string | null>(null);
    const [detailSidebarWidth, setDetailSidebarWidth] = React.useState(380);
    const [detailSideSheetVisible, setDetailSideSheetVisible] = React.useState(true);
    const [feedSideSheetVisible, setFeedSideSheetVisible] = React.useState(false);

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

    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    // Keep URL in sync with active selection only while user is already in detail view.
    // This prevents forced jumps back into detail when the user intentionally returns to grid.
    useEffect(() => {
        if (!state.activeId) return;
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


    const handleSelectImage = (id: string) => {
        actions.handleSelection(id, false, false);
        isNavigatingProgrammatically.current = true;
        navigate(`/image/${id}`);
    };

    const handleBackToFeed = () => {
        navigate('/');
    };

    const isAppLayout = user && (location.pathname === '/' || location.pathname.startsWith('/image/'));
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isPublicLanding = !user && (location.pathname === '/' || location.pathname === '/about');
    const outerContainerClasses = (isAppLayout || isAdminRoute)
        ? "h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-[Inter,system-ui,-apple-system,sans-serif] selection:bg-orange-500 selection:text-white flex flex-col overflow-hidden"
        : "min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-[Inter,system-ui,-apple-system,sans-serif] selection:bg-orange-500 selection:text-white flex flex-col";

    const mainContainerClasses = isAppLayout
        ? "flex-1 flex flex-col overflow-hidden pt-14"
        : "flex-1 flex flex-col";

    const showGlobalNavbar = !isAdminRoute;

    return (
        <div className={outerContainerClasses}>

            {showGlobalNavbar && (isAppLayout ? (
                <AppNavbar
                    user={user}
                    userProfile={userProfile}
                    credits={credits || 0}
                    onCreate={() => setIsCreationModalOpen(true)}
                    onSignIn={() => {
                        setAuthModalMode('signin');
                        setIsAuthModalOpen(true);
                    }}
                    onOpenCredits={() => setIsCreditsModalOpen(true)}
                    onToggleSettings={() => setIsSettingsModalOpen(true)}
                    onSignOut={handleSignOut}
                    onSelectMode={() => actions.setIsSelectMode(true)}
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
                    mode={location.pathname.startsWith('/image/') ? 'detail' : 'grid'}
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
                    detailActions={null}
                    detailHasPrompt={(() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            const img = allImages.find(i => i.id === id);
                            return !!(img?.generationPrompt);
                        }
                        return false;
                    })()}
                    onBack={handleBackToFeed}
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
                            if (id) actions.handleDeleteImage(id);
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
                    onToggleSideSheet={() => setDetailSideSheetVisible(v => !v)}
                    onToggleFeedSideSheet={() => setFeedSideSheetVisible(v => !v)}
                    generatingImages={allImages.filter(i => i.isGenerating && (i.generationPrompt || i.parentId))}
                    onNavigateToImage={(id) => { setDetailSideSheetVisible(false); handleSelectImage(id); }}
                    onGenerateMoreById={(id) => actions.handleGenerateMore(id)}
                />
            ) : (
                <PublicNavbar
                    user={user}
                    currentLang={state.currentLang}
                    onSignIn={() => {
                        setAuthModalMode('signin');
                        setIsAuthModalOpen(true);
                    }}
                    onStartApp={() => {
                        if (user) {
                            navigate('/');
                            return;
                        }
                        setAuthModalMode('signup');
                        setIsAuthModalOpen(true);
                    }}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    onSignOut={handleSignOut}
                    t={t}
                />
            ))}

            <main className={mainContainerClasses}>
                <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-white dark:bg-black"><Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-800" /></div>}>
                    <Routes>
                        <Route path="/" element={
                            user ? (
                                <FeedPage
                                    images={allImages}
                                    isLoading={isCanvasLoading}
                                    hasMore={state.hasMore}
                                    onSelectImage={handleSelectImage}
                                    onCreateNew={() => setIsCreationModalOpen(true)}
                                    onUpload={(files) => Array.from(files ?? []).forEach(f => actions.processFile(f))}
                                    onLoadMore={actions.handleLoadMore}
                                    isSelectMode={state.isSelectMode}
                                    isSelectionSideSheetOpen={feedSideSheetVisible}
                                    selectedIds={state.selectedIds}
                                    onToggleSelect={(id) => {
                                        const isCurrentlySelected = state.selectedIds.includes(id);
                                        const willBeZero = isCurrentlySelected && state.selectedIds.length === 1;
                                        actions.handleSelection(id, true, false);
                                        if (willBeZero) {
                                            actions.setIsSelectMode(false);
                                        }
                                    }}
                                    state={state}
                                    actions={actions}
                                    t={t}
                                />
                            ) : (
                                <HomePage
                                    user={user}
                                    userProfile={userProfile}
                                    credits={credits}
                                    t={t}
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
                                    onDelete={handleDeleteImage}
                                    onDownload={handleDownload}
                                    onInfo={(id) => setInfoImageId(id)}
                                    onSidebarWidthChange={setDetailSidebarWidth}
                                    isSideSheetVisible={detailSideSheetVisible}
                                    onSideSheetVisibleChange={setDetailSideSheetVisible}
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

                        <Route path="/contact" element={<ContactPage
                            user={user}
                            userProfile={userProfile}
                            credits={credits}
                            currentLang={state.currentLang}
                            t={t}
                            onCreateNew={() => setIsCreationModalOpen(true)}
                            onSignIn={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
                        />} />
                        <Route path="/impressum" element={<ImpressumPage
                            user={user}
                            userProfile={userProfile}
                            credits={credits}
                            t={t}
                            onCreateNew={() => setIsCreationModalOpen(true)}
                            onSignIn={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
                        />} />
                        <Route path="/legal" element={<Navigate to="/impressum" replace />} />
                        <Route path="/s/:slug" element={<SharedTemplatePage />} />

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
                        imageCount={allImages.length}
                        imageLimit={state.imageLimit}
                        storageAutoDelete={state.storageAutoDelete}
                        onStorageAutoDeleteChange={actions.handleStorageAutoDeleteChange}
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
                            t={t}
                            currentLang={langSetting as 'de' | 'en'}
                        />
                    ) : null;
                })()}
            </Suspense>
        </div>
    );
}
