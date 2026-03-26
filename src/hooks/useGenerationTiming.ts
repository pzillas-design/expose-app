import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { GenerationQuality } from '../types';

interface GenerationAverage {
    quality: string;
    avg_duration_ms: number;
}

// Fallback values if DB is empty or offline
const FALLBACK_DURATIONS: Record<string, number> = {
    'nb2-1k': 4000,
    'nb2-2k': 7000,
    'nb2-4k': 12000
};

export const useGenerationTiming = () => {
    const [averages, setAverages] = useState<Record<string, number>>(FALLBACK_DURATIONS);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAverages = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_average_durations');
            if (error) throw error;

            if (data && Array.isArray(data)) {
                const newAverages: Record<string, number> = { ...FALLBACK_DURATIONS };
                data.forEach((item: GenerationAverage) => {
                    newAverages[item.quality] = item.avg_duration_ms;
                });
                setAverages(newAverages);
            }
        } catch (error) {
            console.error('Failed to fetch generation averages:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAverages();
    }, [fetchAverages]);

    const getDurationForQuality = (quality: GenerationQuality) => {
        return averages[quality] || FALLBACK_DURATIONS[quality] || 5000;
    };

    return {
        getDurationForQuality,
        isLoading,
        refresh: fetchAverages
    };
};
