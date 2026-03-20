import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/DesignSystem';
import { Modal } from '@/components/ui/Modal';
import { TranslationFunction } from '@/types';

interface CropModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string | null;
    onCropComplete: (croppedBase64: string) => void;
    t: TranslationFunction;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null;

export const CropModal: React.FC<CropModalProps> = ({ isOpen, onClose, imageSrc, onCropComplete, t }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [dragMode, setDragMode] = useState<DragMode>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [startCrop, setStartCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        if (isOpen) setCrop({ x: 0, y: 0, width: 100, height: 100 });
    }, [isOpen, imageSrc]);

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
        // Use capture:true so Modal's stopPropagation on mouseup doesn't block us
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

    const handleDone = () => {
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
        onCropComplete(canvas.toDataURL('image/jpeg', 0.85));
        onClose();
    };

    // Handle: inner corner flush with crop line, 3 outer corners very round, inner corner sharp
    // Offset = -w-6 so the inner corner sits exactly on the crop boundary
    const pinHandle = (mode: 'nw' | 'ne' | 'sw' | 'se', cursor: string) => {
        const pos = { nw: '-top-6 -left-6', ne: '-top-6 -right-6', sw: '-bottom-6 -left-6', se: '-bottom-6 -right-6' }[mode];
        // Sharp corner = the inward-facing one (touching the crop corner)
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

    const footer = (
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
            <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={handleDone} icon={<Check className="w-4 h-4" />}>{t('done')}</Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen && !!imageSrc}
            onClose={onClose}
            title={t('crop_title')}
            maxWidth="xl"
            footer={footer}
            className="!shadow-none !max-w-2xl"
        >
            <div
                className="flex-1 overflow-hidden flex items-center justify-center select-none"
                style={{ minHeight: 0 }}
            >
                <div className="relative inline-block m-8" ref={containerRef}>
                    <img
                        ref={imgRef}
                        src={imageSrc || ''}
                        alt="Crop"
                        className="block max-w-full object-contain pointer-events-none"
                        style={{ maxHeight: 'calc(90dvh - 180px)', maxWidth: '100%' }}
                        draggable={false}
                    />

                    {/* Muted overlay outside crop */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        <defs>
                            <mask id="crop-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                <rect x={`${crop.x}%`} y={`${crop.y}%`} width={`${crop.width}%`} height={`${crop.height}%`} fill="black" />
                            </mask>
                        </defs>
                        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#crop-mask)" />
                    </svg>

                    {/* Crop box */}
                    <div
                        className="absolute z-20 cursor-move touch-none"
                        style={{
                            left: `${crop.x}%`, top: `${crop.y}%`,
                            width: `${crop.width}%`, height: `${crop.height}%`,
                            // Distinct 2px white border so the crop edge is clearly visible
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

                        {/* Invisible side hit areas */}
                        <div className="absolute top-4 bottom-4 -left-3 w-6 cursor-w-resize z-30 touch-none" onMouseDown={(e) => startDrag(e, 'w')} onTouchStart={(e) => startDrag(e, 'w')} />
                        <div className="absolute top-4 bottom-4 -right-3 w-6 cursor-e-resize z-30 touch-none" onMouseDown={(e) => startDrag(e, 'e')} onTouchStart={(e) => startDrag(e, 'e')} />
                        <div className="absolute left-4 right-4 -top-3 h-6 cursor-n-resize z-30 touch-none" onMouseDown={(e) => startDrag(e, 'n')} onTouchStart={(e) => startDrag(e, 'n')} />
                        <div className="absolute left-4 right-4 -bottom-3 h-6 cursor-s-resize z-30 touch-none" onMouseDown={(e) => startDrag(e, 's')} onTouchStart={(e) => startDrag(e, 's')} />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
