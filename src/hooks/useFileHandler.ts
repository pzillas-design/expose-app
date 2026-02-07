import React, { useCallback } from 'react';
import { generateId } from '@/utils/ids';
import { generateThumbnail } from '@/utils/imageUtils';
import { imageService } from '@/services/imageService';
import { CanvasImage, ImageRow } from '@/types';

interface UseFileHandlerProps {
    user: any;
    isAuthDisabled: boolean;
    setRows: React.Dispatch<React.SetStateAction<ImageRow[]>>;
    selectMultiple: (ids: string[]) => void;
    snapToItem: (id: string, instant?: boolean) => void;
    showToast: (msg: string, type: "success" | "error") => void;
    currentBoardId: string | null;
    setIsSettingsOpen: (open: boolean) => void;
    t: (key: any) => string;
}

export const useFileHandler = ({
    user,
    isAuthDisabled,
    setRows,
    selectMultiple,
    snapToItem,
    showToast,
    currentBoardId,
    setIsSettingsOpen,
    t
}: UseFileHandlerProps) => {

    const processFiles = useCallback((files: File[]) => {
        const newImageIds: string[] = [];
        let processedCount = 0;

        files.forEach(file => {
            const skeletonId = generateId();
            const baseName = file.name.replace(/\.[^/.]+$/, "") || `Image_${Date.now()}`;

            // 1. ADD SKELETON IMMEDIATELY
            const skeleton: CanvasImage = {
                id: skeletonId,
                src: '', // Empty initially
                storage_path: '',
                width: 512, // Default square placeholder
                height: 512,
                title: baseName,
                baseName: baseName,
                version: 1,
                isGenerating: true, // This triggers the skeleton/shimmer UI
                createdAt: Date.now(),
                updatedAt: Date.now(),
                boardId: currentBoardId || undefined
            };

            setRows(prev => [...prev, {
                id: generateId(),
                title: baseName,
                items: [skeleton],
                createdAt: Date.now()
            }]);

            newImageIds.push(skeletonId);

            // 2. PROCESS FILE IN BACKGROUND
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = async () => {
                        const targetHeight = 512;
                        const w = (img.width / img.height) * targetHeight;
                        const h = targetHeight;

                        generateThumbnail(event.target!.result as string, 200).then(async (thumbBlob) => {
                            const thumbSrc = URL.createObjectURL(thumbBlob);

                            // 3. UPDATE SKELETON WITH REAL DATA
                            setRows(prev => prev.map(row => ({
                                ...row,
                                items: row.items.map(item => item.id === skeletonId ? {
                                    ...item,
                                    src: event.target!.result as string,
                                    thumbSrc: thumbSrc,
                                    width: w,
                                    height: h,
                                    realWidth: img.width,
                                    realHeight: img.height,
                                    isGenerating: false, // Turn off shimmering
                                    originalSrc: event.target!.result as string
                                } : item)
                            })));

                            processedCount++;

                            if (processedCount === files.length) {
                                selectMultiple(newImageIds);
                                // Don't auto-scroll on upload completion - only on new skeleton creation
                            }

                            // Note: Auto-save will handle DB persistence (every 30s)
                        }).catch((err) => {
                            console.error('[Upload] Thumbnail generation failed:', err);
                            showToast(t('upload_failed'), "error");
                        });
                    };
                }
            };
            reader.readAsDataURL(file);
        });
    }, [user, isAuthDisabled, setRows, selectMultiple, showToast, currentBoardId, t]);

    const processFile = useCallback((file: File) => {
        processFiles([file]);
    }, [processFiles]);

    const handleFileDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter((f): f is File => f.type.startsWith('image/'));
        if (files.length === 0) return;
        processFiles(files);
    }, [processFiles]);

    return {
        processFiles,
        processFile,
        handleFileDrop
    };
};
