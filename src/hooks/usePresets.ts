import { useState, useEffect, useCallback } from 'react';
import { PromptTemplate } from '../types';
import { adminService } from '../services/adminService';
import { DEFAULT_TEMPLATES } from '../data/promptTemplates';

export const usePresets = (userId?: string) => {
    const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const globalPresets = await adminService.getGlobalPresets(userId);

            if (globalPresets && globalPresets.length > 0) {
                setTemplates(globalPresets);
            } else {
                setTemplates(DEFAULT_TEMPLATES);
            }
        } catch (error) {
            console.error('Failed to fetch global presets:', error);
            setTemplates(DEFAULT_TEMPLATES);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const saveTemplate = useCallback(async (template: any) => {
        try {
            await adminService.updateGlobalPreset(template, userId);
            await fetchTemplates();
        } catch (error) {
            console.error('Failed to save template:', error);
            throw error;
        }
    }, [userId, fetchTemplates]);

    const deleteTemplate = useCallback(async (id: string) => {
        try {
            const template = templates.find(t => t.id === id);
            if (!template) return;

            const isSystem = !template.user_id;

            if (isSystem && userId) {
                // Hide system preset for this user
                await adminService.hideGlobalPreset(id, userId);
            } else {
                // Delete user-owned preset
                await adminService.deleteGlobalPreset(id);
            }
            await fetchTemplates();
        } catch (error) {
            console.error('Failed to delete template:', error);
            throw error;
        }
    }, [userId, templates, fetchTemplates]);

    const recordPresetUsage = useCallback(async (id: string) => {
        try {
            // Update local state for immediate feedback
            setTemplates(prev => prev.map(t => {
                if (t.id === id) {
                    return {
                        ...t,
                        usageCount: (t.usageCount || 0) + 1,
                        lastUsed: Date.now()
                    };
                }
                return t;
            }));

            // Sync with DB
            await adminService.updatePresetUsage(id);
        } catch (error) {
            console.error('Failed to record preset usage:', error);
        }
    }, []);

    const saveRecentPrompt = useCallback(async (prompt: string) => {
        if (!userId || !prompt.trim()) return;

        // Check if an identical preset already exists for this user
        // We prioritize explicit user presets, then check if we already have a history item
        const existing = templates.find(t =>
            t.user_id === userId &&
            t.prompt.trim() === prompt.trim()
        );

        if (existing) {
            await recordPresetUsage(existing.id);
        } else {
            // Create a new auto-generated history preset
            // We use a specific title format or just the beginning of the prompt
            const title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;

            const newPreset = {
                id: crypto.randomUUID(),
                title: title,
                label: title,
                prompt: prompt,
                tags: ['history'],
                category: 'recent',  // ← Set category for recent prompts
                isPinned: false,
                isCustom: true,
                usageCount: 1,
                lang: 'en', // Default, maybe detect?
                lastUsed: Date.now(),
                user_id: userId
            };

            // Optimistic update
            setTemplates(prev => [newPreset, ...prev]);

            try {
                await adminService.updateGlobalPreset(newPreset, userId);
            } catch (err) {
                console.error('Failed to save recent prompt history:', err);
                // Revert on failure? For now just log
            }
        }
    }, [userId, templates, recordPresetUsage]);

    useEffect(() => {
        fetchTemplates();
    }, [userId, fetchTemplates]);

    return {
        templates,
        isLoading,
        refreshTemplates: fetchTemplates,
        saveTemplate,
        deleteTemplate,
        recordPresetUsage,
        saveRecentPrompt
    };
};
