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
    const outerContainerClasses = isAppLayout
        ? "h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-[Inter,system-ui,-apple-system,sans-serif] selection:bg-orange-500 selection:text-white flex flex-col overflow-hidden"
        : "min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-[Inter,system-ui,-apple-system,sans-serif] selection:bg-orange-500 selection:text-white flex flex-col";

    const mainContainerClasses = isAppLayout
        ? "flex-1 flex flex-col overflow-hidden pt-14"
        : "flex-1 flex flex-col pt-14";

    const showGlobalNavbar = true;

    return (
        <div className={outerContainerClasses}>

            {isAppLayout ? (
                <AppNavbar
                    user={user}
                    userProfile={userProfile}
                    credits={credits || 0}
                    onCreate={() => setIsCreationModalOpen(true)}
                    onSignIn={() => {
                        setAuthModalMode('signin');
                        setIsAuthModalOpen(true);
                    }}
                    onToggleSettings={() => setIsSettingsModalOpen(true)}
                    onSignOut={handleSignOut}
                    onSelectMode={() => actions.setIsSelectMode(true)}
                    isSelectMode={state.isSelectMode}
                    onCancelSelectMode={() => {
                        actions.setIsSelectMode(false);
                        actions.deselectAll();
                    }}
                    onDeleteSelected={() => {
                        state.selectedIds.forEach((id: string) => actions.handleDeleteImage(id));
                        actions.setIsSelectMode(false);
                        actions.deselectAll();
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
                    mode={location.pathname.startsWith('/image/') ? 'detail' : 'grid'}
                    detailInfo={(() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            const img = allImages.find(i => i.id === id);
                            if (img) return img.title || 'Untitled';
                        }
                        return undefined;
                    })()}
                    detailActions={(() => {
                        if (!location.pathname.startsWith('/image/')) return null;
                        const id = location.pathname.split('/').pop();
                        const img = allImages.find(i => i.id === id);
                        if (!img) return null;

                        return (
                            <div className="flex items-center gap-1">
                                <RoundIconButton
                                    icon={<Download className="w-4 h-4" />}
                                    onClick={() => actions.handleDownload(img.id)}
                                    variant="ghost"
                                    tooltip={t('download') || 'Herunterladen'}
                                />
                                <RoundIconButton
                                    icon={<Info className="w-4 h-4" />}
                                    onClick={() => setInfoImageId(img.id)}
                                    variant="ghost"
                                    tooltip={t('info') || 'Info'}
                                />
                                <RoundIconButton
                                    icon={<Trash2 className="w-4 h-4" />}
                                    onClick={() => actions.handleDeleteImage(img.id)}
                                    variant="danger"
                                    tooltip={t('delete') || 'Löschen'}
                                />
                            </div>
                        );
                    })()}
                    onBack={handleBackToFeed}
                />
            ) : (
                <PublicNavbar
                    user={user}
                    onSignIn={() => {
                        setAuthModalMode('signin');
                        setIsAuthModalOpen(true);
                    }}
                    t={t}
                />
            )}

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
                                    onLoadMore={actions.handleLoadMore}
                                    isSelectMode={state.isSelectMode}
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
                                    onInfo={() => { }} // TODO: Add info modal
                                    state={state}
                                    actions={actions}
                                    t={t}
                                />
                            </ProtectedRoute>
                        } />

                        <Route path="/admin" element={
                            <AdminRoute user={user}>
                                <AdminDashboard />
                            </AdminRoute>
                        } />

                        <Route path="/contact" element={<ContactPage
                            user={user}
                            userProfile={userProfile}
                            credits={credits}
                            t={t}
                            onCreateBoard={() => setIsCreationModalOpen(true)}
                            onSignIn={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
                        />} />
                        <Route path="/impressum" element={<ImpressumPage
                            user={user}
                            userProfile={userProfile}
                            credits={credits}
                            t={t}
                            onCreateBoard={() => setIsCreationModalOpen(true)}
                            onSignIn={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
                        />} />
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
                credits={credits || 0}
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
                    />
                )}
            </Suspense>
        </div>
    );
}
