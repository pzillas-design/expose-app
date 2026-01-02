import React, { useState } from 'react';
import { Button, Typo, Theme, IconButton } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';
import { X, Sparkles, Wand2, Ratio } from 'lucide-react';

interface CreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string, model: string, ratio: string) => void;
    t: TranslationFunction;
    lang: 'de' | 'en';
}

const ASPECT_RATIOS = [
    { label: '1:1', value: '1:1', width: 40, height: 40 },
    { label: '4:3', value: '4:3', width: 48, height: 36 },
    { label: '16:9', value: '16:9', width: 56, height: 32 },
    { label: '9:16', value: '9:16', width: 32, height: 56 },
    { label: '3:2', value: '3:2', width: 48, height: 32 },
];

const MODELS = [
    { id: 'flux-schnell', name: 'Flux Schnell', desc: 'Fastest generation, good quality' },
    { id: 'flux-dev', name: 'Flux Dev', desc: 'High quality, actively developed' },
    { id: 'flux-pro', name: 'Flux Pro', desc: 'Premium quality, slower generation' },
];

export const CreationModal: React.FC<CreationModalProps> = ({
    isOpen,
    onClose,
    onGenerate,
    t,
    lang
}) => {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0].value);

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
                    w-full max-w-2xl ${Theme.Colors.ModalBg} 
                    border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} 
                    shadow-2xl overflow-hidden flex flex-col max-h-[90vh]
                    animate-in zoom-in-95 duration-200
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${Theme.Colors.Border} shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className={Typo.H3}>{lang === 'de' ? 'Neues Bild generieren' : 'Create New Image'}</h2>
                            <p className={`${Typo.Label} text-zinc-500`}>
                                {lang === 'de' ? 'Wähle Einstellungen und Prompt' : 'Choose settings and describe your image'}
                            </p>
                        </div>
                    </div>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">

                    {/* Prompt Input */}
                    <div className="flex flex-col gap-3">
                        <label className={`${Typo.Label} text-zinc-500 uppercase tracking-wider`}>
                            {lang === 'de' ? 'Prompt' : 'Prompt'}
                        </label>
                        <textarea
                            className={`
                                w-full h-32 p-4 rounded-xl resize-none
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Model Selection */}
                        <div className="flex flex-col gap-3">
                            <label className={`${Typo.Label} text-zinc-500 uppercase tracking-wider flex items-center gap-2`}>
                                <Wand2 className="w-4 h-4" />
                                {lang === 'de' ? 'Modell' : 'Model'}
                            </label>
                            <div className="flex flex-col gap-2">
                                {MODELS.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => setSelectedModel(model.id)}
                                        className={`
                                            flex flex-col items-start p-3 rounded-lg border transition-all text-left
                                            ${selectedModel === model.id
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500/50'
                                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}
                                        `}
                                    >
                                        <span className={`${Typo.Label} ${selectedModel === model.id ? 'text-blue-700 dark:text-blue-300' : Theme.Colors.TextPrimary}`}>
                                            {model.name}
                                        </span>
                                        <span className={`text-[11px] ${selectedModel === model.id ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-zinc-500'}`}>
                                            {model.desc}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div className="flex flex-col gap-3">
                            <label className={`${Typo.Label} text-zinc-500 uppercase tracking-wider flex items-center gap-2`}>
                                <Ratio className="w-4 h-4" />
                                {lang === 'de' ? 'Format' : 'Aspect Ratio'}
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {ASPECT_RATIOS.map((ratio) => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => setSelectedRatio(ratio.value)}
                                        className={`
                                            aspect-square rounded-lg border flex flex-col items-center justify-center gap-2 transition-all
                                            ${selectedRatio === ratio.value
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500/50'
                                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}
                                        `}
                                    >
                                        <div
                                            className={`border-2 ${selectedRatio === ratio.value ? 'border-blue-500 bg-blue-500/20' : 'border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800'}`}
                                            style={{ width: `${ratio.width}px`, height: `${ratio.height}px`, borderRadius: '2px' }}
                                        />
                                        <span className={`text-[10px] font-medium ${selectedRatio === ratio.value ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-500'}`}>
                                            {ratio.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t ${Theme.Colors.Border} bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-3 shrink-0`}>
                    <Button variant="secondary" onClick={onClose}>
                        {lang === 'de' ? 'Abbrechen' : 'Cancel'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={!prompt.trim()}
                        icon={<Sparkles className="w-4 h-4" />}
                        className="min-w-[140px]"
                    >
                        {lang === 'de' ? 'Generieren' : 'Generate'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
