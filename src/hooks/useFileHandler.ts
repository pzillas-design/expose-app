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
}

export const useFileHandler = ({
    user,
    isAuthDisabled,
    setRows,
    selectMultiple,
    snapToItem,
    showToast
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
                        let w = img.width, h = img.height;
                        const maxDim = 500;
                        if (w > maxDim || h > maxDim) {
                            const ratio = w / h;
                            if (w > h) { w = maxDim; h = maxDim / ratio; } else { h = maxDim; w = maxDim * ratio; }
                        }
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
    }, [user, isAuthDisabled, setRows, selectMultiple, snapToItem, showToast]);

    const processFile = useCallback((file: File) => processFiles([file]), [processFiles]);

    return { processFiles, processFile };
};
