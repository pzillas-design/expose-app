import React, { useCallback, useEffect, useRef } from 'react';
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

    /**
     * Verzoegertes Speichern, 800 ms nach der letzten Aenderung.
     *
     * Vorher zwei Sekunden, und nichts, was sie beim Verlassen der Seite
     * abkuerzte: Wer tippte und neu lud, verlor den Rest. Kuerzer, und beim
     * Verlassen wird sofort geschrieben (siehe unten) -- der Entwurf ist
     * nichts, was man zweimal eintippen will.
     */
    const pendingTimers = useRef<Record<string, any>>({});
    const pendingUpdates = useRef<Record<string, Parameters<typeof imageService.updateImage>[1]>>({});

    const writeNow = useCallback((id: string) => {
        const updates = pendingUpdates.current[id];
        if (!updates || isAuthDisabled || !user) return;
        delete pendingUpdates.current[id];
        if (pendingTimers.current[id]) {
            clearTimeout(pendingTimers.current[id]);
            delete pendingTimers.current[id];
        }
        imageService.updateImage(id, updates, user.id).catch(() => {
            // still — AutoSave versucht es erneut
        });
    }, [user, isAuthDisabled]);

    const scheduleSave = useCallback((id: string, updates: Parameters<typeof imageService.updateImage>[1]) => {
        if (isAuthDisabled || !user) return;
        // Zusammenlegen, nicht ersetzen: Prompt und Variablen koennen
        // gleichzeitig offen sein, und der zweite Aufruf darf den ersten nicht
        // verschlucken.
        pendingUpdates.current[id] = { ...(pendingUpdates.current[id] || {}), ...updates };
        if (pendingTimers.current[id]) clearTimeout(pendingTimers.current[id]);
        pendingTimers.current[id] = setTimeout(() => writeNow(id), 800);
    }, [user, isAuthDisabled, writeNow]);

    /**
     * Beim Verlassen oder Verstecken der Seite alles Offene sofort schreiben.
     *
     * 'pagehide' und ein Wechsel auf 'hidden' sind die beiden Ereignisse, die
     * auf dem Handy ueberhaupt noch zuverlaessig kommen -- 'beforeunload'
     * kommt dort gar nicht.
     */
    useEffect(() => {
        const flush = () => Object.keys(pendingUpdates.current).forEach(writeNow);
        const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
        window.addEventListener('pagehide', flush);
        document.addEventListener('visibilitychange', onHide);
        return () => {
            window.removeEventListener('pagehide', flush);
            document.removeEventListener('visibilitychange', onHide);
        };
    }, [writeNow]);

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
        // Die Feldnamen von CanvasImage, nicht die der Spalte: updateImage
        // bildet userDraftPrompt selbst auf user_draft_prompt ab. Mit dem
        // Spaltennamen fand die Abbildung nichts, dbUpdates blieb leer, die
        // Funktion kehrte lautlos zurueck -- und der Entwurf war nach jedem
        // Neuladen weg. Derselbe Fehler wie eine Funktion weiter unten bei den
        // Variablen, dort schon einmal behoben.
        scheduleSave(id, { userDraftPrompt: text });
    }, [setRows, scheduleSave]);

    const handleUpdateVariables = useCallback((id: string, templateId: string | undefined, variableValues: Record<string, string[]>) => {
        setRows(prev => prev.map(row => ({
            ...row,
            items: row.items.map(item => item.id === id ? { ...item, activeTemplateId: templateId, variableValues, updatedAt: Date.now() } : item)
        })));
        // Must use the CanvasImage field names — imageService.updateImage maps
        // activeTemplateId/variableValues into generation_params itself. Passing a
        // pre-built `generation_params` key was silently dropped (no matching
        // mapping → empty dbUpdates → early return), so variable changes never
        // reached the DB and reappeared after a reload.
        scheduleSave(id, { activeTemplateId: templateId, variableValues });
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

