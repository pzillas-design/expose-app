import { useState, useEffect, useCallback } from 'react';
import { GenerationQuality, TranslationFunction, TranslationKey } from '../types';
import { translations, LocaleKey } from '../data/locales';

export const useConfig = () => {
    // Quality Settings
    const [qualityMode, setQualityMode] = useState<GenerationQuality>(() => {
        return (localStorage.getItem('nano_quality') as GenerationQuality) || 'pro-2k';
    });

    // Theme Logic
    const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
        return (localStorage.getItem('theme_mode') as 'light' | 'dark' | 'auto') || 'auto';
    });

    // Language Logic
    const [lang, setLang] = useState<LocaleKey | 'auto'>(() => {
        return (localStorage.getItem('app_lang') as LocaleKey | 'auto') || 'auto';
    });

    // Persist Quality
    useEffect(() => {
        localStorage.setItem('nano_quality', qualityMode);
    }, [qualityMode]);

    // Persist & Apply Theme
    useEffect(() => {
        localStorage.setItem('theme_mode', themeMode);
        const root = document.documentElement;
        const isDark = themeMode === 'dark' || (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) root.classList.add('dark');
        else root.classList.remove('dark');
    }, [themeMode]);

    // Persist Language
    useEffect(() => {
        localStorage.setItem('app_lang', lang);
    }, [lang]);

    // Resolve Auto Language
    const getResolvedLang = useCallback((): LocaleKey => {
        if (lang === 'auto') {
            const browserLang = navigator.language.split('-')[0];
            return (browserLang === 'de') ? 'de' : 'en';
        }
        return lang;
    }, [lang]);

    const currentLang = getResolvedLang();

    // Translation Function
    const t = useCallback(((key: TranslationKey): string => {
        return translations[currentLang][key] || key;
    }) as TranslationFunction, [currentLang]);

    return {
        qualityMode,
        setQualityMode,
        themeMode,
        setThemeMode,
        lang,
        setLang,
        currentLang,
        t,
        getResolvedLang
    };
};
