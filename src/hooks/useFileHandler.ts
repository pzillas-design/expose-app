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
    ensureBoardId: () => Promise<string>;
    isUploadingRef: React.MutableRefObject<boolean>; // NEW: Track upload state
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
    t,
    ensureBoardId,
    isUploadingRef
}: UseFileHandlerProps) => {

    const processFiles = useCallback((files: File[]) => {
        isUploadingRef.current = true; // Mark upload as started
        const newImageIds: string[] = [];
        let processedCount = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = async () => {
                        const targetHeight = 512;
                        const w = (img.width / img.height) * targetHeight;
                        const h = targetHeight;
                        const baseName = file.name.replace(/\.[^/.]+$/, "");
                        const newId = generateId();

                        // CRITICAL FIX: Ensure we have a board before uploading
                        console.log('[Upload] Starting upload for:', baseName);
                        const activeBoardId = await ensureBoardId();
                        console.log('[Upload] Board ID ensured:', activeBoardId);

                        generateThumbnail(event.target!.result as string).then(async (thumbSrc) => {
                            const newImage: CanvasImage = {
                                id: newId,
                                src: event.target!.result as string,
                                storage_path: '',
                                thumbSrc: thumbSrc,
                                width: w, height: h,
                                realWidth: img.width, realHeight: img.height,
                                title: baseName, baseName: baseName,
                                version: 1, isGenerating: false, originalSrc: event.target!.result as string,
                                userDraftPrompt: '',
                                boardId: activeBoardId, // Use the ensured board ID
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            };

                            console.log('[Upload] Adding image to canvas:', newId);
                            setRows(prev => [...prev, {
                                id: generateId(),
                                title: baseName,
                                items: [newImage],
                                createdAt: Date.now()
                            }]);

                            newImageIds.push(newId);
                            processedCount++;

                            if (processedCount === files.length) {
                                console.log('[Upload] All files processed, selecting:', newImageIds);
                                selectMultiple(newImageIds);
                                snapToItem(newId);
                            }

                            if (user && !isAuthDisabled) {
                                console.log('[Upload] Starting persistence for:', newId);
                                try {
                                    const result = await imageService.persistImage(newImage, user.id);
                                    if (!result.success) {
                                        const errorMsg = result.error === 'Upload Failed' ? t('upload_failed') : (result.error || t('save_failed'));
                                        console.error('[Upload] Persistence failed:', errorMsg);
                                        showToast(`${t('save_failed')}: ${errorMsg}`, "error");
                                    } else {
                                        console.log('[Upload] Persistence successful for:', newId);
                                    }
                                } catch (err: any) {
                                    console.error('[Upload] Persistence error:', err);
                                    showToast(`${t('save_failed')}: ${err.message}`, "error");
                                } finally {
                                    // Reset upload flag after persistence completes (success or failure)
                                    if (processedCount === files.length) {
                                        isUploadingRef.current = false;
                                        console.log('[Upload] Upload complete, re-enabling canvas reload');
                                    }
                                }
                            } else {
                                // No auth, just reset the flag
                                if (processedCount === files.length) {
                                    isUploadingRef.current = false;
                                }
                            }
                        });
                    };
                }
            };
            reader.readAsDataURL(file);
        });
    }, [user, isAuthDisabled, setRows, selectMultiple, snapToItem, showToast, ensureBoardId]);

    const processFile = useCallback((file: File) => processFiles([file]), [processFiles]);

    return { processFiles, processFile };
};
