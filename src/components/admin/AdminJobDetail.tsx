import React from 'react';
import { X } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { IconButton } from '@/components/ui/DesignSystem';

interface AdminJobDetailProps {
 job: any;
 onClose: () => void;
 t: TranslationFunction;
}

export const AdminJobDetail: React.FC<AdminJobDetailProps> = ({ job, onClose, t }) => {
 const qm = job.qualityMode || job.model || '';

 // Format quality mode: "nb2-2k" → "NB2 · 2K", "pro-4k" → "Pro · 4K"
 const formatModel = (m: string) => {
  if (!m || m === 'unknown') return '–';
  const isNb2 = m.startsWith('nb2') || m.includes('nano-banana-2');
  const isPro = !isNb2 && (m.includes('pro') || m.includes('nano-banana-pro'));
  const tier = isNb2 ? 'NB2' : isPro ? 'Pro' : m;
  const res = m.includes('4k') ? '4K' : m.includes('2k') ? '2K' : m.includes('1k') ? '1K' : null;
  return res ? `${tier} · ${res}` : tier;
 };

 const statusColor =
  job.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
  job.status === 'failed'    ? 'text-red-600 dark:text-red-400' :
                               'text-amber-600 dark:text-amber-400';

 const img = job.resultImage;
 const filename = img?.title || img?.base_name || null;
 const resW = img?.real_width || img?.width;
 const resH = img?.real_height || img?.height;

 const payload = job.requestPayload || {};
 const hasSource = !!payload.hasSourceImage;
 const hasMask   = !!payload.hasMask;
 const refCount  = payload.referenceImagesCount || 0;

 // Single flat table rows — only truthy values shown
 const rows: { label: string; value: React.ReactNode }[] = [
  { label: 'Status',        value: <span className={`font-semibold ${statusColor}`}>{job.status?.toUpperCase()}</span> },
  ...(job.error ? [{ label: 'Fehler', value: <span className="text-red-500 text-xs">{job.error}</span> }] : []),
  { label: t('admin_job_user'),  value: job.userName },
  { label: t('admin_job_date'),  value: new Date(job.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) },
  { label: t('model'),           value: formatModel(qm) },
  { label: t('admin_job_cost'),  value: `${(job.cost || 0).toFixed(2)} €` },
  ...(job.apiCost ? [{ label: t('admin_job_api_cost'), value: `$${job.apiCost.toFixed(6)}` }] : []),
  ...(resW && resH ? [{ label: t('resolution'), value: `${resW} × ${resH} px` }] : []),
  { label: 'Job ID',        value: <span className="font-mono text-[10px] text-zinc-400">{job.id}</span> },
 ];

 return (
  <div className="absolute top-0 bottom-0 right-0 w-[400px] bg-white dark:bg-black border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col animate-in slide-in-from-right duration-300">

   {/* Header */}
   <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
    <div className="flex flex-col gap-0.5">
     {filename
      ? <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[280px]">{filename}</span>
      : <span className="text-sm font-medium text-zinc-400">–</span>
     }
     <span className="text-[10px] font-mono text-zinc-400">{job.id}</span>
    </div>
    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
   </div>

   <div className="flex-1 overflow-y-auto">
    {/* Result image */}
    {img && (
     <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
      <a
       href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-content/${img.storage_path}`}
       target="_blank"
       rel="noopener noreferrer"
      >
       <img
        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-content/${img.storage_path}`}
        alt="Result"
        className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors cursor-pointer"
       />
      </a>
     </div>
    )}

    {/* Resource badges */}
    {(hasSource || hasMask || refCount > 0) && (
     <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1.5">
      {hasSource && (
       <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
        {t('admin_source_image')}
       </span>
      )}
      {hasMask && (
       <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
        Anmerkung
       </span>
      )}
      {refCount > 0 && (
       <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
        {refCount} {t('reference_images')}
       </span>
      )}
     </div>
    )}

    {/* Flat table */}
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
     {rows.map(({ label, value }) => (
      <div key={label} className="flex justify-between items-center px-5 py-3 text-sm">
       <span className="text-zinc-400 shrink-0 mr-4">{label}</span>
       <span className="text-zinc-900 dark:text-zinc-100 text-right">{value}</span>
      </div>
     ))}
    </div>

    {/* Prompt + Variables */}
    {job.promptPreview && (
     <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
      <div>
       <p className="text-[10px] font-medium text-zinc-400 mb-1.5">Prompt</p>
       <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{job.promptPreview}</p>
      </div>
      {(() => {
       const vars = payload.variables as Record<string, string[]> | undefined;
       if (!vars || Object.keys(vars).length === 0) return null;
       return (
        <div>
         <p className="text-[10px] font-medium text-zinc-400 mb-1.5">Variablen</p>
         <div className="flex flex-wrap gap-1.5">
          {Object.entries(vars).flatMap(([, vals]) =>
           (vals || []).map(v => (
            <span key={v} className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300">
             {v}
            </span>
           ))
          )}
         </div>
        </div>
       );
      })()}
     </div>
    )}
   </div>
  </div>
 );
};
