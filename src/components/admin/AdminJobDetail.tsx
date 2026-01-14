import React from 'react';
import { X } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo, IconButton } from '@/components/ui/DesignSystem';

interface AdminJobDetailProps {
    job: any;
    onClose: () => void;
    t: TranslationFunction;
}

export const AdminJobDetail: React.FC<AdminJobDetailProps> = ({
    job, onClose, t
}) => {
    const modelName = job.model || 'unknown';
    const displayName = modelName === 'fast' || modelName.includes('2.5') ? 'Nano Banana' : 'Nano Banana Pro';

    // Helper for simple rows
    const InfoRow = ({ label, value, color }: { label: string; value: string | number | React.ReactNode; color?: string }) => (
        <div className="flex justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 text-sm">
            <span className="text-zinc-500">{label}</span>
            <span className={`font-medium ${color || 'text-zinc-900 dark:text-zinc-100'}`}>{value}</span>
        </div>
    );

    const statusColor =
        job.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
            job.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                'text-amber-600 dark:text-amber-400';

    return (
        <div className="absolute top-0 bottom-0 right-0 w-[400px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Job Details</span>
                    <span className="text-[10px] font-mono text-zinc-400 mt-0.5">{job.id}</span>
                </div>
                <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Basic Info */}
                <div className="flex flex-col">
                    <InfoRow
                        label="Status"
                        value={job.status?.toUpperCase()}
                        color={statusColor}
                    />
                    <InfoRow
                        label="Typ"
                        value={job.type === 'Edit' || job.type === 'Inpaint' ? 'Bearbeitung' : 'Erstellung'}
                    />
                    <InfoRow
                        label="Datum"
                        value={new Date(job.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                    />
                </div>

                {/* User Info */}
                <div className="flex flex-col">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Benutzer</h4>
                    <InfoRow label="E-Mail" value={job.userName} />
                    <InfoRow label="User ID" value={<span className="font-mono text-[10px]">{job.userId}</span>} />
                </div>

                {/* Technical Info */}
                <div className="flex flex-col">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Technische Details</h4>
                    <InfoRow label="Modell" value={displayName} />
                    <InfoRow label="Model ID" value={<span className="font-mono text-[10px]">{modelName}</span>} />
                    <InfoRow label="Kosten" value={`${job.cost.toFixed(2)} €`} />
                    {job.apiCost && <InfoRow label="API-Kosten" value={`$${job.apiCost.toFixed(6)}`} />}
                </div>

                {/* Resources */}
                <div className="flex flex-col">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Ressourcen</h4>
                    <InfoRow label="Quellbild verwendet" value={job.requestPayload?.hasSourceImage ? "Ja" : "Nein"} />
                    <InfoRow label="Maske verwendet" value={job.requestPayload?.hasMask ? "Ja" : "Nein"} />
                    <InfoRow label="Referenzbilder" value={job.requestPayload?.referenceImagesCount || 0} />
                    {job.resultImage && (
                        <InfoRow label="Auflösung" value={`${job.resultImage.width} × ${job.resultImage.height} px`} />
                    )}
                </div>

                {/* Result Image */}
                {job.resultImage && (
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-content/${job.resultImage.storage_path}`}
                            alt="Result"
                            className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
