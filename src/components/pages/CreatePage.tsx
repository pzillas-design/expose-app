import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { useMobile } from '@/hooks/useMobile';

const ASPECT_RATIOS = [
    { label: '16:9', value: '16:9' },
    { label: '4:3',  value: '4:3'  },
    { label: '1:1',  value: '1:1'  },
    { label: '3:4',  value: '3:4'  },
    { label: '9:16', value: '9:16' },
];

const AspectBox = ({ ratio, active }: { ratio: string; active: boolean }) => {
    const map: Record<string, string> = {
        '16:9': 'w-9 h-[20px]',
        '4:3':  'w-8 h-6',
        '1:1':  'w-6 h-6',
        '3:4':  'w-6 h-8',
        '9:16': 'w-[20px] h-9',
    };
    return (
        <div className={`${map[ratio] || 'w-6 h-6'} rounded-[2px] border-[1.5px] transition-colors ${
            active ? 'border-zinc-900 dark:border-white bg-zinc-900/10 dark:bg-white/10' : 'border-zinc-300 dark:border-zinc-600'
        }`} />
    );
};

const Swoosh = () => (
    <>
        <style>{`
            @keyframes expose-swoosh {
                0%   { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
                15%  { opacity: 1; }
                85%  { opacity: 1; }
                100% { transform: translateX(260%) skewX(-12deg); opacity: 0; }
            }
        `}</style>
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div style={{
                position: 'absolute',
                top: '-10%',
                bottom: '-10%',
                width: '30%',
                background: 'linear-gradient(90deg, transparent, rgba(130,130,130,0.09), rgba(150,150,150,0.13), transparent)',
                animation: 'expose-swoosh 2.2s ease-in-out infinite',
                filter: 'blur(6px)',
            }} />
        </div>
    </>
);

interface CreatePageProps {
    onCreateNew: (prompt: string, model: string, ratio: string, attachments: string[]) => void;
    onBack: () => void;
    state: any;
    actions: any;
    t: any;
}

