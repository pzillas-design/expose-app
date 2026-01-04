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
