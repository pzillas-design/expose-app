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
    ensureBoardId: () => Promise<string>; // NEW: Function to ensure a board exists
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
    ensureBoardId
}: UseFileHandlerProps) => {

    const processFiles = useCallback((files: File[]) => {
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
                        const activeBoardId = await ensureBoardId();

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

                            setRows(prev => [...prev, {
                                id: generateId(),
                                title: baseName,
                                items: [newImage],
                                createdAt: Date.now()
                            }]);

                            newImageIds.push(newId);
                            processedCount++;

                            if (processedCount === files.length) {
                                selectMultiple(newImageIds);
                                snapToItem(newId);
                            }

                            if (user && !isAuthDisabled) {
                                try {
                                    const result = await imageService.persistImage(newImage, user.id);
                                    if (!result.success) {
                                        const errorMsg = result.error === 'Upload Failed' ? t('upload_failed') : (result.error || t('save_failed'));
                                        showToast(`${t('save_failed')}: ${errorMsg}`, "error");
                                    }
                                } catch (err: any) {
                                    showToast(`${t('save_failed')}: ${err.message}`, "error");
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
