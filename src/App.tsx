import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ImageItem } from '@/components/canvas/ImageItem';
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

export function App() {
    const { state, actions, refs, t } = useNanoController();
    const navigate = useNavigate();
    const location = useLocation();

    const {
        rows, selectedIds, zoom, credits, sideSheetMode, brushSize, maskTool, isDragOver,
        isSettingsOpen, selectedImage, selectedImages, qualityMode, themeMode, lang,
        isAdminOpen, currentLang, allImages, fullLibrary, user, userProfile,
        authModalMode, isAuthModalOpen, authError, authEmail, isAutoScrolling, isZooming,
        currentBoardId, boards, isBoardsLoading
    } = state;
    const {
        smoothZoomTo, handleScroll, handleFileDrop, processFile, selectAndSnap,
        moveSelection, handleAddFunds, setBrushSize, setSideSheetMode, handleGenerate,
        handleGenerateMore, handleNavigateParent,
        handleUpdateAnnotations, handleUpdatePrompt, handleDeleteImage, setIsSettingsOpen, setIsDragOver,
        setQualityMode, setThemeMode, setLang, setIsAdminOpen, handleSelection, selectMultiple,
        addUserCategory, deleteUserCategory, addUserItem, deleteUserItem, handleSignOut, updateProfile,
        setAuthModalMode, setIsAuthModalOpen, setAuthError, setAuthEmail, moveRowSelection,
        setMaskTool, setCurrentBoardId, createBoard, initializeNewBoard, deleteBoard, updateBoard, handleCreateNew
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
    const editorState = useMemo(() => ({ mode: sideSheetMode, brushSize, maskTool }), [sideSheetMode, brushSize, maskTool]);

    // URL Routing Sync
    useEffect(() => {
        const syncUrl = async () => {
            const pathParts = location.pathname.split('/');
            if (pathParts[1] === 'board' && pathParts[2]) {
                const identifier = decodeURIComponent(pathParts[2]);
                const resolved = await actions.resolveBoardIdentifier(identifier);

                if (resolved && resolved.id !== currentBoardId) {
                    setCurrentBoardId(resolved.id);
                }
            } else if (pathParts[1] === 'boards' || location.pathname === '/') {
                if (currentBoardId !== null) {
                    setCurrentBoardId(null);
                }
            }
        };
        syncUrl();
    }, [location.pathname, actions, currentBoardId, setCurrentBoardId]);

    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/admin') {
            setIsAdminOpen(true);
        }
    }, [setIsAdminOpen]);

    useEffect(() => {
        const handleWindowDragEnter = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('Files')) {
                setIsDragOver(true);
            }
        };
        window.addEventListener('dragenter', handleWindowDragEnter);
        return () => window.removeEventListener('dragenter', handleWindowDragEnter);
    }, [setIsDragOver]);

    // Manage Snap State (Restore on selection change)
    useEffect(() => {
        if (selectedIds.length === 1) {
            setEnableSnap(true);
            actions.setSnapEnabled(true);
        } else {
            setEnableSnap(false);
            actions.setSnapEnabled(false);
        }
    }, [selectedIds.length, state.primarySelectedId, actions]);

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
    }, [setSideSheetMode]);

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
        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) panState.current.hasMoved = true;
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
                        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                            setEnableSnap(true);
                            actions.setSnapEnabled(true);
                        }
                    }
                } else {
                    selectMultiple([]);
                    setEnableSnap(false);
                    actions.setSnapEnabled(false);
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

        // If we are deleting a single item that is currently part of a larger selection, 
        // assume the user wants to delete the whole selection
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
            navigate(`/board/${newBoard.name}`);
        }
    };

    const handleSelectBoard = (id: string | null) => {
        if (id) {
            const b = boards.find(board => board.id === id);
            navigate(`/board/${b ? b.name : id}`);
        } else {
            navigate('/boards');
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
                    className={`w-full h-full overflow-auto no-scrollbar ${Theme.Colors.CanvasBg} overscroll-none relative ${enableSnap && !isAutoScrolling && !isZooming ? 'snap-both snap-mandatory' : ''}`}
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
                            gap: `${6 * zoom}rem`,
                        }}
                    >
                        {rows.map((row) => (
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
                                            onNavigate={moveSelection}
                                            hasLeft={!selectedIds.length && imgIndex > 0}
                                            hasRight={!selectedIds.length && imgIndex < row.items.length - 1}
                                            onDelete={requestDelete}
                                            onContextMenu={handleImageContextMenu}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}


                    </div>

                    {rows.length === 0 && !isDragOver && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <label className="pointer-events-auto flex items-center gap-3 cursor-pointer group p-6 hover:scale-105 transition-transform">
                                <Plus className={`w-5 h-5 ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white transition-colors`} />
                                <span className={`${Typo.Label} ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white`}>{t('create_first')}</span>
                                <input type="file" accept="image/*" className="hidden" multiple onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach((f) => processFile(f as File)); }} />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <SideSheet
                selectedImage={selectedImage}
                selectedImages={selectedImages}
                sideSheetMode={sideSheetMode}
                onModeChange={setSideSheetMode}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                onGenerate={handleGenerate}
                onUpdateAnnotations={handleUpdateAnnotations}
                onUpdatePrompt={handleUpdatePrompt}
                onDeleteImage={requestDelete}
                onDeselectAllButOne={handleDeselectAllButOne}
                onDeselectAll={() => selectMultiple([])}
                onGenerateMore={handleGenerateMore}
                onNavigateParent={handleNavigateParent}
                isGlobalDragOver={isDragOver}
                onGlobalDragLeave={() => setIsDragOver(false)}
                t={t}
                lang={currentLang}
                fullLibrary={fullLibrary}
                onAddUserCategory={addUserCategory}
                onDeleteUserCategory={deleteUserCategory}
                onAddUserItem={addUserItem}
                onDeleteUserItem={deleteUserItem}
                maskTool={maskTool}
                onMaskToolChange={setMaskTool}

                onUpload={() => document.getElementById('ctx-upload-input')?.click()}
                onCreateNew={() => setIsCreationModalOpen(true)}
                isBoardEmpty={rows.length === 0}
                qualityMode={qualityMode}
                onQualityModeChange={setQualityMode}
            />

            <input
                id="ctx-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                multiple
                onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach((f) => processFile(f as File)); }}
            />

            <ContextMenu
                menu={contextMenu}
                images={allImages}
                onClose={() => setContextMenu(null)}
                onDownload={handleDownload}
                onDelete={requestDelete}
                onSelect={selectAndSnap}
                onAddToSelection={handleAddToSelection}
                onRemoveFromSelection={handleRemoveFromSelection}
                onSelectAll={() => selectMultiple(allImages.map(i => i.id))}
                onDeselectAll={() => selectMultiple([])}
                onResetView={() => smoothZoomTo(1.0)}
                onUpload={handleDockUpload}
                onCreateNew={() => setIsCreationModalOpen(true)}
                selectedIds={selectedIds}
                onDownloadSelected={handleDownloadSelected}
                onDeleteSelected={() => requestDelete(selectedIds)}
                onGenerateVariations={handleGenerateVariations}
                t={t}
            />



            <CreationModal
                isOpen={isCreationModalOpen}
                onClose={() => setIsCreationModalOpen(false)}
                onGenerate={(prompt, model, ratio) => {
                    handleCreateNew(prompt, model, ratio);
                    setIsCreationModalOpen(false);
                }}
                t={t}
                lang={currentLang}
            />

            <CreditsModal
                isOpen={isCreditsModalOpen}
                onClose={() => setIsCreditsModalOpen(false)}
                currentBalance={credits}
                onAddFunds={handleAddFunds}
                t={t}
            />

            {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} t={t} />}
        </div>
    );

    const settingsPage = (
        <SettingsPage
            qualityMode={qualityMode}
            onQualityModeChange={setQualityMode}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            currentBalance={credits}
            lang={lang}
            onLangChange={setLang}
            user={user}
            userProfile={userProfile}
            onSignOut={handleSignOut}
            onAddFunds={handleAddFunds}
            onOpenAdmin={() => setIsAdminOpen(true)}
            t={t}
            updateProfile={updateProfile}
            onCreateBoard={handleCreateBoardAndNavigate}
        />
    );

    return (
        <Routes>
            <Route path="/boards" element={boardsPage} />
            <Route path="/board/:boardId" element={canvasView} />
            <Route path="/settings" element={settingsPage} />
            <Route path="/settings/:tab" element={settingsPage} />
            <Route path="/admin" element={boardsPage} />
            <Route path="/" element={<Navigate to="/boards" replace />} />
        </Routes>
    );
}
