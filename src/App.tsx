// Version: 2026-01-09-18:02 - Fixed upload crash and home navigation

import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { ImageItem } from '@/components/canvas/ImageItem';
import { CanvasSkeleton } from '@/components/canvas/CanvasSkeleton';
import { CommandDock } from '@/components/canvas/CommandDock';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { CreditsModal } from '@/components/modals/CreditsModal';
import { ContextMenu, ContextMenuState } from '@/components/canvas/ContextMenu';
import { AuthModal } from '@/components/modals/AuthModal';
import { CreationModal } from '@/components/modals/CreationModal';
import { useNanoController } from '@/hooks/useNanoController';
import { Plus, Layout, Home, Upload, Loader2 } from 'lucide-react';
import { Typo, Theme, Button } from '@/components/ui/DesignSystem';
import { Logo } from '@/components/ui/Logo';
import { useItemDialog } from '@/components/ui/Dialog';
import { downloadImage } from '@/utils/imageUtils';
import { BoardsPage } from '@/components/boards/BoardsPage';
import { ProgressBar } from '@/components/ui/DesignSystem';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';

// Code-split Admin Dashboard (only loads for admins)
const AdminDashboard = React.lazy(() => import('@/components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PlaygroundPage = React.lazy(() => import('@/components/playground/PlaygroundPage').then(m => ({ default: m.PlaygroundPage })));
import { AdminRoute } from '@/components/admin/AdminRoute';


const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const BoardRedirect = () => {
    const { boardId } = useParams();
    return <Navigate to={`/projects/${boardId}`} replace />;
};

export function App() {
    const { state, actions, refs, t } = useNanoController();
    const navigate = useNavigate();
    const location = useLocation();

    const {
        rows, selectedIds, zoom, credits, sideSheetMode, brushSize, maskTool, activeShape, isDragOver,
        isSettingsOpen, selectedImage, selectedImages, qualityMode, themeMode, lang,
        currentLang, allImages, fullLibrary, user, userProfile,
        authModalMode, isAuthModalOpen, authError, authEmail, isAutoScrolling, isZooming,
        currentBoardId, boards, isBoardsLoading, isCanvasLoading, templates,
        resolvingBoardId, loadingProgress, isBrushResizing
    } = state;

    const {
        smoothZoomTo, handleScroll, handleFileDrop, processFile, selectAndSnap,
        moveSelection, handleAddFunds, setBrushSize, setSideSheetMode, handleGenerate,
        handleGenerateMore, handleNavigateParent,
        handleUpdateAnnotations, handleUpdatePrompt, handleDeleteImage, setIsSettingsOpen, setIsDragOver,
        setQualityMode, setThemeMode, setLang, handleSelection, selectMultiple,
        addUserCategory, deleteUserCategory, addUserItem, deleteUserItem, handleSignOut, updateProfile,
        setAuthModalMode, setIsAuthModalOpen, setAuthError, setAuthEmail, moveRowSelection,
        setMaskTool, setActiveShape, setCurrentBoardId, setResolvingBoardId, setRows, createBoard, initializeNewBoard, deleteBoard, updateBoard, handleCreateNew,
        handleModeChange, handleUpdateVariables, handleUpdateImageTitle, refreshTemplates, setIsBrushResizing,
        savePreset, deletePreset, setIsCanvasLoading, resolveBoardIdentifier
    } = actions;

    const [settingsTab, setSettingsTab] = useState<'general' | 'account' | 'about'>('account');
    const [isCanvasZoneActive, setIsCanvasZoneActive] = useState(false);
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

    // Snap State
    const [enableSnap, setEnableSnap] = useState(true);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const sideSheetHandlersRef = useRef<{ onStart: () => void, onEnd: () => void } | null>(null);

    // Active Annotation State
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

    // Stable Editor State Object to preserve ImageItem memoization during scroll
    const editorState = useMemo(() => ({
        mode: sideSheetMode,
        brushSize,
        maskTool,
        activeShape,
        isBrushResizing,
        activeAnnotationId,
        onActiveAnnotationChange: setActiveAnnotationId
    }), [sideSheetMode, brushSize, maskTool, activeShape, isBrushResizing, activeAnnotationId]);

    // Track currentBoardId in a ref so we can read it without triggering re-renders
    const currentBoardIdRef = useRef(currentBoardId);
    useEffect(() => {
        currentBoardIdRef.current = currentBoardId;
    }, [currentBoardId]);

    // Track if a sync is currently running to prevent race conditions
    const isSyncingRef = useRef(false);

    // URL Routing Sync
    useEffect(() => {
        const syncUrl = async () => {
            const path = location.pathname;
            const pathParts = path.split('/').filter(Boolean);
            console.log('[DEBUG_SYNC] 1. Sync check triggered. Path:', path, 'User:', user?.id, 'Syncing:', isSyncingRef.current);
            console.log('[DEBUG_SYNC] 1a. Refs - Resolving:', resolvingBoardId, 'CurrentBoard:', currentBoardIdRef.current);

            // Prevent multiple parallel syncs
            if (isSyncingRef.current) {
                console.log('[DEBUG_SYNC] Sync already in progress, skipping');
                return;
            }

            if (pathParts[0] === 'projects' && pathParts[1]) {
                const identifier = decodeURIComponent(pathParts[1]);

                // Only skip if we've already loaded this board (currentBoardId matches)
                // Don't skip if we're just "resolving" - that means we're still loading!
                if (identifier === currentBoardIdRef.current) {
                    console.log('[DEBUG_SYNC] 2. Skipping sync - board already loaded. Identifier:', identifier);
                    return;
                }

                // Wait for user to be loaded before attempting resolution
                if (!user) {
                    console.log('[DEBUG_SYNC] 2. Waiting for user to be loaded before syncing board');
                    return;
                }

                isSyncingRef.current = true;
                console.log(`[DEBUG_SYNC] 3. Starting sync for board: ${identifier}`);

                try {
                    setResolvingBoardId(identifier);

                    // Don't clear rows here - let useNanoController handle it to avoid race conditions

                    const resolved = await resolveBoardIdentifier(identifier);
                    console.log('[DEBUG_SYNC] 4. Resolution result:', resolved?.id);

                    if (resolved) {
                        if (resolved.id !== currentBoardIdRef.current) {
                            console.log('[DEBUG_SYNC] 5. Setting new board ID:', resolved.id);
                            setIsCanvasLoading(true);
                            setCurrentBoardId(resolved.id);
                        } else {
                            console.log('[DEBUG_SYNC] 5. Board ID matches current, no update needed');
                        }
                    } else {
                        // Board not found: redirect to projects list
                        console.log('[DEBUG_SYNC] 5. Board not found, redirecting to /projects');
                        navigate('/projects');
                    }
                } catch (error) {
                    console.error('[DEBUG_SYNC] Error during board sync:', error);
                    navigate('/projects');
                } finally {
                    setResolvingBoardId(null);
                    isSyncingRef.current = false;
                    console.log('[DEBUG_SYNC] 6. Sync completed, lock released');
                }
            } else {
                console.log('[DEBUG_SYNC] 2. Not a project URL');
            }
            // Note: Board clearing is handled by handleSelectBoard(null), not by URL observation.
            // This prevents race conditions where the board gets cleared after successful data load.
        };
        syncUrl();
    }, [location.pathname, user, resolvingBoardId, resolveBoardIdentifier, navigate, setResolvingBoardId, setRows, setIsCanvasLoading, setCurrentBoardId]);


    useEffect(() => {
        const handleWindowDragEnter = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('Files') && !isCreationModalOpen) {
                setIsDragOver(true);
            }
        };
        window.addEventListener('dragenter', handleWindowDragEnter);
        return () => window.removeEventListener('dragenter', handleWindowDragEnter);
    }, [setIsDragOver, isCreationModalOpen]);

    // Manage Snap State: Only snap when exactly one item is selected
    useEffect(() => {
        if (selectedIds.length === 1) {
            setEnableSnap(true);
            actions.setSnapEnabled(true);
        } else {
            setEnableSnap(false);
            actions.setSnapEnabled(false);
        }
    }, [selectedIds.length, actions]);

    const handleDragLeave = (e: React.DragEvent) => {
        if (!e.relatedTarget) {
            setIsDragOver(false);
            setIsCanvasZoneActive(false);
        }
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setIsCanvasZoneActive(false);
        handleFileDrop(e);
    };

    const handleAnnotationEditStart = useCallback((mode: 'brush' | 'objects') => {
        setSideSheetMode(mode);
        smoothZoomTo(1.0);
    }, [setSideSheetMode, smoothZoomTo]);

    const handleDockUpload = (files: FileList) => {
        Array.from(files).forEach((f) => processFile(f));
    };

    const handleOpenSettings = (tab: 'general' | 'account' | 'about' = 'account') => {
        setSettingsTab(tab);
        setIsSettingsOpen(true);
    };

    // --- Pan (Hand Tool) Logic ---
    const panState = useRef<{ isPanning: boolean, startX: number, startY: number, scrollLeft: number, scrollTop: number, hasMoved: boolean } | null>(null);

    const handleBackgroundMouseDown = (e: React.MouseEvent) => {
        if (contextMenu) setContextMenu(null);
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('input')) return;

        // Disable panning in annotation mode to prevent conflicts
        if (sideSheetMode === 'brush' || sideSheetMode === 'objects') return;

        e.preventDefault();

        if (refs.scrollContainerRef.current) {
            panState.current = {
                isPanning: true,
                startX: e.clientX,
                startY: e.clientY,
                scrollLeft: refs.scrollContainerRef.current.scrollLeft,
                scrollTop: refs.scrollContainerRef.current.scrollTop,
                hasMoved: false
            };
            document.body.style.cursor = 'grabbing';
            setEnableSnap(false);
            actions.setSnapEnabled(false);
        }
    };

    const handleBackgroundMouseMove = (e: React.MouseEvent) => {
        if (!panState.current || !panState.current.isPanning || !refs.scrollContainerRef.current) return;
        e.preventDefault();
        const deltaX = e.clientX - panState.current.startX;
        const deltaY = e.clientY - panState.current.startY;

        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
            if (!panState.current.hasMoved) {
                if (selectedIds.length > 0) {
                    selectMultiple([]);
                }
                setEnableSnap(false);
                actions.setSnapEnabled(false);
                panState.current.hasMoved = true;
            }
        }

        refs.scrollContainerRef.current.scrollLeft = panState.current.scrollLeft - deltaX;
        refs.scrollContainerRef.current.scrollTop = panState.current.scrollTop - deltaY;
    };

    const handleBackgroundMouseUp = (e: React.MouseEvent) => {
        if (panState.current) {
            if (!panState.current.hasMoved) {
                const target = e.target as HTMLElement;
                const imageWrapper = target.closest('[data-image-id]');
                if (imageWrapper) {
                    const id = imageWrapper.getAttribute('data-image-id');
                    if (id) {
                        handleSelection(id, e.metaKey || e.ctrlKey, e.shiftKey);
                    }
                } else {
                    selectMultiple([]);
                }
            }

            panState.current = null;
            document.body.style.cursor = '';
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'background' });
    };

    const handleImageContextMenu = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedIds.includes(id)) selectAndSnap(id);
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'image', targetId: id });
    }, [selectedIds, selectAndSnap]);

    const handleDownload = async (id: string) => {
        const img = allImages.find(i => i.id === id);
        if (img) {
            await downloadImage(img.src, img.title);
        }
    };

    const { confirm } = useItemDialog();

    const requestDelete = useCallback(async (idsOrId: string | string[]) => {
        let idsArray = Array.isArray(idsOrId) ? idsOrId : [idsOrId];
        if (idsArray.length === 1 && selectedIds.length > 1 && selectedIds.includes(idsArray[0])) {
            idsArray = selectedIds;
        }

        if (idsArray.length === 0) return;
        const count = idsArray.length;
        const finalDesc = count > 1
            ? (currentLang === 'de' ? `Möchtest du wirklich ${count} Bilder löschen?` : `Do you really want to delete ${count} images?`)
            : t('delete_confirm_single');

        const confirmed = await confirm({
            title: t('delete'),
            description: finalDesc,
            confirmLabel: t('delete'),
            variant: 'danger'
        });
        if (confirmed) handleDeleteImage(idsArray);
    }, [currentLang, t, confirm, handleDeleteImage, selectedIds]);

    const handleDownloadSelected = useCallback(async () => {
        for (const id of selectedIds) {
            const img = allImages.find(i => i.id === id);
            if (img && img.src) {
                await downloadImage(img.src, img.title);
                await new Promise(r => setTimeout(r, 300));
            }
        }
    }, [selectedIds, allImages]);

    const handleGenerateVariations = useCallback((id?: string) => {
        if (id) {
            handleGenerateMore(id);
        } else {
            selectedImages.forEach(img => handleGenerateMore(img));
        }
    }, [selectedImages, handleGenerateMore]);

    const handleDeselectAllButOne = () => {
        if (selectedIds.length > 0) {
            const targetId = selectedIds[selectedIds.length - 1];
            selectAndSnap(targetId);
        }
    };

    const handleAddToSelection = (id: string) => {
        if (!selectedIds.includes(id)) selectMultiple([...selectedIds, id]);
    };

    const handleRemoveFromSelection = (id: string) => {
        selectMultiple(selectedIds.filter(i => i !== id));
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopPropagation();
                if (selectedIds.length > 0) requestDelete(selectedIds);
            }
            if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelection(-1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); moveSelection(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveRowSelection(-1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); moveRowSelection(1); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, moveSelection, moveRowSelection, requestDelete]);

    const handleCreateBoardAndNavigate = async () => {
        const newBoard = await createBoard();
        if (newBoard) {
            navigate(`/projects/${newBoard.id}`);
        }
    };

    const handleSelectBoard = (id: string | null) => {
        console.log('[DEBUG] handleSelectBoard called with id:', id);
        if (id) {
            const b = boards.find(board => board.id === id);
            const targetId = b ? b.id : id;
            if (targetId !== currentBoardId) {
                setResolvingBoardId(targetId);
                // Also set currentBoardId immediately if it's already a UUID
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
                    setCurrentBoardId(targetId);
                }
                setRows([]); // Clear current view
            }
            navigate(`/projects/${targetId}`);
        } else {
            // Clear state immediately when going home
            setCurrentBoardId(null);
            setRows([]);
            selectMultiple([]); // Clear selection to prevent crashes in SideSheet/Canvas
            navigate('/projects');
        }
    };

    if (!user) {
        return (
            <div className={`flex h-screen w-screen ${Theme.Colors.CanvasBg} overflow-hidden`}>
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
            </div>
        );
    }

    const boardsPage = (
        <BoardsPage
            boards={boards}
            onSelectBoard={handleSelectBoard}
            onCreateBoard={handleCreateBoardAndNavigate}
            onDeleteBoard={deleteBoard}
            onRenameBoard={(id, name) => updateBoard(id, { name })}
            user={user}
            userProfile={userProfile}
            onOpenSettings={(tab) => navigate(`/settings/${tab || 'account'}`)}
            t={t}
            lang={currentLang}
            isLoading={isBoardsLoading}
            credits={credits}
        />
    );

    const canvasView = (
        <div
            className={`flex h-screen w-screen ${Theme.Colors.CanvasBg} overflow-hidden ${Theme.Colors.TextPrimary} ${Theme.Fonts.Main} selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black`}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onMouseUp={handleBackgroundMouseUp}
            onContextMenu={handleContextMenu}
        >
            <ProgressBar isVisible={isCanvasLoading || !!resolvingBoardId} progress={loadingProgress || (resolvingBoardId ? 30 : 0)} />
            <div className="fixed top-6 left-6 z-50 flex items-center gap-3">
                <CommandDock
                    zoom={zoom}
                    credits={credits}
                    onZoomChange={(z) => smoothZoomTo(z)}
                    onOpenSettings={() => navigate('/settings')}
                    onOpenCredits={() => setIsCreditsModalOpen(true)}
                    onHome={() => handleSelectBoard(null)}
                    onAnnotate={() => {
                        if (sideSheetMode === 'brush' || sideSheetMode === 'objects') {
                            handleModeChange('prompt');
                        } else {
                            handleModeChange('brush');
                        }
                    }}
                    isAnnotationMode={sideSheetMode === 'brush'}
                    onUpload={handleDockUpload}
                    onCreateNew={() => setIsCreationModalOpen(true)}
                    t={t}
                />
            </div>

            <div className="flex-1 relative h-full overflow-hidden">
                {isDragOver && (
                    <div
                        onClick={() => { setIsDragOver(false); setIsCanvasZoneActive(false); }}
                        onDrop={handleCanvasDrop}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDragEnter={() => setIsCanvasZoneActive(true)}
                        onDragLeave={() => setIsCanvasZoneActive(false)}
                        className={`
                            absolute inset-4 z-[100] ${Theme.Geometry.RadiusLg} flex items-center justify-center transition-all duration-200 pointer-events-auto
                            ${isCanvasZoneActive ? 'bg-zinc-800/90 border-zinc-600 scale-[1.01]' : 'bg-white/80 dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800 scale-100'}
                            border backdrop-blur-sm
                        `}
                    >
                        <div className="flex flex-col items-center gap-3 pointer-events-none">
                            <Plus className={`w-8 h-8 ${isCanvasZoneActive ? 'text-white' : 'text-zinc-500'}`} strokeWidth={1.5} />
                            <span className={`${Typo.Label} ${isCanvasZoneActive ? 'text-white' : 'text-zinc-500'} tracking-widest`}>{t('create')}</span>
                        </div>
                    </div>
                )}

                <div
                    ref={refs.scrollContainerRef}
                    className={`w-full h-full overflow-auto no-scrollbar ${Theme.Colors.CanvasBg} overscroll-none relative ${enableSnap && !isZooming && !isAutoScrolling ? 'snap-both snap-mandatory' : ''}`}
                    style={{ overflowAnchor: 'none' }}
                    onScroll={handleScroll}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleCanvasDrop}
                    onMouseDown={handleBackgroundMouseDown}
                    onMouseMove={handleBackgroundMouseMove}
                    onContextMenu={handleContextMenu}
                >
                    <div
                        className="min-w-full min-h-full w-max h-max flex flex-col items-start z-10 relative will-change-transform"
                        style={{
                            padding: '50vh 50vw',
                            gap: `${6 * zoom}rem`,
                        }}
                    >
                        {(isCanvasLoading || resolvingBoardId) && rows.length === 0 ? (
                            <CanvasSkeleton zoom={zoom} />
                        ) : (
                            rows.map((row) => (
                                <div key={row.id} data-row-id={row.id} className="flex flex-col shrink-0">
                                    <div className="flex items-center" style={{ gap: `${3 * zoom}rem` }}>
                                        {row.items.map((img, imgIndex) => (
                                            <ImageItem
                                                key={img.id}
                                                image={img}
                                                zoom={zoom}
                                                isSelected={selectedIds.includes(img.id)}
                                                hasAnySelection={selectedIds.length > 0}
                                                onRetry={handleGenerateMore}
                                                onChangePrompt={handleNavigateParent}
                                                editorState={editorState}
                                                onUpdateAnnotations={handleUpdateAnnotations}
                                                onEditStart={handleAnnotationEditStart}
                                                editorActions={{
                                                    setMaskTool: actions.setMaskTool,
                                                    setBrushSize: actions.setBrushSize,
                                                    setActiveShape: actions.setActiveShape
                                                }}
                                                onInteractionStart={() => sideSheetHandlersRef.current?.onStart()}
                                                onInteractionEnd={() => sideSheetHandlersRef.current?.onEnd()}
                                                onNavigate={moveSelection}
                                                hasLeft={imgIndex > 0}
                                                hasRight={imgIndex < row.items.length - 1}
                                                onDelete={requestDelete}
                                                onContextMenu={handleImageContextMenu}
                                                t={t}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>


                    {rows.length === 0 && !isDragOver && !isCanvasLoading && !resolvingBoardId && (
                        <div className="absolute inset-0 flex items-center justify-center p-8 text-center z-20 overflow-y-auto">
                            <div className="flex flex-col items-center gap-12 w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-700">
                                {/* Header */}
                                <div className="flex flex-col items-center gap-6 w-full">
                                    <Logo className="w-16 h-16 shrink-0" />
                                    <div className="flex flex-col gap-6 w-full">
                                        <h2
                                            className={`text-3xl font-medium tracking-tight ${Theme.Colors.TextHighlight} flex items-center justify-center gap-2`}
                                            style={{ fontFamily: "'Kumbh Sans', sans-serif" }}
                                        >
                                            Willkommen bei exposé
                                        </h2>
                                        <p className={`font-mono text-[15px] leading-relaxed ${Theme.Colors.TextSecondary} w-full max-w-[320px] mx-auto`}>
                                            {t(allImages.length === 0 ? 'welcome_empty_desc' : 'welcome_desc')}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex flex-col gap-3 w-full max-w-[320px]">
                                    <input
                                        type="file"
                                        id="canvas-welcome-upload"
                                        className="hidden"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach((f) => processFile(f as File)); }}
                                    />
                                    <Button
                                        variant="primary"
                                        className="w-full"
                                        onClick={() => document.getElementById('canvas-welcome-upload')?.click()}
                                        icon={<Upload className="w-5 h-5" />}
                                    >
                                        {t('upload_image_edit')}
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={() => setIsCreationModalOpen(true)}
                                        icon={<Plus className="w-5 h-5" />}
                                    >
                                        {t('generate_new')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedIds.length > 0 && selectedImage && (
                <SideSheet
                    selectedImage={selectedImage}
                    selectedImages={selectedImages}
                    sideSheetMode={sideSheetMode}
                    onModeChange={handleModeChange}
                    onDeselectAll={() => selectMultiple([])}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    onBrushResizeStart={() => setIsBrushResizing(true)}
                    onBrushResizeEnd={() => setIsBrushResizing(false)}
                    onGenerate={handleGenerate}
                    onUpdateAnnotations={handleUpdateAnnotations}
                    onUpdatePrompt={handleUpdatePrompt}
                    onUpdateVariables={handleUpdateVariables}
                    onUpdateImageTitle={handleUpdateImageTitle}
                    onDeleteImage={handleDeleteImage}
                    onGenerateMore={handleGenerateMore}
                    onNavigateParent={handleNavigateParent}
                    isGlobalDragOver={isDragOver}
                    onGlobalDragLeave={() => setIsDragOver(false)}
                    t={t}
                    lang={currentLang}
                    fullLibrary={fullLibrary}
                    onAddUserCategory={addUserCategory}
                    onDeleteUserCategory={deleteUserCategory}
                    onDeleteUserItem={deleteUserItem}
                    maskTool={maskTool}
                    onMaskToolChange={setMaskTool}
                    activeShape={activeShape}
                    onActiveShapeChange={setActiveShape}
                    onActiveAnnotationChange={setActiveAnnotationId}
                    onInteractionStart={() => { /* Handled via ref below */ }}
                    onInteractionEnd={() => { /* Handled via ref below */ }}
                    onUpload={() => processFile()}
                    onCreateNew={() => setIsCreationModalOpen(true)}
                    isBoardEmpty={rows.length === 0}
                    qualityMode={qualityMode}
                    onQualityModeChange={setQualityMode}
                    templates={templates}
                    onRefreshTemplates={refreshTemplates}
                    userProfile={userProfile}
                    // Hack to bridge handlers without exposing them as public state
                    ref={(el: any) => {
                        if (el) {
                            sideSheetHandlersRef.current = {
                                onStart: el.handleInteractionStart,
                                onEnd: el.handleInteractionEnd
                            };
                        }
                    }}
                />
            )}

            {contextMenu && (
                <ContextMenu
                    menu={contextMenu}
                    images={allImages}
                    onClose={() => setContextMenu(null)}
                    onDownload={handleDownload}
                    onDelete={requestDelete}
                    onSelect={(id) => selectAndSnap(id)}
                    onAddToSelection={handleAddToSelection}
                    onRemoveFromSelection={handleRemoveFromSelection}
                    onSelectAll={() => selectMultiple(allImages.map(img => img.id))}
                    onDeselectAll={() => selectMultiple([])}
                    onResetView={() => smoothZoomTo(1, 0, 0)}
                    onUpload={() => processFile()}
                    onCreateNew={() => setIsCreationModalOpen(true)}
                    selectedIds={selectedIds}
                    onDownloadSelected={handleDownloadSelected}
                    onDeleteSelected={() => requestDelete(selectedIds)}
                    onGenerateVariations={handleGenerateVariations}
                    t={t}
                />
            )}

            <CreationModal
                isOpen={isCreationModalOpen}
                onClose={() => setIsCreationModalOpen(false)}
                onGenerate={handleCreateNew}
                t={t}
                lang={lang}
            />

            <CreditsModal
                isOpen={isCreditsModalOpen}
                onClose={() => setIsCreditsModalOpen(false)}
                credits={credits}
                onAddFunds={handleAddFunds}
                t={t}
            />
        </div>
    );

    return (
        <Routes>
            <Route path="/projects" element={boardsPage} />
            <Route path="/projects/:boardId" element={canvasView} />
            <Route path="/settings" element={
                <SettingsPage
                    user={user}
                    userProfile={userProfile}
                    updateProfile={updateProfile}
                    t={t}
                    currentBalance={credits}
                    onAddFunds={handleAddFunds}
                    qualityMode={qualityMode}
                    onQualityModeChange={setQualityMode}
                    themeMode={themeMode}
                    onThemeChange={setThemeMode}
                    lang={lang}
                    onLangChange={setLang}
                    onSignOut={handleSignOut}
                    onCreateBoard={handleCreateBoardAndNavigate}
                />
            } />
            <Route path="/settings/:tab" element={
                <SettingsPage
                    user={user}
                    userProfile={userProfile}
                    updateProfile={updateProfile}
                    t={t}
                    currentBalance={credits}
                    onAddFunds={handleAddFunds}
                    qualityMode={qualityMode}
                    onQualityModeChange={setQualityMode}
                    themeMode={themeMode}
                    onThemeChange={setThemeMode}
                    lang={lang}
                    onLangChange={setLang}
                    onSignOut={handleSignOut}
                    onCreateBoard={handleCreateBoardAndNavigate}
                />
            } />
            <Route path="/admin" element={
                <AdminRoute user={user} userProfile={userProfile}>
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-400"><div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin" /><span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Admin Panel wird geladen</span></div></div>}>
                        <AdminDashboard
                            user={user}
                            userProfile={userProfile}
                            credits={credits}
                            onCreateBoard={handleCreateBoardAndNavigate}
                            t={t}
                        />
                    </Suspense>
                </AdminRoute>
            } />
            <Route path="/admin/:tab" element={
                <AdminRoute user={user} userProfile={userProfile}>
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-400"><div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin" /><span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Admin Panel wird geladen</span></div></div>}>
                        <AdminDashboard
                            user={user}
                            userProfile={userProfile}
                            credits={credits}
                            onCreateBoard={handleCreateBoardAndNavigate}
                            t={t}
                        />
                    </Suspense>
                </AdminRoute>
            } />
            <Route path="/playground" element={
                <Suspense fallback={null}>
                    <PlaygroundPage t={t} />
                </Suspense>
            } />
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/v2" element={<Navigate to="/projects" replace />} />
        </Routes>
    );
}
