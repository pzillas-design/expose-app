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

    useEffect(() => {
        fetchTemplates();
    }, [userId, fetchTemplates]);

    return {
        templates,
        isLoading,
        refreshTemplates: fetchTemplates,
        saveTemplate,
        deleteTemplate
    };
};
