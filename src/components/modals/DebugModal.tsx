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

import { supabase } from '@/services/supabaseClient';

export const DebugModal: React.FC<DebugModalProps> = ({
    isOpen,
    onClose,
    image,
    prompt,
    t
}) => {
    const [maskUrl, setMaskUrl] = useState<string>('');
    const [viewMode, setViewMode] = useState<'original' | 'mask' | 'result'>('original');
    const [debugData, setDebugData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && image) {
            generateMaskFromAnnotations(image, image.originalSrc).then(setMaskUrl);

            // FETCH REAL PAYLOAD FROM EDGE FUNCTION
            const fetchDebug = async () => {
                setIsLoading(true);
                try {
                    const { data, error } = await supabase.functions.invoke('generate-image', {
                        body: {
                            sourceImage: image,
                            prompt: prompt,
                            qualityMode: image.quality || 'pro-1k',
                            maskDataUrl: await generateMaskFromAnnotations(image, image.originalSrc),
                            debug: true
                        }
                    });
                    if (!error && data?.success) {
                        setDebugData(data.debug);
                    }
                } catch (e) {
                    console.error("Debug fetch failed:", e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDebug();
        }
    }, [isOpen, image, prompt]);

    if (!isOpen) return null;

    const annotations = image.annotations || [];
    const refAnns = annotations.filter(a => a.type === 'reference_image');
    const systemInstruction = debugData?.systemInstruction || "Loading live instructions...";

    return (
        <div
            className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-[1400px] h-full max-h-[900px] ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Minimal Header */}
                <div className="flex items-center justify-between px-8 py-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <Bug className="w-5 h-5 text-blue-500" />
                        <h2 className={`${Typo.H2} text-xl tracking-tight`}>Payload Debugger</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-zinc-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row border-t border-zinc-100 dark:border-zinc-800">

                    {/* LEFT: INTERACTIVE IMAGE STACK */}
                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950/40 p-8 flex flex-col gap-6 relative border-r border-zinc-100 dark:border-zinc-800">
                        <div className="flex-1 relative flex items-center justify-center min-h-[400px]">
                            {/* The Stack */}
                            <div className="relative w-full h-full max-w-[600px] max-h-[600px] aspect-square group">
                                {/* Base Image */}
                                <img
                                    src={image.originalSrc || image.src}
                                    className="absolute inset-0 w-full h-full object-contain rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 transition-opacity duration-300"
                                    style={{ opacity: viewMode === 'original' ? 1 : 0.2 }}
                                    alt="Base"
                                />

                                {/* Mask Layer */}
                                {maskUrl && (
                                    <img
                                        src={maskUrl}
                                        className={`absolute inset-0 w-full h-full object-contain rounded-xl transition-all duration-300 ${viewMode === 'mask' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                                        alt="Mask"
                                    />
                                )}

                                {/* Result Layer */}
                                <img
                                    src={image.src}
                                    className={`absolute inset-0 w-full h-full object-contain rounded-xl shadow-2xl transition-all duration-300 ${viewMode === 'result' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                                    alt="Result"
                                />
                            </div>
                        </div>

                        {/* HOVER CONTROLS */}
                        <div className="flex items-center justify-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm self-center">
                            <button
                                onMouseEnter={() => setViewMode('original')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'original' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                            >
                                Source
                            </button>
                            <button
                                onMouseEnter={() => setViewMode('mask')}
                                disabled={!maskUrl}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'mask' ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30'}`}
                            >
                                Annotations
                            </button>
                            <button
                                onMouseEnter={() => setViewMode('result')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'result' ? 'bg-green-500 text-white' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                            >
                                Parsed Pixels
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-zinc-400 uppercase tracking-tight font-medium">Hover buttons to switch view modes</p>
                    </div>

                    {/* RIGHT: DATA PAYLOAD */}
                    <div className="w-full lg:w-[480px] overflow-y-auto p-8 flex flex-col gap-8 bg-white dark:bg-zinc-900/20">
                        {/* Section: Instruction */}
                        <div className="flex flex-col gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Code className="w-3 h-3" /> System Logic
                            </span>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 font-mono text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {systemInstruction}
                            </div>
                        </div>

                        {/* Section: Prompt */}
                        <div className="flex flex-col gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Layers className="w-3 h-3" /> User Prompt
                            </span>
                            <div className="p-4 bg-blue-50/30 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-900/30 font-mono text-xs leading-relaxed text-blue-600 dark:text-blue-400 font-bold">
                                {prompt || '— No prompt sent —'}
                            </div>
                        </div>

                        {/* Section: Raw JSON */}
                        <div className="flex flex-col gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Attachments & Metadata</span>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-x-auto">
                                <pre className="text-[10px] text-zinc-500 font-mono leading-tight whitespace-pre-wrap">{JSON.stringify({
                                    id: image.id,
                                    model: debugData?.model,
                                    config: debugData?.config,
                                    partsCount: debugData?.partsCount,
                                    annotations: annotations.map(a => ({
                                        type: a.type,
                                        label: a.text,
                                        hasRef: !!a.referenceImage
                                    })),
                                    references: refAnns.length
                                }, null, 2)}</pre>
                            </div>
                        </div>

                        {isLoading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-medium text-zinc-500">Fetching live payload...</span>
                                </div>
                            </div>
                        )}

                        {/* Ref Thumbs */}
                        {refAnns.length > 0 && (
                            <div className="flex flex-col gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Reference Assets ({refAnns.length})</span>
                                <div className="flex flex-wrap gap-2">
                                    {refAnns.map((ann, i) => (
                                        <div key={ann.id} className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
                                            <img src={ann.referenceImage} className="w-full h-full object-cover" alt="ref" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
