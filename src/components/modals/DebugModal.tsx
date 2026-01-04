import React, { useEffect, useState } from 'react';
import { X, Bug, Image as ImageIcon, Code, Layers } from 'lucide-react';
import { Button, Typo, Theme, IconButton } from '@/components/ui/DesignSystem';
import { CanvasImage, AnnotationObject, TranslationFunction } from '@/types';
import { generateMaskFromAnnotations } from '@/utils/maskGenerator';

interface DebugModalProps {
    isOpen: boolean;
    onClose: () => void;
    image: CanvasImage;
    prompt: string;
    t: TranslationFunction;
}

export const DebugModal: React.FC<DebugModalProps> = ({
    isOpen,
    onClose,
    image,
    prompt,
    t
}) => {
    const [maskUrl, setMaskUrl] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'visual' | 'payload'>('visual');

    useEffect(() => {
        if (isOpen && image) {
            // Generate mask using the original source as background if available, 
            // otherwise use current src (fallback for first iterations)
            generateMaskFromAnnotations(image, image.originalSrc).then(setMaskUrl);
        }
    }, [isOpen, image]);

    if (!isOpen) return null;

    const annotations = image.annotations || [];
    const refAnns = annotations.filter(a => a.type === 'reference_image');
    const maskAnns = annotations.filter(a => a.type !== 'reference_image');

    const labels = annotations.map(a => a.text).filter(Boolean);
    const systemInstruction = `I am providing an ORIGINAL image (to be edited). ${maskAnns.length > 0 ? `I am also providing an ANNOTATION image (the original image muted/dimmed, with bright markings and text indicating desired changes).${labels.length > 0 ? ` The following labels are marked in the Annotation Image: ${labels.map(l => `"${l?.toUpperCase()}"`).join(", ")}.` : ''
        }` : ''
        } ${refAnns.length > 0 ? `I am also providing REFERENCE images for guidance (style, context, or visual elements).` : ''
        } Apply the edits to the ORIGINAL image based on the user prompt, following the visual cues in the ANNOTATION image and using the REFERENCE images as a basis for style or objects.`;

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className={`w-full max-w-6xl max-h-[90vh] ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header omitted for brevity in targetContent match, but included in replacement */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Bug className="w-5 h-5" />
                        </div>
                        <h2 className={`${Typo.H2} text-lg`}>Admin Debug Mode</h2>
                    </div>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <button
                        onClick={() => setActiveTab('visual')}
                        className={`px-6 py-3 ${Typo.Label} transition-colors relative ${activeTab === 'visual' ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Visual Assets
                        </div>
                        {activeTab === 'visual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('payload')}
                        className={`px-6 py-3 ${Typo.Label} transition-colors relative ${activeTab === 'payload' ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            API Payload
                        </div>
                        {activeTab === 'payload' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                    {activeTab === 'visual' ? (
                        <>
                            {/* Visual Grid: Source -> Mask -> Result */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex flex-col gap-3">
                                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>1. Original Input (Source)</span>
                                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                                        <img src={image.originalSrc || image.src} className="w-full h-full object-contain" alt="original-source" />
                                    </div>
                                    <span className={`${Typo.Micro} text-zinc-500 text-center italic`}>The base image sent to Gemini</span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>2. Annotation Image (Mask)</span>
                                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                                        {maskUrl ? (
                                            <img src={maskUrl} className="w-full h-full object-contain" alt="mask" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-zinc-500">
                                                <Layers className="w-8 h-8 opacity-20" />
                                                <span>No Mask Generated</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className={`${Typo.Micro} text-zinc-500 text-center italic`}>Visual instructions overlays</span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>3. Generated Result (Current)</span>
                                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                                        <img src={image.src} className="w-full h-full object-contain" alt="result" />
                                    </div>
                                    <span className={`${Typo.Micro} text-zinc-500 text-center italic`}>The final output pixels</span>
                                </div>
                            </div>

                            {/* Reference Images */}
                            {refAnns.length > 0 && (
                                <div className="flex flex-col gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>Reference Images ({refAnns.length})</span>
                                    <div className="flex flex-wrap gap-4">
                                        {refAnns.map((ann, i) => (
                                            <div key={ann.id} className="flex flex-col gap-2">
                                                <div className="w-32 h-32 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                                    <img src={ann.referenceImage} className="w-full h-full object-cover" alt={`ref-${i}`} />
                                                </div>
                                                <span className={`${Typo.Micro} text-zinc-500 truncate w-32`}>{ann.text || `Ref ${i + 1}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-3">
                                <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>System Instruction</span>
                                <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                                    {systemInstruction}
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>User Prompt</span>
                                <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 font-mono text-xs leading-relaxed text-blue-600 dark:text-blue-400 whitespace-pre-wrap font-bold">
                                    {prompt || 'No prompt set'}
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className={`${Typo.Label} text-zinc-400 uppercase tracking-widest text-[10px]`}>Annotations JSON</span>
                                <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 font-mono text-[10px] leading-tight text-zinc-500 overflow-x-auto">
                                    <pre>{JSON.stringify(annotations.map(a => ({ id: a.id, type: a.type, text: a.text })), null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Close Debugger</Button>
                </div>
            </div>
        </div>
    );
};
