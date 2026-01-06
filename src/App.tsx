
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ImageItem } from '@/components/canvas/ImageItem';
import { CanvasSkeleton } from '@/components/canvas/CanvasSkeleton';
import { CommandDock } from '@/components/canvas/CommandDock';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { CreditsModal } from '@/components/modals/CreditsModal';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ContextMenu, ContextMenuState } from '@/components/canvas/ContextMenu';
import { AuthModal } from '@/components/modals/AuthModal';
import { CreationModal } from '@/components/modals/CreationModal';
import { useNanoController } from '@/hooks/useNanoController';
import { Plus, Layout, Home } from 'lucide-react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { useItemDialog } from '@/components/ui/Dialog';
import { downloadImage } from '@/utils/imageUtils';
import { BoardsPage } from '@/components/boards/BoardsPage';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';

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
        currentBoardId, boards, isBoardsLoading, isCanvasLoading
    } = state;

    const {
        smoothZoomTo, handleScroll, handleFileDrop, processFile, selectAndSnap,
        moveSelection, handleAddFunds, setBrushSize, setSideSheetMode, handleGenerate,
        handleGenerateMore, handleNavigateParent,
        handleUpdateAnnotations, handleUpdatePrompt, handleDeleteImage, setIsSettingsOpen, setIsDragOver,
        setQualityMode, setThemeMode, setLang, handleSelection, selectMultiple,
        addUserCategory, deleteUserCategory, addUserItem, deleteUserItem, handleSignOut, updateProfile,
        setAuthModalMode, setIsAuthModalOpen, setAuthError, setAuthEmail, moveRowSelection,
        setMaskTool, setActiveShape, setCurrentBoardId, createBoard, initializeNewBoard, deleteBoard, updateBoard, handleCreateNew,
        handleModeChange
    } = actions;

    const [settingsTab, setSettingsTab] = useState<'general' | 'account' | 'about'>('account');
    const [isCanvasZoneActive, setIsCanvasZoneActive] = useState(false);
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

    // Snap State
    const [enableSnap, setEnableSnap] = useState(true);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // Stable Editor State Object to preserve ImageItem memoization during scroll
    const editorState = useMemo(() => ({ mode: sideSheetMode, brushSize, maskTool, activeShape }), [sideSheetMode, brushSize, maskTool, activeShape]);

    // URL Routing Sync
    useEffect(() => {
        const syncUrl = async () => {
            const pathParts = location.pathname.split('/');
            if (pathParts[1] === 'projects' && pathParts[2]) {
                const identifier = decodeURIComponent(pathParts[2]);
                const resolved = await actions.resolveBoardIdentifier(identifier);

                if (resolved && resolved.id !== currentBoardId) {
                    setCurrentBoardId(resolved.id);
                }
            } else if ((pathParts[1] === 'projects' && !pathParts[2]) || location.pathname === '/') {
                if (currentBoardId !== null) {
                    setCurrentBoardId(null);
                }
            }
        };
        syncUrl();
    }, [location.pathname, actions, currentBoardId]);

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
        if (id) {
            const b = boards.find(board => board.id === id);
            navigate(`/projects/${b ? b.id : id}`);
        } else {
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
                >
                    <div
                        className="min-w-full min-h-full w-max h-max flex flex-col items-start z-10 relative will-change-transform"
                        style={{
                            padding: '50vh 50vw',
                            gap: `${12 * zoom}rem`,
                        }}
                    >
                        {isCanvasLoading && rows.length === 0 ? (
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

                    {rows.length === 0 && !isDragOver && !isCanvasLoading && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-4 text-zinc-100 opacity-20 dark:opacity-10 scale-[2.5]">
                                <Plus className="w-12 h-12" strokeWidth={1} />
                                <span className="text-[10px] tracking-[0.3em] font-light uppercase">Drop here</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <SideSheet editorActions={actions} editorState={editorState} />

            {contextMenu && (
                <ContextMenu
                    {...contextMenu}
                    onClose={() => setContextMenu(null)}
                    onDownload={handleDownload}
                    onDelete={requestDelete}
                    onRetry={handleGenerateVariations}
                    onDeselectOther={handleDeselectAllButOne}
                    onAddToSelection={handleAddToSelection}
                    onRemoveFromSelection={handleRemoveFromSelection}
                    onDownloadSelected={handleDownloadSelected}
                    selectionCount={selectedIds.length}
                    t={t}
                />
            )}

            <CreationModal
                isOpen={isCreationModalOpen}
                onClose={() => setIsCreationModalOpen(false)}
                onProcess={processFile}
                t={t}
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
            <Route path="/settings" element={<SettingsPage user={user} profile={userProfile} onUpdateProfile={updateProfile} t={t} currentLang={currentLang} onSignOut={handleSignOut} />} />
            <Route path="/settings/:tab" element={<SettingsPage user={user} profile={userProfile} onUpdateProfile={updateProfile} t={t} currentLang={currentLang} onSignOut={handleSignOut} />} />
            <Route path="/admin" element={<AdminDashboard user={user} t={t} />} />
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/v2" element={<Navigate to="/projects" replace />} />
        </Routes>
    );
}
