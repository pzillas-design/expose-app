import React, { useState } from 'react';
import { Button, Typo, Theme, IconButton } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';
import { X, Sparkles, Wand2, Ratio, ChevronDown, Check } from 'lucide-react';

interface CreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string, model: string, ratio: string) => void;
    t: TranslationFunction;
    lang: 'de' | 'en';
}

const ASPECT_RATIOS = [
    { label: '16:9', value: '16:9', width: 56, height: 32 },
    { label: '3:2', value: '3:2', width: 48, height: 32 },
    { label: '4:3', value: '4:3', width: 48, height: 36 },
    { label: '1:1', value: '1:1', width: 40, height: 40 },
    { label: '3:4', value: '3:4', width: 36, height: 48 },
    { label: '9:16', value: '9:16', width: 32, height: 56 },
];

const MODELS = [
    { id: 'fast', name: 'Nano Banana', desc: '1024px • 0,20 €' },
    { id: 'pro-1k', name: 'Nano Banana Pro 1K', desc: '1024px • 0,50 €' },
    { id: 'pro-2k', name: 'Nano Banana Pro 2K', desc: '2048px • 0,75 €' },
    { id: 'pro-4k', name: 'Nano Banana Pro 4K', desc: '4096px • 1,00 €' },
];

const AspectIcon = ({ ratio, isSelected }: { ratio: string, isSelected: boolean }) => {
    const baseClass = `border-[1.5px] rounded-[1px] transition-colors ${isSelected ? 'border-current' : 'border-zinc-400 group-hover:border-zinc-600 dark:group-hover:border-zinc-300'}`;
    switch (ratio) {
        case '16:9': return <div className={`${baseClass} w-5 h-[11px]`} />;
        case '4:3': return <div className={`${baseClass} w-5 h-[15px]`} />;
        case '1:1': return <div className={`${baseClass} w-4 h-4`} />;
        case '3:4': return <div className={`${baseClass} w-[15px] h-5`} />;
        case '9:16': return <div className={`${baseClass} w-[11px] h-5`} />;
        case '3:2': return <div className={`${baseClass} w-5 h-[13px]`} />;
        default: return <div className={`${baseClass} w-4 h-4`} />;
    }
};

