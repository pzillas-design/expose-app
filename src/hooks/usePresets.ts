import { useState, useEffect, useCallback } from 'react';
import { PromptTemplate } from '../types';
import { adminService } from '../services/adminService';

export const usePresets = (userId?: string) => {
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const globalPresets = await adminService.getGlobalPresets(userId);
            setTemplates(globalPresets || []);
        } catch (error) {
            console.error('Failed to fetch global presets:', error);
            setTemplates([]);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const saveTemplate = useCallback(async (templateOrArray: any) => {
        try {
            // ManagePresetsModal passes an array; handle both array and single object
            const templates = Array.isArray(templateOrArray) ? templateOrArray : [templateOrArray];
            let lastSaved: any = null;
            for (const template of templates) {
                lastSaved = await adminService.updateGlobalPreset(template, userId);
            }
            await fetchTemplates();
            return lastSaved;
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
