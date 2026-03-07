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
            const savedTemplate = await adminService.updateGlobalPreset(template, userId);
            await fetchTemplates();
            return savedTemplate;
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

    useEffect(() => {
        fetchTemplates();
    }, [userId, fetchTemplates]);

    return {
        templates,
        isLoading,
        refreshTemplates: fetchTemplates,
        saveTemplate,
        deleteTemplate,
        recordPresetUsage
    };
};
