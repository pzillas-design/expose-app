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
    const variablesSaveTimeoutRef = useRef<any>(null);

    // Debounced direct DB save with 2s delay — prevents losing edits on quick reload
    const pendingTimers = useRef<Record<string, any>>({});
    const scheduleSave = useCallback((id: string, updates: Parameters<typeof imageService.updateImage>[1]) => {
        if (isAuthDisabled || !user) return;
        if (pendingTimers.current[id]) clearTimeout(pendingTimers.current[id]);
        pendingTimers.current[id] = setTimeout(async () => {
            try {
                await imageService.updateImage(id, updates, user.id);
            } catch (e) {
                // silent — AutoSave will retry
            } finally {
                delete pendingTimers.current[id];
            }
        }, 2000);
    }, [user, isAuthDisabled]);

    const handleUpdateAnnotations = useCallback((id: string, newAnnotations: AnnotationObject[]) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, annotations: newAnnotations, updatedAt: Date.now() } : item)
        })));
    }, [setRows]);

    const handleUpdatePrompt = useCallback((id: string, text: string) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, userDraftPrompt: text, updatedAt: Date.now() } : item)
        })));
        scheduleSave(id, { user_draft_prompt: text });
    }, [setRows, scheduleSave]);

    const handleUpdateVariables = useCallback((id: string, templateId: string | undefined, variableValues: Record<string, string[]>) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, activeTemplateId: templateId, variableValues, updatedAt: Date.now() } : item)
        })));
        scheduleSave(id, {
            generation_params: JSON.stringify({ activeTemplateId: templateId, variableValues })
        });
    }, [setRows, scheduleSave]);

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

