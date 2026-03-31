import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/DesignSystem';
import { Modal } from '@/components/ui/Modal';
import { TranslationFunction } from '@/types';

// ─── Crop logic (inlined from CropModal, no separate modal needed) ────────────
type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null;

interface InspirationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (base64: string) => void;
    /** If set, modal opens directly in preview state (viewer mode for existing ref images) */
    initialSrc?: string;
    t: TranslationFunction;
    lang: string;
}

type ModalState = 'empty' | 'preview' | 'cropping';

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            if (typeof e.target?.result === 'string') resolve(e.target.result);
            else reject(new Error('Failed to read file'));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const InspirationModal: React.FC<InspirationModalProps> = ({
    isOpen, onClose, onComplete, initialSrc, t, lang,
}) => {
    const [modalState, setModalState] = useState<ModalState>('empty');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [pasteHint, setPasteHint] = useState(false);

    // Crop state
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [dragMode, setDragMode] = useState<DragMode>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [startCrop, setStartCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset on open/close
    useEffect(() => {
        if (isOpen) {
            if (initialSrc) {
                setImageSrc(initialSrc);
                setModalState('preview');
            } else {
                setImageSrc(null);
                setModalState('empty');
            }
            setCrop({ x: 0, y: 0, width: 100, height: 100 });
        }
    }, [isOpen, initialSrc]);

    const loadImage = useCallback(async (file: File) => {
        try {
            const url = await fileToDataUrl(file);
            setImageSrc(url);
            setModalState('preview');
            setCrop({ x: 0, y: 0, width: 100, height: 100 });
        } catch { /* ignore */ }
    }, []);

    // ── Paste handler — catches Cmd+V while modal is open ──
    useEffect(() => {
        if (!isOpen || modalState !== 'empty') return;
        const handler = (e: ClipboardEvent) => {
            const items = Array.from(e.clipboardData?.items || []);
            const imageItem = items.find(i => i.type.startsWith('image/'));
            if (!imageItem) return;
            e.preventDefault();
            const file = imageItem.getAsFile();
            if (file) loadImage(file);
        };
        document.addEventListener('paste', handler);
        return () => document.removeEventListener('paste', handler);
    }, [isOpen, modalState, loadImage]);

    // ── Crop drag handling ──
    const getPos = (e: MouseEvent | TouchEvent) => {
        if ('touches' in e) {
            const touch = e.touches[0] || e.changedTouches[0];
            return { x: touch.clientX, y: touch.clientY };
        }
        return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    };

    const startDrag = (e: React.MouseEvent | React.TouchEvent, mode: DragMode) => {
        e.preventDefault();
        e.stopPropagation();
        setDragMode(mode);
        const pos = 'touches' in e
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
        setDragStart(pos);
        setStartCrop({ ...crop });
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!dragMode || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const pos = getPos(e);
            const dx = ((pos.x - dragStart.x) / rect.width) * 100;
            const dy = ((pos.y - dragStart.y) / rect.height) * 100;
            const MIN = 5;
            let c = { ...startCrop };
            if (dragMode === 'move') {
                c.x = Math.min(Math.max(startCrop.x + dx, 0), 100 - startCrop.width);
                c.y = Math.min(Math.max(startCrop.y + dy, 0), 100 - startCrop.height);
            } else {
                if (dragMode.includes('n')) { const ny = Math.min(Math.max(startCrop.y + dy, 0), startCrop.y + startCrop.height - MIN); c.y = ny; c.height = startCrop.height + (startCrop.y - ny); }
                if (dragMode.includes('s')) c.height = Math.min(Math.max(startCrop.height + dy, MIN), 100 - startCrop.y);
                if (dragMode.includes('w')) { const nx = Math.min(Math.max(startCrop.x + dx, 0), startCrop.x + startCrop.width - MIN); c.x = nx; c.width = startCrop.width + (startCrop.x - nx); }
                if (dragMode.includes('e')) c.width = Math.min(Math.max(startCrop.width + dx, MIN), 100 - startCrop.x);
            }
            setCrop(c);
        };
        const handleUp = () => setDragMode(null);
        if (dragMode) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp, { capture: true });
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleUp, { capture: true });
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp, { capture: true });
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp, { capture: true });
        };
    }, [dragMode, dragStart, startCrop]);

    const handleCropDone = () => {
        const img = imgRef.current;
        if (!img) return;
        const cropX = (crop.x / 100) * img.naturalWidth;
        const cropY = (crop.y / 100) * img.naturalHeight;
        const cropW = (crop.width / 100) * img.naturalWidth;
        const cropH = (crop.height / 100) * img.naturalHeight;
        const scale = Math.min(1, 1024 / Math.max(cropW, cropH));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(cropW * scale);
        canvas.height = Math.round(cropH * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        onComplete(canvas.toDataURL('image/jpeg', 0.85));
        onClose();
    };

    const handlePreviewDone = () => {
        if (imageSrc) {
            onComplete(imageSrc);
            onClose();
        }
    };

    const pinHandle = (mode: 'nw' | 'ne' | 'sw' | 'se', cursor: string) => {
        const pos = { nw: '-top-6 -left-6', ne: '-top-6 -right-6', sw: '-bottom-6 -left-6', se: '-bottom-6 -right-6' }[mode];
        const radius = {
            nw: 'rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-none',
            ne: 'rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl-none',
            sw: 'rounded-tl-xl rounded-bl-xl rounded-br-xl rounded-tr-none',
            se: 'rounded-tr-xl rounded-bl-xl rounded-br-xl rounded-tl-none',
        }[mode];
        return (
            <div
                className={`absolute ${pos} w-6 h-6 bg-zinc-900 dark:bg-white border border-zinc-600 dark:border-zinc-300 ${radius} ${cursor} z-30 touch-none`}
                onMouseDown={(e) => startDrag(e, mode)}
                onTouchStart={(e) => startDrag(e, mode)}
            />
        );
    };

    const de = lang === 'de';
    const title = modalState === 'cropping'
        ? t('crop_title')
        : (de ? 'Inspiration hinzufügen' : 'Add Inspiration');

    // ── Empty state ──────────────────────────────────────────────────────────
    const emptyContent = (
        <div className="px-6 pb-6 pt-4 flex flex-col gap-4">
            {/* Upload drop zone */}
            <div
                className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl py-10 px-6 transition-colors cursor-pointer
                    ${isDragOver
                        ? 'bg-zinc-200 dark:bg-zinc-700'
                        : 'bg-zinc-100 dark:bg-zinc-800/70 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                    }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={async (e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = Array.from(e.dataTransfer.files as FileList).find((f: File) => f.type.startsWith('image/'));
                    if (file) loadImage(file);
                }}
            >
                <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {de ? 'Bild hochladen' : 'Upload image'}
                </p>
            </div>

            {/* Hint */}
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center leading-relaxed -mb-1">
                {de
                    ? 'oder suche nach Ideen, kopiere ein Bild und füge es hier ein'
                    : 'or find inspiration, copy an image and paste it here'
                }
            </p>

            {/* Action buttons — stacked on mobile, side-by-side on desktop */}
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    onClick={() => {
                        const w = 900, h = 700;
                        const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
                        const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
                        window.open('https://www.pinterest.com', 'pinterest', `noopener,width=${w},height=${h},left=${left},top=${top}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90 active:opacity-80"
                    style={{ backgroundColor: '#E60023' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                    </svg>
                    {de ? 'Auf Pinterest suchen' : 'Search on Pinterest'}
                </button>

                <Button
                    variant="secondary"
                    className="flex-1 justify-center"
                    onClick={async () => {
                        try {
                            const items = await (navigator.clipboard as any).read();
                            for (const item of items) {
                                const imageType = item.types.find((t: string) => t.startsWith('image/'));
                                if (imageType) {
                                    const blob = await item.getType(imageType);
                                    await loadImage(new File([blob], 'paste', { type: imageType }));
                                    return;
                                }
                            }
                        } catch { /* permission denied or no image — silent */ }
                    }}
                >
                    {de ? 'Einfügen' : 'Paste'}
                </Button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await loadImage(file);
                    e.target.value = '';
                }}
            />
        </div>
    );

    // ── Preview state ─────────────────────────────────────────────────────────
    const previewFooter = (
        <div className="flex items-center justify-between px-6 pb-6 pt-2">
            <Button
                variant="secondary"
                onClick={() => { setCrop({ x: 0, y: 0, width: 100, height: 100 }); setModalState('cropping'); }}
            >
                {t('crop_title')}
            </Button>
            <Button onClick={handlePreviewDone} icon={<Check className="w-4 h-4" />}>
                {t('done')}
            </Button>
        </div>
    );

    const previewContent = (
        <>
            <div className="px-6 pb-2 pt-4 flex items-center justify-center overflow-hidden">
                {imageSrc && (
                    <img
                        src={imageSrc}
                        alt="Preview"
                        className="block rounded-xl object-contain max-w-full"
                        style={{ maxHeight: 'calc(90dvh - 200px)' }}
                        draggable={false}
                    />
                )}
            </div>
            {previewFooter}
        </>
    );

    // ── Crop state ────────────────────────────────────────────────────────────
    const cropFooter = (
        <div className="flex items-center justify-between px-6 pb-6 pt-2">
            <Button
                variant="secondary"
                onClick={() => setModalState('preview')}
                icon={<ArrowLeft className="w-4 h-4" />}
            >
                {de ? 'Zurück' : 'Back'}
            </Button>
            <Button onClick={handleCropDone} icon={<Check className="w-4 h-4" />}>
                {t('done')}
            </Button>
        </div>
    );

    const cropContent = (
        <>
            <div
                className="flex-1 overflow-hidden flex items-center justify-center select-none px-8 pt-4"
                style={{ minHeight: 0 }}
            >
                <div className="relative inline-block" ref={containerRef}>
                    <img
                        ref={imgRef}
                        src={imageSrc || ''}
                        alt="Crop"
                        className="block max-w-full object-contain pointer-events-none"
                        style={{ maxHeight: 'calc(90dvh - 220px)', maxWidth: '100%' }}
                        draggable={false}
                    />
                    {/* Overlay outside crop */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        <defs>
                            <mask id="inspiration-crop-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                <rect x={`${crop.x}%`} y={`${crop.y}%`} width={`${crop.width}%`} height={`${crop.height}%`} fill="black" />
                            </mask>
                        </defs>
                        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#inspiration-crop-mask)" />
                    </svg>
                    {/* Crop box */}
                    <div
                        className="absolute z-20 cursor-move touch-none"
                        style={{
                            left: `${crop.x}%`, top: `${crop.y}%`,
                            width: `${crop.width}%`, height: `${crop.height}%`,
                            boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 3px rgba(0,0,0,0.3)',
                        }}
                        onMouseDown={(e) => startDrag(e, 'move')}
                        onTouchStart={(e) => startDrag(e, 'move')}
                    >
                        {/* Rule of thirds */}
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                            <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white" />
                            <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                            <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white" />
                        </div>
                        {pinHandle('nw', 'cursor-nw-resize')}
                        {pinHandle('ne', 'cursor-ne-resize')}
                        {pinHandle('sw', 'cursor-sw-resize')}
                        {pinHandle('se', 'cursor-se-resize')}
                        <div className="absolute top-4 bottom-4 -left-3 w-6 cursor-w-resize z-30 touch-none" onMouseDown={(e) => startDrag(e, 'w')} onTouchStart={(e) => startDrag(e, 'w')} />
                        <div className="absolute top-4 bottom-4 -right-3 w-6 cursor-e-resize z-30 touch-none" onMouseDown={(e) => startDrag(e, 'e')} onTouchStart={(e) => startDrag(e, 'e')} />
                        <div className="absolute left-4 right-4 -top-3 h-6 cursor-n-resize z-30 touch-none" onMouseDown={(e) => startDrag(e, 'n')} onTouchStart={(e) => startDrag(e, 'n')} />
                        <div className="absolute left-4 right-4 -bottom-3 h-6 cursor-s-resize z-30 touch-none" onMouseDown={(e) => startDrag(e, 's')} onTouchStart={(e) => startDrag(e, 's')} />
                    </div>
                </div>
            </div>
            {cropFooter}
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth="xl"
            className="!shadow-none !max-w-lg"
        >
            {modalState === 'empty' && emptyContent}
            {modalState === 'preview' && previewContent}
            {modalState === 'cropping' && cropContent}
        </Modal>
    );
};
