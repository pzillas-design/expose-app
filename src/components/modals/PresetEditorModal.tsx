
import React, { useState, useEffect, useMemo } from 'react';
import { PromptTemplate, PresetControl, TranslationFunction } from '../../types';
import { ModalHeader, Button, Input, TextArea, SectionHeader, Theme } from './ui/DesignSystem';
import { Plus, Trash2, Check, X, ArrowLeftRight } from 'lucide-react';
import { generateId } from '../../utils/ids';

interface PresetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  scope: 'admin' | 'user'; // New prop to determine layout
  currentLang?: 'de' | 'en'; // Required if scope is user
  initialTemplate?: PromptTemplate | null;
  existingTemplates: PromptTemplate[];
  onSave: (templates: { title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de'|'en' }[]) => void;
  onDelete?: (id: string) => void;
  t: TranslationFunction;
}

const DEFAULT_TAGS = ['Außen', 'Innen', 'Retusche', 'Staging', 'Mood'];

// Sub-component for a single language form
const LanguageForm = ({
    lang,
    title, setTitle,
    prompt, setPrompt,
    controls, setControls,
    tags, setTags,
    availableTags,
    showHeader,
    t
}: {
    lang: 'de' | 'en';
    title: string; setTitle: (s: string) => void;
    prompt: string; setPrompt: (s: string) => void;
    controls: PresetControl[]; setControls: React.Dispatch<React.SetStateAction<PresetControl[]>>;
    tags: string[]; setTags: React.Dispatch<React.SetStateAction<string[]>>;
    availableTags: string[];
    showHeader: boolean;
    t: TranslationFunction;
}) => {
    const [isAddingControl, setIsAddingControl] = useState(false);
    const [newControlLabel, setNewControlLabel] = useState('');
    const [newControlOptions, setNewControlOptions] = useState('');
    const [newTagInput, setNewTagInput] = useState('');
    const [isAddingTag, setIsAddingTag] = useState(false);

    const handleAddControl = () => {
        if (!newControlLabel.trim()) return;
        const opts = newControlOptions.split(',').map(s => s.trim()).filter(s => s);
        const newControl: PresetControl = {
            id: generateId(),
            label: newControlLabel.trim(),
            options: opts.map(o => ({ id: generateId(), label: o, value: o }))
        };
        setControls(prev => [...prev, newControl]);
        setIsAddingControl(false);
        setNewControlLabel('');
        setNewControlOptions('');
    };

    const handleAddTag = () => {
        if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
            setTags(prev => [...prev, newTagInput.trim()]);
        }
        setNewTagInput('');
        setIsAddingTag(false);
    };

    const toggleTag = (tag: string) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            {showHeader && (
                <div className={`px-4 py-2 border-b ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} flex justify-between items-center sticky top-0 z-10`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{lang === 'de' ? t('version_de') : t('version_en')}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${lang === 'de' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{lang}</span>
                </div>
            )}

            <div className={`px-4 pb-4 space-y-6 ${!showHeader ? 'pt-6' : ''}`}>
                {/* Title */}
                <div>
                    <SectionHeader>{t('title_label')}</SectionHeader>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('title_placeholder')} />
                </div>

                {/* Prompt */}
                <div>
                    <SectionHeader>{t('prompt_label_editor')}</SectionHeader>
                    <TextArea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t('prompt_placeholder')} className="h-32 font-mono" />
                </div>

                {/* Controls */}
                <div>
                    <SectionHeader>{t('variables_label')}</SectionHeader>
                    <div className="space-y-3">
                        {controls.map((ctrl) => (
                            <div key={ctrl.id} className={`flex items-start justify-between p-3 border ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} ${Theme.Geometry.Radius}`}>
                                <div>
                                    <div className={`text-sm font-medium ${Theme.Colors.TextHighlight} mb-1`}>{ctrl.label}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {ctrl.options.map(o => (
                                            <span key={o.id} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{o.label}</span>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => setControls(p => p.filter(c => c.id !== ctrl.id))} className="text-zinc-400 hover:text-red-500 p-1"><X className="w-3.5 h-3.5" /></button>
                            </div>
                        ))}

                        {isAddingControl ? (
                            <div className={`p-3 border ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} ${Theme.Geometry.Radius} space-y-2`}>
                                <Input value={newControlLabel} onChange={e => setNewControlLabel(e.target.value)} placeholder={t('var_name_placeholder')} className="py-2 text-xs" autoFocus />
                                <Input value={newControlOptions} onChange={e => setNewControlOptions(e.target.value)} placeholder={t('var_options_placeholder')} className="py-2 text-xs" />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsAddingControl(false)} className="text-xs text-zinc-500">{t('cancel')}</button>
                                    <Button onClick={handleAddControl} disabled={!newControlLabel} className="py-1 px-3 h-auto text-xs">{t('add_btn')}</Button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setIsAddingControl(true)} className={`w-full py-2 flex items-center justify-center gap-2 border border-dashed border-zinc-300 dark:border-zinc-700 ${Theme.Geometry.Radius} text-zinc-500 text-xs ${Theme.Colors.SurfaceHover}`}>
                                <Plus className="w-3.5 h-3.5" /> {t('add_variable')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tags */}
                <div>
                    <SectionHeader>{t('tags_label')}</SectionHeader>
                    <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-2 py-1 ${Theme.Geometry.Radius} text-[10px] border transition-all ${tags.includes(tag) ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-200 dark:text-black dark:border-zinc-200' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-400'}`}
                            >
                                {tag}
                            </button>
                        ))}
                         {isAddingTag ? (
                            <input 
                                autoFocus
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                onBlur={handleAddTag}
                                className={`w-20 px-2 py-1 ${Theme.Geometry.Radius} text-[10px] bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 outline-none`}
                                placeholder={t('tag_name')}
                            />
                        ) : (
                            <button onClick={() => setIsAddingTag(true)} className={`px-2 py-1 ${Theme.Geometry.Radius} border ${Theme.Colors.Border} ${Theme.Colors.SurfaceSubtle} text-zinc-400 hover:text-black dark:hover:text-white`}>
                                <Plus className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const PresetEditorModal: React.FC<PresetEditorModalProps> = ({
  isOpen,
  onClose,
  mode,
  scope,
  currentLang = 'en',
  initialTemplate,
  existingTemplates,
  onSave,
  onDelete,
  t
}) => {
  // DE State
  const [titleDe, setTitleDe] = useState('');
  const [promptDe, setPromptDe] = useState('');
  const [tagsDe, setTagsDe] = useState<string[]>([]);
  const [controlsDe, setControlsDe] = useState<PresetControl[]>([]);

  // EN State
  const [titleEn, setTitleEn] = useState('');
  const [promptEn, setPromptEn] = useState('');
  const [tagsEn, setTagsEn] = useState<string[]>([]);
  const [controlsEn, setControlsEn] = useState<PresetControl[]>([]);

  useEffect(() => {
    if (isOpen) {
        // Reset
        setTitleDe(''); setPromptDe(''); setTagsDe([]); setControlsDe([]);
        setTitleEn(''); setPromptEn(''); setTagsEn([]); setControlsEn([]);

        if (mode === 'edit' && initialTemplate) {
            // Load initial template into corresponding side
            const isEn = initialTemplate.lang === 'en';
            
            // In User mode, we simply populate the matching state for the current language
            // In Admin mode, we might be editing one specific lang instance, or potentially link them (out of scope, assuming single edit)
            if (isEn) {
                setTitleEn(initialTemplate.title);
                setPromptEn(initialTemplate.prompt);
                setTagsEn(initialTemplate.tags || []);
                setControlsEn(initialTemplate.controls || []);
            } else {
                setTitleDe(initialTemplate.title);
                setPromptDe(initialTemplate.prompt);
                setTagsDe(initialTemplate.tags || []);
                setControlsDe(initialTemplate.controls || []);
            }
        }
    }
  }, [isOpen, mode, initialTemplate]);

  const availableTags = useMemo(() => {
      const set = new Set(DEFAULT_TAGS);
      existingTemplates.forEach(t => t.tags.forEach(tag => set.add(tag)));
      return Array.from(set).sort();
  }, [existingTemplates]);

  const handleSave = () => {
      const results: { title: string; prompt: string; tags: string[]; controls: PresetControl[]; lang: 'de'|'en' }[] = [];

      // Check scope to determine what to save
      if (scope === 'user') {
          // Only save the current language form
          if (currentLang === 'de') {
              if (promptDe.trim()) {
                  results.push({ title: titleDe.trim() || 'Untitled', prompt: promptDe, tags: tagsDe, controls: controlsDe, lang: 'de' });
              }
          } else {
              if (promptEn.trim()) {
                  results.push({ title: titleEn.trim() || 'Untitled', prompt: promptEn, tags: tagsEn, controls: controlsEn, lang: 'en' });
              }
          }
      } else {
          // Admin Scope: Check both
          if (promptDe.trim()) {
              results.push({
                  title: titleDe.trim() || 'Untitled',
                  prompt: promptDe,
                  tags: tagsDe,
                  controls: controlsDe,
                  lang: 'de'
              });
          }
    
          if (promptEn.trim()) {
              results.push({
                  title: titleEn.trim() || 'Untitled',
                  prompt: promptEn,
                  tags: tagsEn,
                  controls: controlsEn,
                  lang: 'en'
              });
          }
      }

      onSave(results);
  };

  const isSaveDisabled = () => {
      if (scope === 'user') {
          return currentLang === 'de' ? !promptDe.trim() : !promptEn.trim();
      }
      // Admin: Disabled if BOTH are empty
      return !promptDe.trim() && !promptEn.trim();
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center animate-in fade-in duration-200 p-4"
        onClick={onClose}
    >
      <div 
        className={`w-full ${scope === 'admin' ? 'max-w-7xl' : 'max-w-2xl'} h-[85vh] ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader 
            title={mode === 'create' ? t('new_preset_title') : t('edit_preset_title')} 
            onClose={onClose} 
        />

        <div className={`flex-1 overflow-hidden ${scope === 'admin' ? 'grid grid-cols-2 divide-x' : 'flex flex-col'} ${Theme.Colors.Border}`}>
            
            {/* German Form - Show if Admin OR if User+DE */}
            {(scope === 'admin' || currentLang === 'de') && (
                <div className={`overflow-y-auto no-scrollbar ${scope === 'admin' ? '' : 'w-full'}`}>
                    <LanguageForm 
                        lang="de" 
                        title={titleDe} setTitle={setTitleDe}
                        prompt={promptDe} setPrompt={setPromptDe}
                        controls={controlsDe} setControls={setControlsDe}
                        tags={tagsDe} setTags={setTagsDe}
                        availableTags={availableTags}
                        showHeader={scope === 'admin'}
                        t={t}
                    />
                </div>
            )}

            {/* English Form - Show if Admin OR if User+EN */}
            {(scope === 'admin' || currentLang === 'en') && (
                <div className={`overflow-y-auto no-scrollbar ${scope === 'admin' ? Theme.Colors.SurfaceSubtle : 'w-full'}`}>
                    <LanguageForm 
                        lang="en" 
                        title={titleEn} setTitle={setTitleEn}
                        prompt={promptEn} setPrompt={setPromptEn}
                        controls={controlsEn} setControls={setControlsEn}
                        tags={tagsEn} setTags={setTagsEn}
                        availableTags={availableTags}
                        showHeader={scope === 'admin'}
                        t={t}
                    />
                </div>
            )}
        </div>

        {/* Footer */}
        <div className={`p-6 pt-4 border-t ${Theme.Colors.Border} ${Theme.Colors.PanelBg} flex justify-between items-center`}>
             {mode === 'edit' && onDelete && initialTemplate ? (
                <Button 
                    variant="danger" 
                    onClick={() => { onDelete(initialTemplate.id); onClose(); }}
                    className="w-auto px-4"
                    icon={<Trash2 className="w-4 h-4" />}
                >
                    {t('delete')}
                </Button>
            ) : <div />}
            
            <Button 
                onClick={handleSave}
                disabled={isSaveDisabled()}
                className="w-48"
                icon={<Check className="w-4 h-4" />}
            >
                {t('save')}
            </Button>
        </div>
      </div>
    </div>
  );
};
