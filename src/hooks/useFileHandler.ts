import React, { useCallback } from 'react';
import { generateId } from '@/utils/ids';
import { imageService } from '@/services/imageService';
import { storageService } from '@/services/storageService';
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

// Sequential upload queue (module-level so it survives re-renders): each
// persistImage waits for the previous one. Queued items show a plain spinner,
// the single active item drives a circular progress ring via uploadProgress.
let uploadChain: Promise<void> = Promise.resolve();
const enqueueUpload = (job: () => Promise<void>): void => {
    uploadChain = uploadChain.then(job, job);
};

export const useFileHandler = ({
    user,
    isAuthDisabled,
    setRows,
    selectMultiple,
    showToast,
    setIsSettingsOpen,
    t
}: UseFileHandlerProps) => {

    const processFiles = useCallback((files: File[]): string[] => {
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

            setRows(prev => [{
                id: generateId(),
                title: baseName,
                items: [skeleton],
                createdAt: Date.now()
            }, ...prev]);

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
                        // 3. UPDATE SKELETON WITH REAL DATA
                        setRows(prev => prev.map(row => ({
                            ...row,
                            items: row.items.map(item => item.id === skeletonId ? {
                                ...item,
                                src: src,
                                thumbSrc: src, // Use full src as thumb during local session (no storage yet)
                                width: w,
                                height: h,
                                realWidth: img.width,
                                realHeight: img.height,
                                isGenerating: false,
                                originalSrc: src
                            } : item)
                        })));

                        processedCount++;

                        // IMMEDIATE PERSISTENCE — sequential queue: one upload at a
                        // time, so each image shows real progress instead of all
                        // spinning at once.
                        if (user && !isAuthDisabled) {
                            const finalImage: CanvasImage = {
                                id: skeletonId,
                                src: src,
                                thumbSrc: src,
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

                            const patchItem = (patch: Partial<CanvasImage>) => {
                                setRows(prev => prev.map(row => ({
                                    ...row,
                                    items: row.items.map(item => item.id === skeletonId ? { ...item, ...patch } : item)
                                })));
                            };

                            patchItem({ uploadStatus: 'queued', uploadProgress: 0 });

                            enqueueUpload(async () => {
                                patchItem({ uploadStatus: 'uploading', uploadProgress: 0 });
                                try {
                                    const res = await imageService.persistImage(
                                        finalImage, user.id, user.email,
                                        (pct) => patchItem({ uploadProgress: pct }),
                                    );
                                    if (res.success && res.storage_path) {
                                        // Get a signed URL so the image can be used as a source for edits
                                        // without needing a page reload (blob URLs can't be fetched server-side)
                                        const signedUrl = await storageService.getSignedUrl(res.storage_path);
                                        patchItem({
                                            storage_path: res.storage_path,
                                            uploadStatus: undefined,
                                            uploadProgress: undefined,
                                            ...(signedUrl ? {
                                                src: signedUrl,
                                                originalSrc: signedUrl,
                                                thumbSrc: signedUrl
                                            } : {})
                                        });
                                    } else {
                                        patchItem({ uploadStatus: undefined, uploadProgress: undefined });
                                    }
                                } catch (e) {
                                    console.error('Queued upload failed:', e);
                                    patchItem({ uploadStatus: undefined, uploadProgress: undefined });
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
        return newImageIds;
    }, [user, isAuthDisabled, setRows, showToast, t]);

    const processFile = useCallback((file: File): string => {
        return processFiles([file])[0];
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
