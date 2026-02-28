import React, { useState, useRef, useEffect } from 'react';
import { Button, Typo, Theme, IconButton } from '@/components/ui/DesignSystem';
import { TranslationFunction, PromptTemplate } from '@/types';
import { X, Sparkles, Wand2, Ratio, ChevronDown, Check, Paperclip, Trash, Camera } from 'lucide-react';

interface CreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string, model: string, ratio: string, attachments: string[]) => void;
    t: TranslationFunction;
    lang: 'de' | 'en';
    initialTemplate?: PromptTemplate | null;
}

const ASPECT_RATIOS = [
    { label: '16:9', value: '16:9', width: 56, height: 32 },
    { label: '4:3', value: '4:3', width: 48, height: 36 },
    { label: '1:1', value: '1:1', width: 40, height: 40 },
    { label: '3:4', value: '3:4', width: 36, height: 48 },
    { label: '9:16', value: '9:16', width: 32, height: 56 },
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
    lang,
    initialTemplate
}) => {
    const MODELS = [
        { id: 'pro-1k', name: 'Nano Banana Pro 1K', price: '0.10 €', res: '1024 px' },
        { id: 'pro-2k', name: 'Nano Banana Pro 2K', price: '0.25 €', res: '2048 px' },
        { id: 'pro-4k', name: 'Nano Banana Pro 4K', price: '0.50 €', res: '4096 px' },
    ];

    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('pro-2k');
    const [selectedRatio, setSelectedRatio] = useState('4:3');
    const [openDropdown, setOpenDropdown] = useState<'model' | 'ratio' | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [attachments, setAttachments] = useState<string[]>([]);
    const dragCounter = useRef(0);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            if (initialTemplate) {
                setPrompt(initialTemplate.prompt);
                // Also could set ratio/model if stored in template
            } else {
                setPrompt('');
            }
            setAttachments([]);
            dragCounter.current = 0;
            setIsDragging(false);
        }
    }, [isOpen, initialTemplate]);

    const processFilesLocally = (files: FileList | File[]) => {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    setAttachments(prev => [...prev, result]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files) {
            processFilesLocally(e.dataTransfer.files);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFilesLocally(e.target.files);
        }
    };

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        onGenerate(prompt, selectedModel, selectedRatio, attachments);
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
                    border ${Theme.Colors.Border} ${Theme.Geometry.RadiusXl} 
                    flex flex-col max-h-[90vh]
                    animate-in zoom-in-95 duration-200
                `}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                    <div className="flex flex-col gap-1">
                        <h2 className={`${Typo.H2} text-xl ${Theme.Colors.TextHighlight}`}>{t('gen_modal_title')}</h2>
                    </div>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">

                    {/* Unified Prompt & Upload Area */}
                    <div
                        className={`
 relative flex flex-col gap-3 p-1 rounded-xl transition-all duration-300
 ${isDragging ? 'bg-blue-500/5 ring-2 ring-blue-500/20' : ''}
 ${isDragging ? 'bg-orange-500/5 ring-2 ring-orange-500/20' : ''}
 `}
                        onDragEnter={handleDragEnter}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {/* Unified Drop Overlay - Global to this section */}
                        {isDragging && (
                            <div className="absolute inset-0 bg-orange-500/10 backdrop-blur-[3px] flex flex-col items-center justify-center gap-2 pointer-events-none border-2 border-dashed border-orange-500/50 rounded-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white ">
                                    <Paperclip className="w-7 h-7" />
                                </div>
                                <span className={`${Typo.Label} text-orange-600 dark:text-orange-400 font-bold text-base`}>{t('drop_here')}</span>
                            </div>
                        )}
                        <div className="flex flex-col gap-3">
                            <label className={`${Typo.Label} text-zinc-500 dark:text-zinc-400 uppercase tracking-wider`}>
                                {t('creation_prompt_label')}
                            </label>

                            <div className={`
 relative flex flex-col ${Theme.Colors.PanelBg} ${Theme.Colors.Border} border ${Theme.Geometry.Radius}
 transition-all duration-200 overflow-hidden
 ${isDragging ? 'border-orange-500 ring-4 ring-orange-500/10' : 'hover:border-zinc-300 dark:hover:border-zinc-600 focus-within:!border-zinc-400 dark:focus-within:!border-zinc-500'}
 `}>
                                <textarea
                                    className={`w-full bg-transparent border-none outline-none p-4 ${Typo.Body} font-mono leading-relaxed resize-none h-48`}
                                    placeholder={t('creation_prompt_placeholder')}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="relative">
                                <input
                                    type="file"
                                    id="creation-file-upload"
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileInput}
                                />
                                <Button
                                    variant="secondary"
                                    className={`w-full transition-colors ${isDragging ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-300 ' : ''}`}
                                    icon={<Paperclip className="w-4 h-4" />}
                                    onClick={() => document.getElementById('creation-file-upload')?.click()}
                                >
                                    {t('attach_file')}
                                </Button>
                            </div>

                            {/* Local Attachments Preview */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {attachments.map((src, idx) => (
                                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 group/item">
                                            <img src={src} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                                            >
                                                <Trash className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
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
                                {t('creation_quality_label')}
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
                                    <div className={`absolute top-full left-0 right-0 mt-2 p-1.5 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top z-[100]`}>
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
                                                    <span className={`${Typo.Micro} font-medium text-zinc-600 dark:text-zinc-400`}>{model.price}</span>
                                                    <span className={`${Typo.Micro} text-zinc-400 dark:text-zinc-500`}>{model.res}</span>
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
                                {t('creation_ratio_label')}
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
                                    <div className={`absolute top-full left-0 right-0 mt-2 p-1.5 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 origin-top z-[100]`}>
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
                    <Button
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={!prompt.trim()}
                        className="w-full"
                    >
                        {t('generate')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
