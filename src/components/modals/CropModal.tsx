import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Crop as CropIcon } from 'lucide-react';
import { Button, IconButton, Theme, Typo } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';

interface CropModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string | null;
    onCropComplete: (croppedBase64: string) => void;
    t: TranslationFunction;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null;

export const CropModal: React.FC<CropModalProps> = ({
    isOpen,
    onClose,
    imageSrc,
    onCropComplete,
    t
}) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Crop state in Percentages (0-100)
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [dragMode, setDragMode] = useState<DragMode>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [startCrop, setStartCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });

    // Reset crop when image changes
    useEffect(() => {
        if (isOpen) {
            setCrop({ x: 0, y: 0, width: 100, height: 100 });
        }
    }, [isOpen, imageSrc]);

    // --- Interaction Handlers ---

    const getClientPos = (e: React.MouseEvent | MouseEvent) => {
        return { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: React.MouseEvent, mode: DragMode) => {
        e.preventDefault();
        e.stopPropagation();
        setDragMode(mode);
        const pos = getClientPos(e);
        setDragStart(pos);
        setStartCrop({ ...crop });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragMode || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const clientPos = getClientPos(e);
            const deltaXPx = clientPos.x - dragStart.x;
            const deltaYPx = clientPos.y - dragStart.y;

            // Convert pixel delta to percentage delta
            const deltaX = (deltaXPx / rect.width) * 100;
            const deltaY = (deltaYPx / rect.height) * 100;

            let newCrop = { ...startCrop };

            if (dragMode === 'move') {
                newCrop.x = Math.min(Math.max(startCrop.x + deltaX, 0), 100 - startCrop.width);
                newCrop.y = Math.min(Math.max(startCrop.y + deltaY, 0), 100 - startCrop.height);
            } else {
                // Resize Logic
                // Min size constraint (5%)
                const MIN_SIZE = 5;

                if (dragMode.includes('n')) {
                    const newY = Math.min(Math.max(startCrop.y + deltaY, 0), startCrop.y + startCrop.height - MIN_SIZE);
                    newCrop.y = newY;
                    newCrop.height = startCrop.height + (startCrop.y - newY);
                }
                if (dragMode.includes('s')) {
                    newCrop.height = Math.min(Math.max(startCrop.height + deltaY, MIN_SIZE), 100 - startCrop.y);
                }
                if (dragMode.includes('w')) {
                    const newX = Math.min(Math.max(startCrop.x + deltaX, 0), startCrop.x + startCrop.width - MIN_SIZE);
                    newCrop.x = newX;
                    newCrop.width = startCrop.width + (startCrop.x - newX);
                }
                if (dragMode.includes('e')) {
                    newCrop.width = Math.min(Math.max(startCrop.width + deltaX, MIN_SIZE), 100 - startCrop.x);
                }
            }

            setCrop(newCrop);
        };

        const handleMouseUp = () => {
            setDragMode(null);
        };

        if (dragMode) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragMode, dragStart, startCrop]);

    // --- Output Logic ---

    const handleDone = () => {
        const img = imgRef.current;
        if (!img) return;

        // 1. Calculate resolution map
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // 2. Convert percentages to Natural Pixels
        const cropX = (crop.x / 100) * naturalWidth;
        const cropY = (crop.y / 100) * naturalHeight;
        const cropW = (crop.width / 100) * naturalWidth;
        const cropH = (crop.height / 100) * naturalHeight;

        // 3. Draw to offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(
            img,
            cropX, cropY, cropW, cropH, // Source rect
            0, 0, cropW, cropH          // Dest rect
        );

        // 4. Export
        const result = canvas.toDataURL('image/png', 1.0); // Max quality
        onCropComplete(result);
        onClose();
    };

    if (!isOpen || !imageSrc) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center animate-in fade-in duration-300">
            <div className={`${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} overflow-hidden flex flex-col max-w-[95vw] max-h-[90vh] w-auto h-auto`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${Theme.Colors.Border} shrink-0 ${Theme.Colors.PanelBg} z-20`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${Theme.Colors.CanvasBg} ${Theme.Colors.TextSecondary}`}>
                            <CropIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <span className={`${Typo.H2} block`}>Zuschneiden</span>
                            <span className={Typo.Micro}>Passe den Bildausschnitt an.</span>
                        </div>
                    </div>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} tooltip={t('cancel')} />
                </div>

                {/* Main Crop Area */}
                <div className={`flex-1 overflow-hidden p-4 ${Theme.Colors.CanvasBg} flex items-center justify-center relative min-w-[600px] min-h-[400px]`}>

                    <div className="relative inline-block" ref={containerRef}>
                        {/* The Image */}
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Crop Source"
                            className="block max-w-full max-h-[60vh] object-contain select-none pointer-events-none"
                            style={{ maxWidth: '800px' }}
                        />

                        {/* SVG Mask Overlay (Dims the outside) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                            <defs>
                                <mask id="crop-mask">
                                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                    <rect
                                        x={`${crop.x}%`}
                                        y={`${crop.y}%`}
                                        width={`${crop.width}%`}
                                        height={`${crop.height}%`}
                                        fill="black"
                                    />
                                </mask>
                            </defs>
                            <rect
                                x="0" y="0" width="100%" height="100%"
                                fill="rgba(0,0,0,0.6)"
                                mask="url(#crop-mask)"
                            />
                        </svg>

                        {/* Interactive Crop Box */}
                        <div
                            className="absolute z-20 cursor-move group outline outline-1 outline-white/50"
                            style={{
                                left: `${crop.x}%`,
                                top: `${crop.y}%`,
                                width: `${crop.width}%`,
                                height: `${crop.height}%`,
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 20px 50px rgba(0,0,0,0.5)'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, 'move')}
                        >
                            {/* Grid Lines (Rule of Thirds) */}
                            <div className="absolute inset-0 w-full h-full opacity-40 pointer-events-none">
                                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50" />
                                <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/50" />
                                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50" />
                                <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/50" />
                            </div>

                            {/* Handles - Increased Click Area */}
                            {/* Corners - 24px Size for better grab */}
                            <div
                                className="absolute -top-3 -left-3 w-6 h-6 border-2 border-white bg-black rounded-full cursor-nw-resize hover:scale-110 transition-transform shadow-sm"
                                onMouseDown={(e) => handleMouseDown(e, 'nw')}
                            />
                            <div
                                className="absolute -top-3 -right-3 w-6 h-6 border-2 border-white bg-black rounded-full cursor-ne-resize hover:scale-110 transition-transform shadow-sm"
                                onMouseDown={(e) => handleMouseDown(e, 'ne')}
                            />
                            <div
                                className="absolute -bottom-3 -left-3 w-6 h-6 border-2 border-white bg-black rounded-full cursor-sw-resize hover:scale-110 transition-transform shadow-sm"
                                onMouseDown={(e) => handleMouseDown(e, 'sw')}
                            />
                            <div
                                className="absolute -bottom-3 -right-3 w-6 h-6 border-2 border-white bg-black rounded-full cursor-se-resize hover:scale-110 transition-transform shadow-sm"
                                onMouseDown={(e) => handleMouseDown(e, 'se')}
                            />

                            {/* Sides (Invisible hit areas for easier grabbing) */}
                            <div className="absolute top-3 bottom-3 -left-3 w-6 cursor-w-resize" onMouseDown={(e) => handleMouseDown(e, 'w')} />
                            <div className="absolute top-3 bottom-3 -right-3 w-6 cursor-e-resize" onMouseDown={(e) => handleMouseDown(e, 'e')} />
                            <div className="absolute left-3 right-3 -top-3 h-6 cursor-n-resize" onMouseDown={(e) => handleMouseDown(e, 'n')} />
                            <div className="absolute left-3 right-3 -bottom-3 h-6 cursor-s-resize" onMouseDown={(e) => handleMouseDown(e, 's')} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t ${Theme.Colors.Border} ${Theme.Colors.PanelBg} flex justify-end gap-3 shrink-0`}>
                    <Button variant="secondary" onClick={onClose} className="w-32">{t('cancel')}</Button>
                    <Button onClick={handleDone} className="w-32" icon={<Check className="w-4 h-4" />}>{t('done')}</Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
