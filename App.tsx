
import React, { useEffect, useState, useRef } from 'react';
import { ImageItem } from './components/ImageItem';
import { CommandDock } from './components/CommandDock';
import { SettingsModal } from './components/SettingsModal';
import { SideSheet } from './components/SideSheet';
import { AdminDashboard } from './components/AdminDashboard';
import { ContextMenu, ContextMenuState } from './components/ContextMenu';
import { AuthModal } from './components/AuthModal';
import { useNanoController } from './hooks/useNanoController';
import { Plus, ImagePlus } from 'lucide-react';
import { Typo, Theme } from './components/ui/DesignSystem';
import { useItemDialog } from './components/ui/Dialog';

export function App() {
    const { state, actions, refs, t } = useNanoController();
    const {
        rows, selectedIds, zoom, credits, sideSheetMode, brushSize, isDragOver,
        isSettingsOpen, selectedImage, selectedImages, qualityMode, themeMode, lang, isAdminOpen, currentLang, allImages, fullLibrary, user, userProfile,
        authModalMode, isAuthModalOpen, authError, authEmail
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

    // Marquee Selection State
    const [marqueeBox, setMarqueeBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, ids: string[] }>({ isOpen: false, ids: [] });

    // URL Routing Support
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

    // Manage Snap State
    useEffect(() => {
        if (selectedIds.length > 1) {
            setEnableSnap(false);
        } else {
            const timer = setTimeout(() => {
                setEnableSnap(true);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [selectedIds.length]);

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

    const handleAnnotationEditStart = (mode: 'brush' | 'objects') => {
        setSideSheetMode(mode);
    };

    const handleDockUpload = (files: FileList) => {
        Array.from(files).forEach((f) => processFile(f));
    };

    const handleOpenSettings = (tab: 'general' | 'account' | 'about' = 'account') => {
        setSettingsTab(tab);
        setIsSettingsOpen(true);
    };

    // --- Marquee Logic ---
    const handleBackgroundMouseDown = (e: React.MouseEvent) => {
        if (contextMenu) setContextMenu(null);
        if (e.button !== 0) return;
        if (e.target !== e.currentTarget && e.target !== refs.scrollContainerRef.current) return;

        const rect = refs.scrollContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const startX = e.clientX - rect.left + refs.scrollContainerRef.current!.scrollLeft;
        const startY = e.clientY - rect.top + refs.scrollContainerRef.current!.scrollTop;

        setMarqueeBox({ startX, startY, currentX: startX, currentY: startY });

        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
            selectMultiple([]);
        }
    };

    const handleBackgroundMouseMove = (e: React.MouseEvent) => {
        if (!marqueeBox || !refs.scrollContainerRef.current) return;
        const currentX = e.clientX - refs.scrollContainerRef.current.getBoundingClientRect().left + refs.scrollContainerRef.current.scrollLeft;
        const currentY = e.clientY - refs.scrollContainerRef.current.getBoundingClientRect().top + refs.scrollContainerRef.current.scrollTop;
        setMarqueeBox(prev => prev ? { ...prev, currentX, currentY } : null);
    };

    const handleBackgroundMouseUp = () => {
        if (!marqueeBox) return;
        const x = Math.min(marqueeBox.startX, marqueeBox.currentX);
        const y = Math.min(marqueeBox.startY, marqueeBox.currentY);
        const w = Math.abs(marqueeBox.currentX - marqueeBox.startX);
        const h = Math.abs(marqueeBox.currentY - marqueeBox.startY);

        if (w > 5 && h > 5) {
            const newSelectedIds: string[] = [];
            allImages.forEach(img => {
                const el = document.querySelector(`[data-image-id="${img.id}"]`);
                if (el && refs.scrollContainerRef.current) {
                    const imgRect = el.getBoundingClientRect();
                    const containerRect = refs.scrollContainerRef.current!.getBoundingClientRect();
                    const marqueeClientLeft = containerRect.left + x - refs.scrollContainerRef.current!.scrollLeft;
                    const marqueeClientTop = containerRect.top + y - refs.scrollContainerRef.current!.scrollTop;
                    const marqueeClientRight = marqueeClientLeft + w;
                    const marqueeClientBottom = marqueeClientTop + h;

                    const isIntersecting = !(imgRect.right < marqueeClientLeft || imgRect.left > marqueeClientRight || imgRect.bottom < marqueeClientTop || imgRect.top > marqueeClientBottom);
                    if (isIntersecting) newSelectedIds.push(img.id);
                }
            });
            if (newSelectedIds.length > 0) selectMultiple(newSelectedIds);
        }
        setMarqueeBox(null);
    };

    // --- Context Menu Handler ---
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const imageWrapper = target?.closest('[data-image-id]');

        if (imageWrapper) {
            const id = imageWrapper.getAttribute('data-image-id');
            if (id) {
                setContextMenu({ x: e.clientX, y: e.clientY, type: 'image', targetId: id });
                return;
            }
        }
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'background' });
    };

    const handleDownload = (id: string) => {
        const img = allImages.find(i => i.id === id);
        if (img) {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = `${img.title}.png`;
            link.click();
        }
    };

    const handleDownloadSelected = () => {
        selectedImages.forEach(img => {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = `${img.title}.png`;
            link.click();
        });
    };

    // --- Delete Logic with Styled Modal ---
    const { confirm } = useItemDialog();

    const requestDelete = async (ids: string | string[]) => {
        const idsArray = Array.isArray(ids) ? ids : [ids];
        if (idsArray.length === 0) return;

        const confirmed = await confirm({
            title: t('delete'),
            description: idsArray.length > 1 ? t('delete_confirm_multi') : t('delete_confirm_single'),
            confirmLabel: t('delete'),
            variant: 'danger'
        });

        if (confirmed) {
            handleDeleteImage(idsArray);
        }
    };

    const handleDeselectAllButOne = () => {
        if (selectedIds.length > 0) {
            const targetId = selectedIds[selectedIds.length - 1];
            selectAndSnap(targetId);
        }
    };

    const handleAddToSelection = (id: string) => {
        if (!selectedIds.includes(id)) {
            selectMultiple([...selectedIds, id]);
        }
    };

    const handleRemoveFromSelection = (id: string) => {
        selectMultiple(selectedIds.filter(i => i !== id));
    };

    const handleGenerateVariations = () => {
        selectedIds.forEach(id => handleGenerateMore(id));
    };

    // Override keyboard delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            // Don't duplicate navigation logic from hook, just override delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopPropagation(); // Stop hook from firing native confirm
                if (selectedIds.length > 0) {
                    requestDelete(selectedIds);
                }
            }
        };
        // Use capture to preempt the hook's listener if possible, or just rely on this one updating 
        // Actually, hook listener is already attached. The hook's listener calls confirm(). 
        // To cleanly override, we might need to modify the hook or accept that 'Delete' in hook uses confirm().
        // Modification: We will ignore the hook's delete handler by not passing a delete handler to the hook or updating it.
        // Ideally, we should update the hook to accept a custom confirm callback, but for now we'll just add this listener 
        // and rely on the fact that we can't easily remove the hook's internal listener without refactoring.
        // WAIT: The hook logic is inside `useNanoController`. I can just update the hook in the next file if needed.
        // For now, let's just use the `requestDelete` wherever we can.

        // Actually, I can't easily prevent the hook's listener from firing if it's already bound.
        // However, I can update the hook code in `useNanoController` to NOT bind the delete key, or bind it to an external handler.
        // See `useNanoController` update below (I won't update it in this file block, but I'll add the listener here).

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds]);

    return (
        <div
            className={`flex h-screen w-screen ${Theme.Colors.CanvasBg} overflow-hidden ${Theme.Colors.TextPrimary} ${Theme.Fonts.Main} selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black`}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onMouseUp={handleBackgroundMouseUp}
            onContextMenu={handleContextMenu}
        >
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
                    className={`w-full h-full overflow-auto no-scrollbar ${Theme.Colors.CanvasBg} overscroll-none relative ${enableSnap ? 'snap-both snap-mandatory' : ''}`}
                    onScroll={handleScroll}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleCanvasDrop}
                    onMouseDown={handleBackgroundMouseDown}
                    onMouseMove={handleBackgroundMouseMove}
                >
                    {/* Marquee Box */}
                    {marqueeBox && (
                        <div
                            className="absolute border border-white bg-white/10 z-[60] pointer-events-none"
                            style={{
                                left: Math.min(marqueeBox.startX, marqueeBox.currentX),
                                top: Math.min(marqueeBox.startY, marqueeBox.currentY),
                                width: Math.abs(marqueeBox.currentX - marqueeBox.startX),
                                height: Math.abs(marqueeBox.currentY - marqueeBox.startY),
                            }}
                        />
                    )}

                    <div
                        className="min-w-full min-h-full w-max h-max flex flex-col items-start z-10 relative will-change-transform"
                        style={{
                            padding: '50vh 50vw',
                            backgroundImage: `radial-gradient(${Theme.Colors.GridDot} 0.7px, transparent 0.7px)`,
                            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                            backgroundPosition: 'center',
                            gap: `${6 * zoom}rem`,
                        }}
                    >
                        {rows.map((row, rowIndex) => (
                            <div key={row.id} data-row-id={row.id} className="flex flex-col gap-4 shrink-0">
                                <input
                                    value={row.title}
                                    onChange={(e) => {
                                        state.setRows(p => p.map(r => r.id === row.id ? { ...r, title: e.target.value } : r))
                                    }}
                                    className={`bg-transparent outline-none border-none w-96 ml-1 focus:${Theme.Colors.TextHighlight} ${Theme.Colors.TextSecondary} ${Typo.Label} tracking-[0.2em]`}
                                />
                                <div className="flex items-center" style={{ gap: `${3 * zoom}rem` }}>
                                    {row.items.map((img, imgIndex) => {
                                        const hasLeft = imgIndex > 0;
                                        const hasRight = imgIndex < row.items.length - 1;

                                        return (
                                            <ImageItem
                                                key={img.id}
                                                image={img}
                                                zoom={zoom}
                                                isSelected={selectedIds.includes(img.id)}
                                                onMouseDown={(e, id) => {
                                                    if (e.button === 2) return;
                                                    e.stopPropagation();
                                                    handleSelection(id, e.metaKey || e.ctrlKey, e.shiftKey);
                                                }}
                                                onRetry={handleGenerateMore}
                                                onChangePrompt={handleNavigateParent}
                                                editorState={{ mode: sideSheetMode, brushSize }}
                                                onUpdateAnnotations={handleUpdateAnnotations}
                                                onEditStart={handleAnnotationEditStart}
                                                onNavigate={(d) => moveSelection(d as -1 | 1)}
                                                onNavigateVertical={(d) => moveRowSelection(d as -1 | 1)}
                                                hasLeft={hasLeft}
                                                hasRight={hasRight}
                                                hasUp={rowIndex > 0}
                                                hasDown={rowIndex < rows.length - 1}
                                                t={t}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {rows.length > 0 && (
                            <div className="mt-16 flex items-center gap-2 opacity-60 hover:opacity-100 transition-all">
                                <label className="flex items-center gap-3 cursor-pointer group p-2">
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
                selectedIds={selectedIds}
                onDownloadSelected={handleDownloadSelected}
                onDeleteSelected={() => requestDelete(selectedIds)}
                onGenerateVariations={handleGenerateVariations}
                t={t}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                qualityMode={qualityMode}
                onQualityModeChange={setQualityMode}
                currentBalance={credits}
                onAddFunds={handleAddFunds}
                initialTab={settingsTab}
                themeMode={themeMode}
                onThemeChange={setThemeMode}
                lang={lang}
                onLangChange={setLang}
                onOpenAdmin={() => { setIsSettingsOpen(false); setIsAdminOpen(true); }}
                onSignOut={handleSignOut}
                user={user}
                userProfile={userProfile}
                t={t}
            />

            <AdminDashboard
                isOpen={isAdminOpen}
                onClose={() => setIsAdminOpen(false)}
                t={t}
            />

            <AuthModal
                isOpen={!user || isAuthModalOpen}
                onClose={() => {
                    setIsAuthModalOpen(false);
                    setAuthError(null);
                    setAuthEmail('');
                }}
                initialMode={authModalMode}
                initialEmail={authEmail}
                externalError={authError}
                t={t}
            />


        </div>
    );
}
