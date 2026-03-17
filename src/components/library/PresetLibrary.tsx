import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PromptTemplate, TranslationFunction } from '@/types';
import { Theme, Typo, IconButton } from '@/components/ui/DesignSystem';
import { SidebarAccordion, SidebarAccordionItem } from '@/components/ui/SidebarAccordion';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Check, Edit2 } from 'lucide-react';

interface PresetLibraryProps {
    templates: PromptTemplate[];
    onSelect: (template: PromptTemplate) => void;
    onTogglePin: (id: string) => void;
    onRequestCreate: () => void;
    onRequestEdit: (template: PromptTemplate) => void;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
}

export const PresetLibrary: React.FC<PresetLibraryProps> = ({
    templates,
    onSelect,
    onTogglePin,
    onRequestCreate,
    onRequestEdit,
    t,
    currentLang
}) => {

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showRecent, setShowRecent] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    // Filter templates by language
    const languageFilteredTemplates = useMemo(() => {
        return templates.filter(t => !t.lang || t.lang === currentLang);
    }, [templates, currentLang]);

    const displayTemplates = useMemo(() => {
        if (showRecent) {
            return languageFilteredTemplates.filter(t => t.category === 'recent');
        }
        return languageFilteredTemplates.filter(t => t.category !== 'recent');
    }, [languageFilteredTemplates, showRecent]);

    return (
        <div className={`flex flex-col bg-zinc-50/50 dark:bg-zinc-900/20 relative transition-colors duration-200 w-full`}>
            {/* PRESETS SECTION */}
            <div className="relative" ref={menuRef}>
                <SidebarAccordion
                    title={showRecent ? t('presets_recent') : t('presets_header')}
                    hasTopBorder={false}
                    onAdd={() => setIsMenuOpen(!isMenuOpen)}
                    addTooltip={t('presets_options')}
                    isEmpty={displayTemplates.length === 0}
                    emptyText={t('no_entries_available')}
                >
                    {displayTemplates.map(t => (
                        <SidebarAccordionItem
                            key={t.id}
                            label={t.title}
                            onClick={() => onSelect(t)}
                            onMenuClick={(e) => {
                                e.stopPropagation();
                                onRequestEdit(t);
                            }}
                            menuTooltip={t('presets_edit_tooltip')}
                        />
                    ))}
                </SidebarAccordion>

                {isMenuOpen && (
                    <div className="absolute top-12 right-6 z-[60]">
                        <DropdownMenu
                            items={[
                                {
                                    label: t('presets_header'),
                                    icon: !showRecent ? <Check className="w-4 h-4" /> : <div className="w-4 h-4" />,
                                    onClick: () => { setShowRecent(false); setIsMenuOpen(false); }
                                },
                                {
                                    label: t('presets_recently_used'),
                                    icon: showRecent ? <Check className="w-4 h-4" /> : <div className="w-4 h-4" />,
                                    onClick: () => { setShowRecent(true); setIsMenuOpen(false); }
                                },
                                {
                                    label: t('preset_edit_presets'),
                                    onClick: () => { setIsMenuOpen(false); onRequestCreate(); },
                                    separator: true
                                }
                            ]}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
