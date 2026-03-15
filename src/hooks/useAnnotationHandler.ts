import { useCallback } from 'react';
import { generateId } from '../utils/ids';
import { CanvasImage, AnnotationObject, TranslationFunction } from '../types';

interface UseAnnotationHandlerProps {
    selectedImage: CanvasImage | null;
    handleUpdateAnnotations: (id: string, newAnnotations: AnnotationObject[]) => void;
    showToast: (msg: string, type: "success" | "error") => void;
    t: TranslationFunction;
    user: any;
}

export const useAnnotationHandler = ({
    selectedImage,
    handleUpdateAnnotations,
    showToast,
    t,
    user
}: UseAnnotationHandlerProps) => {

    const onAddReference = useCallback(async (file: File, annotationId?: string) => {
        if (!selectedImage || !user) return;

        // 1. Client-side preview for immediate feedback
        const reader = new FileReader();
        const src = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
        });

        // 2. Persistent upload to storage
        const import_storageService = await import('../services/storageService');
        const storageIdentifier = user.email || user.id;
        const uploadResult = await import_storageService.storageService.uploadImage(
            src,
            storageIdentifier,
            `reference_${Date.now()}.png`,
            'user-settings/references'
        );

        if (!uploadResult) {
            showToast(t('upload_failed'), "error");
            return;
        }

        // Store BOTH path (for DB) and src (for immediate UI display)
        // Note: The parent update logic usually stringifies annotations for DB.
        // We will store the path in 'referenceImage' and use a flag or check later.
        if (annotationId) {
            const newAnns = (selectedImage.annotations || []).map(ann =>
                ann.id === annotationId ? { ...ann, referenceImage: uploadResult.path, _tempSrc: src } : ann
            );
            handleUpdateAnnotations(selectedImage.id, newAnns);
            showToast(t('image_ref') + " " + t('added'), "success");
        } else {
            const import_ids = await import('../utils/ids');
            const newId = import_ids.generateId();
            const newRef: AnnotationObject = {
                id: newId,
                type: 'reference_image',
                points: [],
                strokeWidth: 0,
                color: '#fff',
                referenceImage: uploadResult.path,
                _tempSrc: src,
                createdAt: Date.now()
            };
            const newAnns = [...(selectedImage.annotations || []), newRef];
            handleUpdateAnnotations(selectedImage.id, newAnns);
        }
    }, [selectedImage, handleUpdateAnnotations, showToast, t, user]);

    return {
        onAddReference
    };
};