export const CreatePage: React.FC<CreatePageProps> = ({
    onCreateNew, onBack, state, actions, t
}) => {
    const isMobile = useMobile();
    const [selectedRatio, setSelectedRatio] = useState('4:3');
    const [isGenerating, setIsGenerating] = useState(false);
    const [referenceFiles, setReferenceFiles] = useState<string[]>([]); // base64 data URLs

    const [ratioW, ratioH] = selectedRatio.split(':').map(Number);

    // Measure available canvas area → compute "object-fit: contain" preview dimensions
    const canvasAreaRef = useRef<HTMLDivElement>(null);
    const [previewSize, setPreviewSize] = useState<{ w: number; h: number } | null>(null);

    useEffect(() => {
        const el = canvasAreaRef.current;
        if (!el) return;
        const update = (entries?: ResizeObserverEntry[]) => {
            const rect = entries?.[0]?.contentRect ?? el.getBoundingClientRect();
            const availW = rect.width;
            const availH = rect.height;
            if (availW <= 0 || availH <= 0) return;
            const scale = Math.min(availW / ratioW, availH / ratioH);
            setPreviewSize({ w: ratioW * scale, h: ratioH * scale });
        };
        const ro = new ResizeObserver(update);
        ro.observe(el);
        update();
        return () => ro.disconnect();
    }, [ratioW, ratioH]);

    const handleAddReference = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                setReferenceFiles(prev => [...prev, e.target!.result as string]);
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const handleRemoveReference = useCallback((idx: number) => {
        setReferenceFiles(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const handleGenerate = useCallback((prompt: string) => {
        setIsGenerating(true);
        onCreateNew(prompt, state.qualityMode || 'nb2-2k', selectedRatio, referenceFiles);
    }, [onCreateNew, state.qualityMode, selectedRatio, referenceFiles]);

    const sidebarWidth = 380;

    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white dark:bg-zinc-950">

            {/* ── Canvas / Format Picker ── */}
            <div className="md:flex-1 relative overflow-hidden"
                style={isMobile ? { height: `calc(100vw * ${ratioH} / ${ratioW})`, minHeight: 200, maxHeight: '55vw' } : undefined}
            >
                <div ref={canvasAreaRef} className="absolute inset-0 flex items-center justify-center p-6 md:p-12 bg-zinc-100 dark:bg-zinc-950">
                    <div
                        className="relative rounded-2xl bg-white dark:bg-zinc-900 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 overflow-visible"
                        style={previewSize
                            ? { width: previewSize.w, height: previewSize.h }
                            : { aspectRatio: `${ratioW} / ${ratioH}`, maxWidth: '100%', maxHeight: '100%' }
                        }
                    >
                        {/* Swoosh animation while generating */}
                        {isGenerating && <Swoosh />}

                        {/* Ratio picker */}
                        <div
                            className={`relative z-10 flex items-center gap-1 transition-opacity duration-300 ${isGenerating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {ASPECT_RATIOS.map(r => (
                                <button
                                    key={r.value}
                                    data-voice-action={`ratio-${r.value}`}
                                    onClick={() => setSelectedRatio(r.value)}
                                    className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl transition-colors ${
                                        selectedRatio === r.value
                                            ? isMobile ? '' : 'bg-zinc-100 dark:bg-zinc-800'
                                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                    }`}
                                >
                                    <AspectBox ratio={r.value} active={selectedRatio === r.value} />
                                    <span className={`text-[9px] font-medium ${
                                        selectedRatio === r.value ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                                    }`}>
                                        {r.label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Reference image thumbnails */}
                        {referenceFiles.length > 0 && !isGenerating && (
                            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 flex-wrap z-10">
                                {referenceFiles.map((src, idx) => (
                                    <div key={idx} className="relative group w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                        <img src={src} className="w-full h-full object-cover" alt="" />
                                        <button
                                            onClick={() => handleRemoveReference(idx)}
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── SideSheet ── */}
            <aside
                className="flex flex-col relative shrink-0 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 md:border-t-0 md:border-l md:border-zinc-100 dark:md:border-zinc-900"
                style={{ width: isMobile ? undefined : `${sidebarWidth}px` }}
            >
                <SideSheet
                    width={isMobile ? '100%' : `${sidebarWidth}px`}
                    disableMobileSheet={isMobile}
                    selectedImage={null}
                    sideSheetMode={state.sideSheetMode}
                    onModeChange={actions.handleModeChange}
                    brushSize={state.brushSize}
                    onBrushSizeChange={actions.setBrushSize}
                    maskTool={state.maskTool}
                    onMaskToolChange={actions.setMaskTool}
                    activeShape={state.activeShape}
                    onActiveShapeChange={actions.setActiveShape}
                    onBrushResizeStart={() => actions.setIsBrushResizing(true)}
                    onBrushResizeEnd={() => actions.setIsBrushResizing(false)}
                    onGenerate={handleGenerate}
                    onUpdateAnnotations={actions.handleUpdateAnnotations}
                    onUpdatePrompt={actions.handleUpdatePrompt}
                    onUpdateVariables={actions.handleUpdateVariables}
                    onDeleteImage={actions.handleDeleteImage}
                    onDeselectAll={actions.deselectAll}
                    onGenerateMore={actions.handleGenerateMore}
                    onNavigateParent={actions.handleNavigateParent}
                    onDownload={actions.handleDownload}
                    isDragOver={false}
                    onGlobalDragLeave={() => {}}
                    t={t}
                    lang={state.currentLang}
                    fullLibrary={state.fullLibrary}
                    onAddUserCategory={actions.addUserCategory}
                    onDeleteUserCategory={actions.deleteUserCategory}
                    onAddUserItem={actions.addUserItem}
                    onDeleteUserItem={actions.deleteUserItem}
                    qualityMode={state.qualityMode as any}
                    onQualityModeChange={actions.setQualityMode as any}
                    templates={state.templates || []}
                    onSaveTemplate={actions.saveTemplate}
                    onDeleteTemplate={actions.deleteTemplate}
                    onRefreshTemplates={actions.refreshTemplates}
                    onSaveRecentPrompt={actions.recordPresetUsage}
                    onUpdateImageTitle={actions.updateProfile}
                    userProfile={state.userProfile}
                    onAddReference={handleAddReference}
                />
            </aside>
        </div>
    );
};
