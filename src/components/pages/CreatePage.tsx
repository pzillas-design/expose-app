import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { SideSheet } from '@/components/sidesheet/SideSheet';
import { useMobile } from '@/hooks/useMobile';
import { Button } from '@/components/ui/DesignSystem';

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

interface CreatePageProps {
    onCreateNew: (prompt: string, model: string, ratio: string, attachments: string[]) => void;
    onUpload?: (files: FileList) => void;
    onBack: () => void;
    state: any;
    actions: any;
    t: any;
}

export const CreatePage: React.FC<CreatePageProps> = ({
    onCreateNew, onUpload, onBack, state, actions, t
}) => {
    const isMobile = useMobile();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<'choose' | 'create'>(
        searchParams.get('m') === 'create' ? 'create' : 'choose'
    );
    const [selectedRatio, setSelectedRatio] = useState('4:3');
    const [isGenerating, setIsGenerating] = useState(false);
    const uploadRef = useRef<HTMLInputElement>(null);

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

    const handleGenerate = useCallback((prompt: string) => {
        setIsGenerating(true);
        // onCreateNew calls selectAndSnap(newId) which navigates directly to /image/newId
        onCreateNew(prompt, state.qualityMode || 'pro-2k', selectedRatio, []);
    }, [onCreateNew, state.qualityMode, selectedRatio]);

    const triggerUpload = () => uploadRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onUpload?.(e.target.files);
            onBack();
        }
        e.target.value = '';
    };

    const sidebarWidth = 380;

    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white dark:bg-black">

            <input
                ref={uploadRef}
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
            />

            {/* ── Canvas / Choice Area ── */}
            <div className="md:flex-1 relative overflow-hidden"
                style={isMobile ? { height: `calc(100vw * ${ratioH} / ${ratioW})`, minHeight: 200, maxHeight: '55vw' } : undefined}
            >
                <div ref={canvasAreaRef} className="absolute inset-0 flex items-center justify-center p-6 md:p-12 bg-white dark:bg-zinc-950">

                    {mode === 'choose' ? (
                        /* ── Welcome / choice screen ── */
                        <div className="flex flex-col items-center justify-center gap-10 w-full max-w-[320px] mx-auto text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex flex-col w-full gap-3">
                                <Button
                                    variant="primary-mono"
                                    size="l"
                                    onClick={triggerUpload}
                                    icon={<Upload className="w-5 h-5" />}
                                >
                                    {t('action_upload') || 'Upload'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="l"
                                    onClick={() => setMode('create')}
                                    icon={<Plus className="w-5 h-5" />}
                                >
                                    {t('action_generate') || 'Generate image'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* ── Canvas / format picker ── */
                        <div
                            className="relative rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
                            style={previewSize
                                ? { width: previewSize.w, height: previewSize.h }
                                : { aspectRatio: `${ratioW} / ${ratioH}`, maxWidth: '100%', maxHeight: '100%' }
                            }
                        >
                            {/* blobs — only mounted and visible while generating, never before */}
                            {isGenerating && <BlobBackground />}

                            {/* ratio picker — hidden while generating */}
                            <div
                                className={`relative z-10 flex items-center gap-1 transition-opacity duration-300 ${isGenerating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {ASPECT_RATIOS.map(r => (
                                    <button
                                        key={r.value}
                                        onClick={() => setSelectedRatio(r.value)}
                                        className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl transition-colors ${
                                            selectedRatio === r.value
                                                ? 'bg-zinc-200 dark:bg-zinc-800'
                                                : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
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
                        </div>
                    )}
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
                />
            </aside>
        </div>
    );
};
