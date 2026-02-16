import React from 'react';
import { createPortal } from 'react-dom';
import { Download, Trash, CheckSquare, XSquare, Plus, Minus, Copy, RotateCcw, Upload, Info } from 'lucide-react';
import { Theme, Typo } from '@/components/ui/DesignSystem';
import { TranslationFunction, CanvasImage } from '@/types';

export interface ContextMenuState {
    x: number;
    y: number;
    type: 'image' | 'background';
    targetId?: string;
}

interface ContextMenuProps {
    menu: ContextMenuState | null;
    images: CanvasImage[];
    onClose: () => void;
    onDownload: (id: string) => void;
    onDelete: (id: string | string[]) => void;
    onSelect: (id: string) => void;
    onAddToSelection: (id: string) => void;
    onRemoveFromSelection: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onResetView: () => void;
    onUpload: () => void;
    onCreateNew: () => void;
    onShowInfo?: (id: string) => void;

    // Multi Actions
    selectedIds: string[];
    onDownloadSelected: () => void;
    onDeleteSelected: () => void;
    onGenerateVariations: (id?: string) => void;

    t: TranslationFunction;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    menu, images, onClose, onDownload, onDelete, onSelect, onAddToSelection, onRemoveFromSelection, onSelectAll, onDeselectAll, onResetView,
    selectedIds, onDownloadSelected, onDeleteSelected, onGenerateVariations, onUpload, onCreateNew, onShowInfo, t
}) => {
    if (!menu) return null;

    // Determine current state of the clicked target relative to selection
    const isTargetSelected = menu.targetId ? selectedIds.includes(menu.targetId) : false;
    const isMultiSelectionActive = selectedIds.length > 1;

    // Helper to check if image is generated (has parentId)
    const isGenerated = (id: string) => {
        const img = images.find(i => i.id === id);
        return !!img?.parentId;
    };

    // Styles - New cleaner design
    const itemClass = `flex items-center justify-between w-full pl-3 pr-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-left transition-colors group cursor-pointer`;
    const iconClass = `w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0 ml-3`;
    const textClass = `${Typo.Body} text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white font-medium`;

    const dangerClass = `flex items-center justify-between w-full pl-3 pr-3 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors group cursor-pointer`;
    const dangerIconClass = `w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors shrink-0 ml-3`;
    const dangerTextClass = `${Typo.Body} text-red-500 group-hover:text-red-600 dark:text-red-400 font-medium`;

    const Separator = () => <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />;

    const handleCopy = async (id: string) => {
        const img = images.find(i => i.id === id);
        if (!img?.src) return;
        onClose();
        try {
            const response = await fetch(img.src);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    return createPortal(
        <>
            {/* Backdrop to close */}
            <div className="fixed inset-0 z-[100]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />

            <div
                className={`
                    fixed z-[101] min-w-[220px]
                    bg-white dark:bg-zinc-950
                    border border-zinc-200 dark:border-zinc-800
                    rounded-xl shadow-lg ring-1 ring-black/5
                    overflow-hidden animate-in fade-in zoom-in-95 duration-100
                    p-1.5
                `}
                style={{ top: menu.y, left: menu.x }}
            >
                {/* --- 1. BACKGROUND CLICK --- */}
                {menu.type === 'background' && (
                    <>
                        <button onClick={() => { onUpload(); onClose(); }} className={itemClass}>
                            <span className={textClass}>{t('upload_image_edit')}</span>
                        </button>

                        <button onClick={() => { onCreateNew(); onClose(); }} className={itemClass}>
                            <span className={textClass}>{t('generate_new')}</span>
                        </button>

                        <button onClick={() => { onSelectAll(); onClose(); }} className={itemClass}>
                            <span className={textClass}>{t('ctx_select_all')}</span>
                        </button>

                        {selectedIds.length > 0 && (
                            <button onClick={() => { onDeselectAll(); onClose(); }} className={itemClass}>
                                <span className={textClass}>{t('ctx_deselect')}</span>
                            </button>
                        )}
                    </>
                )}

                {/* --- 2. IMAGE CLICK --- */}
                {menu.type === 'image' && menu.targetId && (
                    <>
                        {/* CASE A: Image IS Selected */}
                        {isTargetSelected && (
                            <>
                                {isMultiSelectionActive ? (
                                    // Part of a Multi-Selection
                                    <>
                                        <button onClick={() => { onDownloadSelected(); onClose(); }} className={itemClass}>
                                            <span className={textClass}>{t('ctx_download_multi').replace('{{n}}', selectedIds.length.toString())}</span>
                                            <Download className={iconClass} />
                                        </button>

                                        {/* Show variations only if ALL selected items are generated images */}
                                        {selectedIds.every(isGenerated) && (
                                            <button onClick={() => { onGenerateVariations(); onClose(); }} className={itemClass}>
                                                <span className={textClass}>{t('ctx_create_variations')}</span>
                                                <Plus className={iconClass} />
                                            </button>
                                        )}

                                        <button onClick={() => { onRemoveFromSelection(menu.targetId!); onClose(); }} className={itemClass}>
                                            <span className={textClass}>{t('ctx_remove_from_selection')}</span>
                                            <XSquare className={iconClass} />
                                        </button>

                                        <button onClick={() => { onDeleteSelected(); onClose(); }} className={itemClass}>
                                            <span className={textClass}>{t('ctx_delete_multi').replace('{{n}}', selectedIds.length.toString())}</span>
                                        </button>
                                    </>
                                ) : (
                                    // Single Selected Image
                                    <>
                                        <button onClick={() => { onDownload(menu.targetId!); onClose(); }} className={itemClass}>
                                            <span className={textClass}>{t('ctx_download_image')}</span>
                                            <Download className={iconClass} />
                                        </button>

                                        {isGenerated(menu.targetId!) && (
                                            <button onClick={() => { onGenerateVariations(); onClose(); }} className={itemClass}>
                                                <span className={textClass}>{t('ctx_create_variations')}</span>
                                                <Plus className={iconClass} />
                                            </button>
                                        )}

                                        {onShowInfo && (
                                            <button onClick={() => { onShowInfo(menu.targetId!); onClose(); }} className={itemClass}>
                                                <span className={textClass}>{t('info') || 'Info'}</span>
                                            </button>
                                        )}

                                        <button onClick={() => { onDelete(menu.targetId!); onClose(); }} className={itemClass}>
                                            <span className={textClass}>{t('ctx_delete_image')}</span>
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        {/* CASE B: Image IS NOT Selected */}
                        {!isTargetSelected && (
                            <>
                                <button onClick={() => { onDownload(menu.targetId!); onClose(); }} className={itemClass}>
                                    <span className={textClass}>{t('ctx_download_image')}</span>
                                    <Download className={iconClass} />
                                </button>

                                {isGenerated(menu.targetId) && (
                                    <button onClick={() => { onGenerateVariations(menu.targetId); onClose(); }} className={itemClass}>
                                        <span className={textClass}>{t('ctx_create_variations')}</span>
                                        <Plus className={iconClass} />
                                    </button>
                                )}

                                <button onClick={() => { onAddToSelection(menu.targetId!); onClose(); }} className={itemClass}>
                                    <span className={textClass}>{t('ctx_add_to_selection')}</span>
                                    <CheckSquare className={iconClass} />
                                </button>

                                {onShowInfo && (
                                    <button onClick={() => { onShowInfo(menu.targetId!); onClose(); }} className={itemClass}>
                                        <span className={textClass}>{t('info') || 'Info'}</span>
                                    </button>
                                )}

                                <button onClick={() => { onDelete(menu.targetId!); onClose(); }} className={itemClass}>
                                    <span className={textClass}>{t('ctx_delete_image')}</span>
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </>
        , document.body);
};
