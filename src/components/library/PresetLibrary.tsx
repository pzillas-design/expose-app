import React, { useState, useMemo } from 'react';
import { Plus, Pen, Trash, Share2 } from 'lucide-react';
import { PromptTemplate, TranslationFunction } from '@/types';
import { Theme, Typo, IconButton, Tooltip } from '@/components/ui/DesignSystem';
import { SidebarAccordion, SidebarAccordionItem } from '@/components/ui/SidebarAccordion';

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
    const [isPresetsExpanded, setIsPresetsExpanded] = useState(true);

    // Filter templates by language
    const languageFilteredTemplates = useMemo(() => {
        return templates.filter(t => !t.lang || t.lang === currentLang);
    }, [templates, currentLang]);

    const mainTemplates = useMemo(() => {
        // Show everything except 'recent' category (history)
        return languageFilteredTemplates.filter(t => t.category !== 'recent');
    }, [languageFilteredTemplates]);

    return (
        <div className={`flex flex-col bg-zinc-50/50 dark:bg-zinc-900/20 relative transition-colors duration-200 w-full`}>
            {/* PRESETS SECTION */}
            <SidebarAccordion
                title={t('presets_header')}
                isExpanded={isPresetsExpanded}
                onToggle={() => setIsPresetsExpanded(!isPresetsExpanded)}
                hasTopBorder={false}
                onAdd={onRequestCreate}
                isEmpty={mainTemplates.length === 0}
                emptyText={currentLang === 'de' ? 'Noch keine Vorlagen vorhanden.' : 'No presets available yet.'}
            >
                {mainTemplates.map(t => (
                    <SidebarAccordionItem
                        key={t.id}
                        label={t.title}
                        onClick={() => onSelect(t)}
                        onMenuClick={(e) => {
                            e.stopPropagation();
                            onRequestEdit(t);
                        }}
                        menuTooltip={currentLang === 'de' ? 'Vorlage bearbeiten' : 'Edit template'}
                    />
                ))}
            </SidebarAccordion>
        </div>
    );
};
