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
    showToast: (msg: string, type: "success" | "error") => void;
    setIsSettingsOpen: (open: boolean) => void;
    t: (key: any) => string;
}

export const useFileHandler = ({
    user,
    isAuthDisabled,
    setRows,
    selectMultiple,
    showToast,
    setIsSettingsOpen,
    t
}: UseFileHandlerProps) => {

    const processFiles = useCallback(async (files: File[]) => {
        const newImageIds: string[] = [];
        let processedCount = 0;

        for (const file of files) {
            const skeletonId = generateId();
            const extension = file.name.split('.').pop()?.toLowerCase();
            const isHeic = ['heic', 'heif'].includes(extension || '');
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
                updatedAt: Date.now()
            };

            setRows(prev => [...prev, {
                id: generateId(),
                title: baseName,
                items: [skeleton],
                createdAt: Date.now()
            }]);

            newImageIds.push(skeletonId);

            // 2. PROCESS FILE (WITH HEIC CONVERSION IF NEEDED)
            const getFileData = async (): Promise<{ src: string, file: File | Blob }> => {
                if (isHeic) {
                    try {
                        const heic2any = (await import('heic2any')).default;
                        const convertedBlob = await heic2any({
                            blob: file,
                            toType: "image/jpeg",
                            quality: 0.8
                        });
                        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                        return { src: URL.createObjectURL(blob), file: blob };
                    } catch (err) {
                        console.error("HEIC conversion failed:", err);
                        // Fallback to original file
                    }
                }
                return { src: URL.createObjectURL(file), file };
            };

            getFileData().then(({ src, file: processedFile }) => {
                const img = new Image();
                img.onload = async () => {
                    const targetHeight = 512;
                    const w = (img.width / img.height) * targetHeight;
                    const h = targetHeight;

                    try {
                        const thumbBlob = await generateThumbnail(src, 200);
                        const thumbSrc = URL.createObjectURL(thumbBlob);

                        // 3. UPDATE SKELETON WITH REAL DATA
                        setRows(prev => prev.map(row => ({
                            ...row,
                            items: row.items.map(item => item.id === skeletonId ? {
                                ...item,
                                src: src,
                                thumbSrc: thumbSrc,
                                width: w,
                                height: h,
                                realWidth: img.width,
                                realHeight: img.height,
                                isGenerating: false,
                                originalSrc: src
                            } : item)
                        })));

                        processedCount++;
                        if (processedCount === files.length) {
                            selectMultiple(newImageIds);
                        }

                        // IMMEDIATE PERSISTENCE (Background)
                        if (user && !isAuthDisabled) {
                            const finalImage: CanvasImage = {
                                id: skeletonId,
                                src: src,
                                thumbSrc: thumbSrc,
                                width: w,
                                height: h,
                                realWidth: img.width,
                                realHeight: img.height,
                                title: baseName,
                                baseName: baseName,
                                version: 1,
                                isGenerating: false,
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                                storage_path: '',
                            };

                            imageService.persistImage(finalImage, user.id, user.email).then(res => {
                                if (res.success && res.storage_path) {
                                    setRows(prev => prev.map(row => ({
                                        ...row,
                                        items: row.items.map(item => item.id === skeletonId ? {
                                            ...item,
                                            storage_path: res.storage_path,
                                            thumb_storage_path: res.thumb_storage_path
                                        } : item)
                                    })));
                                }
                            });
                        }
                    } catch (thumbErr) {
                        console.error("Thumbnail/Persistence failed:", thumbErr);
                        // Still turn off generating if possible
                        setRows(prev => prev.map(row => ({
                            ...row,
                            items: row.items.map(item => item.id === skeletonId ? { ...item, isGenerating: false } : item)
                        })));
                    }
                };
                img.onerror = () => {
                    console.error("Image load failed");
                    setRows(prev => prev.map(row => ({
                        ...row,
                        items: row.items.filter(item => item.id !== skeletonId)
                    })).filter(r => r.items.length > 0));
                };
                img.src = src;
            }).catch(err => {
                console.error("File processing failed:", err);
                // Cleanup skeleton on extreme failure
                setRows(prev => prev.map(row => ({
                    ...row,
                    items: row.items.filter(item => item.id !== skeletonId)
                })).filter(r => r.items.length > 0));
            });
        }
    }, [user, isAuthDisabled, setRows, selectMultiple, showToast, t]);

    const processFile = useCallback((file: File) => {
        processFiles([file]);
    }, [processFiles]);

    const handleFileDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter((f: File) => {
            const isImage = f.type.startsWith('image/');
            const isHeic = /\.(heic|heif)$/i.test(f.name);
            return isImage || isHeic;
        });
        if (files.length === 0) return;
        processFiles(files);
    }, [processFiles]);

    return {
        processFiles,
        processFile,
        handleFileDrop
    };
};
