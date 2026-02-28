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
 <div className="absolute top-0 bottom-0 right-0 w-[400px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col animate-in slide-in-from-right duration-300">
 {/* Header */}
 <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
 <div className="flex flex-col">
 <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t('admin_job_details')}</span>
 <span className="text-[10px] font-mono text-zinc-400 mt-0.5">{job.id}</span>
 </div>
 <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
 </div>

 <div className="flex-1 overflow-y-auto">
 {/* Result Image - Top Priority */}
 {job.resultImage && (
 <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
 <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Generated Image</h4>
 <a
 href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-content/${job.resultImage.storage_path}`}
 target="_blank"
 rel="noopener noreferrer"
 className="block group"
 >
 <img
 src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-content/${job.resultImage.storage_path}`}
 alt="Result"
 className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 transition-colors cursor-pointer"
 />
 </a>
 <p className="text-xs text-zinc-400 mt-2 text-center">Click to open in new tab</p>
 </div>
 )}

 <div className="p-6 space-y-8">
 {/* Basic Info */}
 <div className="flex flex-col">
 <InfoRow
 label={t('admin_job_status')}
 value={job.status?.toUpperCase()}
 color={statusColor}
 />
 <InfoRow
 label={t('admin_job_type')}
 value={job.type === 'Edit' || job.type === 'Inpaint' ? t('admin_job_edit') : t('admin_job_create')}
 />
 <InfoRow
 label={t('admin_job_date')}
 value={new Date(job.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
 />
 </div>

 {/* User Info */}
 <div className="flex flex-col">
 <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{t('admin_job_user')}</h4>
 <InfoRow label={t('admin_user_email')} value={job.userName} />
 <InfoRow label={t('id_label')} value={<span className="font-mono text-[10px]">{job.userId}</span>} />
 </div>

 {/* Technical Info */}
 <div className="flex flex-col">
 <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{t('admin_technical_details')}</h4>
 <InfoRow label={t('model')} value={displayName} />
 <InfoRow label={t('id_label')} value={<span className="font-mono text-[10px]">{modelName}</span>} />
 <InfoRow label={t('admin_job_cost')} value={`${job.cost.toFixed(2)} €`} />
 {job.apiCost && <InfoRow label={t('admin_job_api_cost')} value={`$${job.apiCost.toFixed(6)}`} />}
 </div>

 {/* Resources */}
 <div className="flex flex-col">
 <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{t('admin_resources_used')}</h4>
 <InfoRow label={t('admin_source_image')} value={job.requestPayload?.hasSourceImage ? t('yes') : t('no')} />
 <InfoRow label={t('admin_mask')} value={job.requestPayload?.hasMask ? t('yes') : t('no')} />
 <InfoRow label={t('reference_images')} value={job.requestPayload?.referenceImagesCount || 0} />
 {job.resultImage && (
 <InfoRow label={t('resolution')} value={`${job.resultImage.width} × ${job.resultImage.height} px`} />
 )}
 </div>
 </div>
 </div>
 </div>
 );
};
