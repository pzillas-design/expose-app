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

        // Note: Auto-save will handle DB persistence in background
    }, [setRows]);

    const handleUpdatePrompt = useCallback((id: string, text: string) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, userDraftPrompt: text, updatedAt: Date.now() } : item)
        })));

        // Note: Auto-save will handle DB persistence in background
    }, [setRows]);

    const handleUpdateVariables = useCallback((id: string, templateId: string | undefined, variableValues: Record<string, string[]>) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, activeTemplateId: templateId, variableValues, updatedAt: Date.now() } : item)
        })));

        // Note: Auto-save will handle DB persistence in background
    }, [setRows]);

    const handleUpdateImageTitle = useCallback((id: string, title: string) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, title, updatedAt: Date.now() } : item)
        })));

        // Note: Auto-save will handle DB persistence in background
    }, [setRows]);

    return {
        handleUpdateAnnotations,
        handleUpdatePrompt,
        handleUpdateVariables,
        handleUpdateImageTitle
    };
};

