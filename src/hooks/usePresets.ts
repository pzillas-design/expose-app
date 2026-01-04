import { useState, useEffect } from 'react';
import { PromptTemplate } from '../types';
import { adminService } from '../services/adminService';
import { DEFAULT_TEMPLATES } from '../data/promptTemplates';

export const usePresets = () => {
    const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const globalPresets = await adminService.getGlobalPresets();

            // Merge logic: Always start with our 3 mandatory system presets (they have isPinned: true)
            // Then add database presets. If names match, DB version wins.
            const merged = [...DEFAULT_TEMPLATES];

            if (globalPresets && globalPresets.length > 0) {
                globalPresets.forEach(dbPreset => {
                    const existingIdx = merged.findIndex(m => m.title === dbPreset.title && m.lang === dbPreset.lang);
                    if (existingIdx > -1) {
                        // DB entry exists, update it (e.g. if admin changed the prompt in DB)
                        merged[existingIdx] = { ...merged[existingIdx], ...dbPreset };
                    } else {
                        // New preset from DB
                        merged.push(dbPreset);
                    }
                });
            }

            setTemplates(merged);
        } catch (error) {
            console.error('Failed to fetch global presets:', error);
            setTemplates(DEFAULT_TEMPLATES);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    return {
        templates,
        isLoading,
        refreshTemplates: fetchTemplates
    };
};
