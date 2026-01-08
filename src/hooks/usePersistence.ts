import React, { useCallback, useRef } from 'react';
import { imageService } from '../services/imageService';
import { CanvasImage, ImageRow, AnnotationObject } from '../types';

interface UsePersistenceProps {
    user: any;
    isAuthDisabled: boolean;
    setRows: React.Dispatch<React.SetStateAction<ImageRow[]>>;
}

export const usePersistence = ({ user, isAuthDisabled, setRows }: UsePersistenceProps) => {
    const promptSaveTimeoutRef = useRef<any>(null);

    const handleUpdateAnnotations = useCallback((id: string, newAnnotations: AnnotationObject[]) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, annotations: newAnnotations, updatedAt: Date.now() } : item)
        })));

        if (user && !isAuthDisabled) {
            imageService.updateImage(id, { annotations: newAnnotations }, user.id)
                .catch(err => console.error("Failed to save annotations", err));
        }
    }, [user, isAuthDisabled, setRows]);

    const handleUpdatePrompt = useCallback((id: string, text: string) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, userDraftPrompt: text, updatedAt: Date.now() } : item)
        })));

        if (promptSaveTimeoutRef.current) clearTimeout(promptSaveTimeoutRef.current);
        promptSaveTimeoutRef.current = setTimeout(() => {
            if (user && !isAuthDisabled) {
                imageService.updateImage(id, { userDraftPrompt: text }, user.id)
                    .catch(err => console.error("Failed to save prompt", err));
            }
        }, 1000);
    }, [user, isAuthDisabled, setRows]);

    const handleUpdateVariables = useCallback((id: string, templateId: string | undefined, variableValues: Record<string, string[]>) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, activeTemplateId: templateId, variableValues, updatedAt: Date.now() } : item)
        })));

        if (user && !isAuthDisabled) {
            imageService.updateImage(id, { activeTemplateId: templateId, variableValues }, user.id)
                .catch(err => console.error("Failed to save variables", err));
        }
    }, [user, isAuthDisabled, setRows]);

    const handleUpdateImageTitle = useCallback((id: string, title: string) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, title, updatedAt: Date.now() } : item)
        })));

        if (user && !isAuthDisabled) {
            imageService.updateImage(id, { title }, user.id)
                .catch(err => console.error("Failed to save title", err));
        }
    }, [user, isAuthDisabled, setRows]);

    return {
        handleUpdateAnnotations,
        handleUpdatePrompt,
        handleUpdateVariables,
        handleUpdateImageTitle
    };
};
