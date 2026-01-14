import React from 'react';
import { X, Cpu, Clock, DollarSign, User, ImageIcon, Target, Layers, Zap } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo, IconButton, SectionHeader } from '@/components/ui/DesignSystem';

interface AdminJobDetailProps {
    job: any;
    onClose: () => void;
    t: TranslationFunction;
}

export const AdminJobDetail: React.FC<AdminJobDetailProps> = ({
    job, onClose, t
}) => {
    const renderResourceChip = (label: string, icon: React.ReactNode, active: boolean = true) => {
        if (!active) return null;
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <div className="text-zinc-400">{icon}</div>
                {label}
            </div>
        );
    };

    const modelName = job.model || 'unknown';
    const isPro = modelName.includes('pro') || modelName.includes('3');
    const displayName = modelName === 'fast' || modelName.includes('2.5') ? 'Nano Banana' : 'Nano Banana Pro';

    return (
        <div className="absolute top-0 bottom-0 right-0 w-[400px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <span className={Typo.H3}>{t('admin_job_details') || "Job Details"}</span>
                    <span className="text-[10px] font-mono text-zinc-400 mt-1 uppercase tracking-wider">{job.id}</span>
                </div>
                <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* User Info */}
                <div>
                    <SectionHeader>{t('admin_job_user') || 'Benutzer'}</SectionHeader>
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <User size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{job.userName}</span>
                            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-tighter">User ID: {job.userId?.slice(0, 8)}...</span>
                        </div>
                    </div>
                </div>

                {/* CONSOLIDATED RESOURCES SECTION */}
                <div>
                    <SectionHeader>{t('admin_resources_used') || "Verwendete Ressourcen"}</SectionHeader>
                    <div className="grid grid-cols-2 gap-2">
                        {renderResourceChip(
                            job.type === 'Edit' || job.type === 'Inpaint' ? 'Bearbeitung' : 'Erstellung',
                            <Target size={14} />
                        )}
                        {renderResourceChip(
                            displayName,
                            <Cpu size={14} />,
                            true
                        )}
                        {renderResourceChip(
                            "Quellbild: " + (job.requestPayload?.hasSourceImage ? "Ja" : "Nein"),
                            <ImageIcon size={14} />,
                            true
                        )}
                        {renderResourceChip(
                            "Maske: " + (job.requestPayload?.hasMask ? "Ja" : "Nein"),
                            <Layers size={14} />,
                            true
                        )}
                        {renderResourceChip(
                            "Referenzbilder: " + (job.requestPayload?.referenceImagesCount || 0),
                            <FileText size={14} />,
                            (job.requestPayload?.referenceImagesCount || 0) > 0
                        )}
                        {renderResourceChip(
                            "High Quality",
                            <Zap size={14} />,
                            job.cost > 1
                        )}
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-zinc-400 text-center uppercase tracking-widest border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        Model ID: {modelName}
                    </div>
                </div>

                {/* Financials */}
                <div>
                    <SectionHeader>{t('admin_financials')}</SectionHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500">
                                <DollarSign size={14} />
                                <span className="text-xs uppercase font-bold tracking-widest">{t('admin_job_cost') || "Kosten"}</span>
                            </div>
                            <div className="text-2xl font-bold font-mono text-black dark:text-white">{job.cost.toFixed(2)} €</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 opacity-60">
                            <div className="flex items-center gap-2 mb-2 text-zinc-500">
                                <Cpu size={14} />
                                <span className="text-xs uppercase font-bold tracking-widest">API-Kosten</span>
                            </div>
                            <div className="text-xl font-bold font-mono text-zinc-500">
                                {job.apiCost !== undefined && job.apiCost !== null ? `$${job.apiCost.toFixed(6)}` : '-'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Result Image */}
                {job.resultImage && (
                    <div>
                        <SectionHeader>Ergebnis</SectionHeader>
                        <div className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 group relative">
                            <img
                                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-content/${job.resultImage.storage_path}`}
                                alt="Generated Result"
                                className="w-full rounded-xl shadow-sm"
                                style={{ maxHeight: '400px', objectFit: 'contain' }}
                            />
                            <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[9px] font-mono text-white">
                                {job.resultImage.width}×{job.resultImage.height}px
                            </div>
                        </div>
                    </div>
                )}

                {/* Timestamps */}
                <div>
                    <SectionHeader>{t('admin_timestamps')}</SectionHeader>
                    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400 flex items-center gap-2 uppercase font-bold tracking-tighter">
                                <Clock size={12} /> Erstellt am
                            </span>
                            <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                {new Date(job.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                        </div>
                        {job.requestPayload?.timestamp && (
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
                                <span className="text-zinc-400 flex items-center gap-2 uppercase font-bold tracking-tighter">
                                    <Target size={12} /> Request
                                </span>
                                <span className="font-mono text-zinc-500">
                                    {new Date(job.requestPayload.timestamp).toLocaleString('de-DE', { timeStyle: 'medium' })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
