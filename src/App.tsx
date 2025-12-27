import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ImageItem } from '@/components/canvas/ImageItem';
import { CommandDock } from '@/components/canvas/CommandDock';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ContextMenu, ContextMenuState } from '@/components/canvas/ContextMenu';
import { AuthModal } from '@/components/modals/AuthModal';
import { useNanoController } from '@/hooks/useNanoController';
import { Plus, ImagePlus } from 'lucide-react';
import { Typo, Theme } from '@/components/ui/DesignSystem';
import { useItemDialog } from '@/components/ui/Dialog';

export function App() {
    const { state, actions, refs, t } = useNanoController();
    const {
        rows, selectedIds, zoom, credits, sideSheetMode, brushSize, isDragOver,
        isSettingsOpen, selectedImage, selectedImages, qualityMode, themeMode, lang, isAdminOpen, currentLang, allImages, fullLibrary, user, userProfile,
        authModalMode, isAuthModalOpen, authError, authEmail, isAutoScrolling, isZooming
    } = state;
    const {
        smoothZoomTo, handleScroll, handleFileDrop, processFile, selectAndSnap,
        moveSelection, handleAddFunds, setBrushSize, setSideSheetMode, handleGenerate,
        handleGenerateMore, handleNavigateParent,
        handleUpdateAnnotations, handleUpdatePrompt, handleDeleteImage, setIsSettingsOpen, setIsDragOver,
        setQualityMode, setThemeMode, setLang, setIsAdminOpen, handleSelection, selectMultiple,
        addUserCategory, deleteUserCategory, addUserItem, deleteUserItem, handleSignOut,
        setAuthModalMode, setIsAuthModalOpen, setAuthError, setAuthEmail, moveRowSelection
    } = actions;

    const [settingsTab, setSettingsTab] = useState<'general' | 'account' | 'about'>('account');
    const [isCanvasZoneActive, setIsCanvasZoneActive] = useState(false);

    // Snap State
    const [enableSnap, setEnableSnap] = useState(true);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // Stable Editor State Object to preserve ImageItem memoization during scroll
    const editorState = useMemo(() => ({ mode: sideSheetMode, brushSize }), [sideSheetMode, brushSize]);

    // URL Routing Support
    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/admin') {
            setIsAdminOpen(true);
        }
        // Log version for debugging
        // @ts-ignore
        console.log("Exposé v5.1.0-fix-zoom-v2 - Environment:", import.meta.env.MODE);
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
            try {
                // Fetch blob to enforce download (instead of opening in new tab)
                const response = await fetch(img.src);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${img.title}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (e) {
                console.error("Download failed, fallback to link", e);
                // Fallback
                const link = document.createElement('a');
                link.href = img.src;
                link.download = `${img.title}.png`;
                link.target = "_blank";
                link.click();
            }
        }
    };

    const { confirm } = useItemDialog();

    const requestDelete = useCallback(async (ids: string | string[]) => {
        const idsArray = Array.isArray(ids) ? ids : [ids];
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
    }, [currentLang, t, confirm, handleDeleteImage]);

    const handleDownloadSelected = useCallback(() => {
        selectedIds.forEach(id => handleDownload(id));
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

    return (
        <div
            className={`flex h-screen w-screen ${Theme.Colors.CanvasBg} overflow-hidden ${Theme.Colors.TextPrimary} ${Theme.Fonts.Main} selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black`}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onMouseUp={handleBackgroundMouseUp}
            onContextMenu={handleContextMenu}
        >
            {user ? (
                <>
                    <div className="fixed top-6 left-6 z-50">
                        <CommandDock
                            zoom={zoom}
                            credits={credits}
                            onZoomChange={(z) => smoothZoomTo(z)}
                            onOpenSettings={() => handleOpenSettings('account')}
                            onOpenCredits={() => handleOpenSettings('account')}
                            onUpload={handleDockUpload}
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
                                    <ImagePlus className={`w-8 h-8 ${isCanvasZoneActive ? 'text-white' : 'text-zinc-500'}`} strokeWidth={1.5} />
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

                                {rows.length > 0 && (
                                    <div className="mt-16 flex items-center gap-2 opacity-60 hover:opacity-100 transition-all">
                                        <label className="flex items-center gap-3 cursor-pointer group py-2 pr-2">
                                            <Plus className={`w-5 h-5 ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white transition-colors`} />
                                            <span className={`${Typo.Label} ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white`}>{t('image_btn')}</span>
                                            <input type="file" accept="image/*" className="hidden" multiple onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach((f) => processFile(f as File)); }} />
                                        </label>
                                    </div>
                                )}
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

                    {selectedIds.length > 0 && (
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
                        />
                    )}

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
                        onUpload={() => document.getElementById('ctx-upload-input')?.click()}
                        selectedIds={selectedIds}
                        onDownloadSelected={handleDownloadSelected}
                        onDeleteSelected={() => requestDelete(selectedIds)}
                        onGenerateVariations={handleGenerateVariations}
                        t={t}
                    />
                </>
            ) : (
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
            )}

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                initialTab={settingsTab}
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
                onOpenAdmin={() => { setIsSettingsOpen(false); setIsAdminOpen(true); }}
                t={t}
            />

            {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} t={t} />}
        </div>
    );
}
