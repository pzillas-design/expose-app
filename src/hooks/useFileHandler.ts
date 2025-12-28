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
    snapToItem: (id: string) => void;
    showToast: (msg: string, type: "success" | "error") => void;
    currentBoardId: string | null;
    setIsSettingsOpen: (open: boolean) => void;
}

export const useFileHandler = ({
    user,
    isAuthDisabled,
    setRows,
    selectMultiple,
    snapToItem,
    showToast,
    currentBoardId,
    setIsSettingsOpen
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
                    img.onload = () => {
                        const targetHeight = 512;
                        const w = (img.width / img.height) * targetHeight;
                        const h = targetHeight;
                        const baseName = file.name.replace(/\.[^/.]+$/, "");
                        const newId = generateId();

                        generateThumbnail(event.target!.result as string).then(thumbSrc => {
                            const newImage: CanvasImage = {
                                id: newId,
                                src: event.target!.result as string,
                                thumbSrc: thumbSrc,
                                width: w, height: h,
                                realWidth: img.width, realHeight: img.height,
                                title: baseName, baseName: baseName,
                                version: 1, isGenerating: false, originalSrc: event.target!.result as string,
                                userDraftPrompt: '',
                                boardId: currentBoardId || undefined,
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
                                imageService.persistImage(newImage, user.id).then(result => {
                                    if (!result.success) showToast(`Save Failed: ${result.error}`, "error");
                                });
                            }
                        });
                    };
                }
            };
            reader.readAsDataURL(file);
        });
    }, [user, isAuthDisabled, setRows, selectMultiple, snapToItem, showToast, currentBoardId]);

    const processFile = useCallback((file: File) => processFiles([file]), [processFiles]);

    return { processFiles, processFile };
};
