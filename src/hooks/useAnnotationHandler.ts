import { useCallback } from 'react';
import { generateId } from '../utils/ids';
import { CanvasImage, AnnotationObject, TranslationFunction } from '../types';

interface UseAnnotationHandlerProps {
    selectedImage: CanvasImage | null;
    handleUpdateAnnotations: (id: string, newAnnotations: AnnotationObject[]) => void;
    showToast: (msg: string, type: "success" | "error") => void;
    t: TranslationFunction;
}

export const useAnnotationHandler = ({
    selectedImage,
    handleUpdateAnnotations,
    showToast,
    t
}: UseAnnotationHandlerProps) => {

    const onAddReference = useCallback((file: File, annotationId?: string) => {
        if (!selectedImage) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
                const src = event.target.result;
                if (annotationId) {
                    const newAnns = (selectedImage.annotations || []).map(ann =>
                        ann.id === annotationId ? { ...ann, referenceImage: src } : ann
                    );
                    handleUpdateAnnotations(selectedImage.id, newAnns);
                    showToast(t('image_ref') + " " + t('added'), "success");
                } else {
                    const newId = generateId();
                    const newRef: AnnotationObject = {
                        id: newId,
                        type: 'reference_image',
                        points: [],
                        strokeWidth: 0,
                        color: '#fff',
                        referenceImage: src,
                        createdAt: Date.now()
                    };
                    const newAnns = [...(selectedImage.annotations || []), newRef];
                    handleUpdateAnnotations(selectedImage.id, newAnns);
                }
            }
        };
        reader.readAsDataURL(file);
    }, [selectedImage, handleUpdateAnnotations, showToast, t]);

    return {
        onAddReference
    };
};