export const CreationModal: React.FC<CreationModalProps> = ({
    isOpen,
    onClose,
    onGenerate,
    t,
    lang
}) => {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('pro-2k');
    const [selectedRatio, setSelectedRatio] = useState('4:3');
    const [openDropdown, setOpenDropdown] = useState<'model' | 'ratio' | null>(null);

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        onGenerate(prompt, selectedModel, selectedRatio);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] bg-zinc-950/60 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div

                className={`
                    w-full max-w-lg ${Theme.Colors.ModalBg} 
                    border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} 
                    shadow-2xl flex flex-col max-h-[90vh]
                    animate-in zoom-in-95 duration-200
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-2 shrink-0">
                    <div className="flex flex-col gap-1">
                        <h2 className={Typo.H3}>{lang === 'de' ? 'Neues Bild generieren' : 'Create New Image'}</h2>
                    </div>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                </div>

                <div className="flex-1 overflow-visible p-6 flex flex-col gap-8">

                    {/* Prompt Input */}
                    <div className="flex flex-col gap-3">
                        <label className={`${Typo.Label} text-zinc-500 uppercase tracking-wider`}>
                            {lang === 'de' ? 'Prompt' : 'Prompt'}
                        </label>
                        <textarea
                            className={`
                                w-full h-48 p-4 rounded-xl resize-none
                                bg-zinc-50 dark:bg-zinc-900 
                                border border-zinc-200 dark:border-zinc-800
                                focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                                outline-none transition-all
                                ${Typo.Body}
                            `}
                            placeholder={lang === 'de' ? 'Beschreibe dein Bild im Detail...' : 'Describe your image in detail...'}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {/* Dropdown Backdrop */}
                        {openDropdown && (
                            <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setOpenDropdown(null)}
                            />
                        )}

                        {/* Model Dropdown */}
                        <div className={`flex flex-col gap-3 relative ${openDropdown === 'model' ? 'z-[60]' : 'z-20'}`}>
                            <label className={`${Typo.Label} text-zinc-400 uppercase tracking-wider flex items-center gap-2`}>
                                {lang === 'de' ? 'Qualität' : 'Quality'}
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setOpenDropdown(openDropdown === 'model' ? null : 'model')}
                                    className={`
                                        w-full flex items-center justify-between p-3 ${Theme.Geometry.Radius} border transition-all text-left bg-white dark:bg-zinc-900
                                        ${openDropdown === 'model'
                                            ? `border-zinc-400 dark:border-zinc-500 ring-4 ring-zinc-100 dark:ring-zinc-800/50`
                                            : `${Theme.Colors.Border} hover:border-zinc-300 dark:hover:border-zinc-700`
                                        }
                                    `}
                                >
                                    <span className={`${Typo.Body} font-medium px-1`}>
                                        {MODELS.find(m => m.id === selectedModel)?.name}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${openDropdown === 'model' ? 'rotate-180' : ''}`} />
                                </button>

                                {openDropdown === 'model' && (
                                    <div className={`absolute top-full left-0 right-0 mt-2 p-1.5 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-xl flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top z-[100]`}>
                                        {MODELS.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => { setSelectedModel(model.id); setOpenDropdown(null); }}
                                                className={`
                                                    flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-colors
                                                    ${selectedModel === model.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                                                `}
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className={`${Typo.Body} font-medium ${selectedModel === model.id ? Theme.Colors.TextHighlight : Theme.Colors.TextPrimary}`}>
                                                        {model.name}
                                                    </span>
                                                    <span className={`${Typo.Micro} text-[10px]`}>{model.desc}</span>
                                                </div>
                                                {selectedModel === model.id && <Check className="w-4 h-4 text-black dark:text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Aspect Ratio Dropdown */}
                        <div className={`flex flex-col gap-3 relative ${openDropdown === 'ratio' ? 'z-[60]' : 'z-20'}`}>
                            <label className={`${Typo.Label} text-zinc-400 uppercase tracking-wider flex items-center gap-2`}>
                                {lang === 'de' ? 'Format' : 'Aspect Ratio'}
                            </label>

                            <div className="relative">
                                <button
                                    onClick={() => setOpenDropdown(openDropdown === 'ratio' ? null : 'ratio')}
                                    className={`
                                        w-full flex items-center justify-between p-3 ${Theme.Geometry.Radius} border transition-all text-left bg-white dark:bg-zinc-900
                                        ${openDropdown === 'ratio'
                                            ? `border-zinc-400 dark:border-zinc-500 ring-4 ring-zinc-100 dark:ring-zinc-800/50`
                                            : `${Theme.Colors.Border} hover:border-zinc-300 dark:hover:border-zinc-700`
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="w-5 flex justify-center">
                                            <AspectIcon ratio={selectedRatio} isSelected={true} />
                                        </div>
                                        <span className={`${Typo.Body} font-medium`}>
                                            {ASPECT_RATIOS.find(r => r.value === selectedRatio)?.label}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${openDropdown === 'ratio' ? 'rotate-180' : ''}`} />
                                </button>

                                {openDropdown === 'ratio' && (
                                    <div className={`absolute top-full left-0 right-0 mt-2 p-1.5 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-xl flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top z-[100]`}>
                                        {ASPECT_RATIOS.map((r) => (
                                            <button
                                                key={r.value}
                                                onClick={() => { setSelectedRatio(r.value); setOpenDropdown(null); }}
                                                className={`
                                                    flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-colors
                                                    ${selectedRatio === r.value ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 flex justify-center">
                                                        <AspectIcon ratio={r.value} isSelected={selectedRatio === r.value} />
                                                    </div>
                                                    <span className={`${Typo.Body} font-medium ${selectedRatio === r.value ? Theme.Colors.TextHighlight : Theme.Colors.TextPrimary}`}>
                                                        {r.label}
                                                    </span>
                                                </div>
                                                {selectedRatio === r.value && <Check className="w-4 h-4 text-black dark:text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-6 flex items-center gap-3 shrink-0`}>
                    <Button variant="secondary" onClick={onClose} className="flex-1">
                        {lang === 'de' ? 'Abbrechen' : 'Cancel'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={!prompt.trim()}
                        className="flex-1"
                    >
                        {lang === 'de' ? 'Generieren' : 'Generate'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
