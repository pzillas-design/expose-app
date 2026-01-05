import React from 'react';
import { X, Cpu, Clock, DollarSign, FileText, User } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo, IconButton, SectionHeader } from '@/components/ui/DesignSystem';

interface AdminJobDetailProps {
    job: any; // Using any for now matching AdminJobsView state
    onClose: () => void;
    t: TranslationFunction;
}

export const AdminJobDetail: React.FC<AdminJobDetailProps> = ({
    job, onClose, t
}) => {
    // Helper to render chips
    const renderResourceChip = (label: string, active: boolean) => {
        if (!active) return null;
        return (
            <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {label}
            </span>
        );
    };

    return (
        <div className="absolute top-0 bottom-0 right-0 w-96 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-xl z-30 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <span className={Typo.H3}>{t('admin_job_details') || "Job Details"}</span>
                    <span className="text-[10px] font-mono text-zinc-400 mt-1 uppercase tracking-wider">{job.id}</span>
                </div>
                <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Status & Type */}
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center 
                        ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                            job.status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                                'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                        <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider 
                                ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                    job.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                {job.status === 'completed' ? (t('admin_job_completed') || "Completed") :
                                    job.status === 'failed' ? (t('admin_job_failed') || "Failed") :
                                        (t('admin_job_processing') || "Processing")}
                            </span>
                        </div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {job.type}
                        </div>
                    </div>
                </div>

                {/* User Info */}
                <div>
                    <SectionHeader>{t('admin_job_user') || 'User'}</SectionHeader>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <User className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{job.userName}</span>
                    </div>
                </div>

                {/* Resources Used (Chips) */}
                <div>
                    <SectionHeader>{t('admin_resources_used') || "Resources Used"}</SectionHeader>
                    <div className="flex flex-wrap gap-2">
                        {renderResourceChip("Image", true)}
                        {renderResourceChip("Prompt", !!job.promptPreview)}
                        {renderResourceChip("Mask", job.type === 'Inpaint')}
                        {/* Future: Add reference image detection logic */}
                        {renderResourceChip("High Quality", job.cost > 1)}
                    </div>
                </div>

                {/* Costs */}
                <div>
                    <SectionHeader>{t('admin_financials')}</SectionHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                                <div className="text-xs text-zinc-500 uppercase tracking-wider">{t('admin_job_cost') || "Cost"}</div>
                            </div>
                            <div className="text-xl font-mono text-black dark:text-white">{job.cost.toFixed(2)}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                                <div className="text-xs text-zinc-500 uppercase tracking-wider">{t('admin_job_api_cost') || "API Cost"}</div>
                            </div>
                            <div className="text-xl font-mono text-zinc-500 dark:text-zinc-400">
                                {job.apiCost !== undefined && job.apiCost !== null ? `$${job.apiCost.toFixed(6)}` : '-'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Full Prompt */}
                {job.promptPreview && (
                    <div>
                        <SectionHeader>{t('admin_job_prompt')}</SectionHeader>
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
                            {job.promptPreview}
                        </div>
                    </div>
                )}

                {/* Dates */}
                <div>
                    <SectionHeader>{t('admin_timestamps') || "Timestamps"}</SectionHeader>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500 flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Created
                            </span>
                            <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                {new Date(job.createdAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
