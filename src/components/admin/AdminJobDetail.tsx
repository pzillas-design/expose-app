import React from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { IconButton } from '@/components/ui/DesignSystem';

interface AdminJobDetailProps {
 job: any;
 onClose: () => void;
 t: TranslationFunction;
 variant?: 'sidebar' | 'page';
}

export const AdminJobDetail: React.FC<AdminJobDetailProps> = ({ job, onClose, t, variant = 'sidebar' }) => {
 const qm = job.qualityMode || job.model || '';

 // Format quality mode: "nb2-2k" → "NB2 · 2K", "pro-4k" → "Pro · 4K"
 const formatModel = (m: string) => {
  if (!m || m === 'unknown') return '–';
  const value = m.toLowerCase();
  const isNb2 =
   value.startsWith('nb2') ||
   value.includes('nano-banana-2') ||
   value.includes('gemini-3.1-flash-image-preview');
  const isPro =
   !isNb2 &&
   (value.includes('pro') ||
    value.includes('nano-banana-pro') ||
    value.includes('gemini-3-pro-image-preview'));
  const tier = isNb2 ? 'NB2' : isPro ? 'Pro' : m;
  const res = value.includes('4k') ? '4K' : value.includes('2k') ? '2K' : value.includes('1k') ? '1K' : null;
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
 const webhookData = job.webhookData || {};
 const hasSource = job.hasSourceImage ?? !!payload.hasSourceImage;
 const hasMask   = job.hasMask ?? !!payload.hasMask;
 const refCount  = job.referenceCount ?? payload.referenceImagesCount ?? 0;
 const imageSize = job.imageSize || (qm.includes('4k') ? '4K' : qm.includes('2k') ? '2K' : qm.includes('1k') ? '1K' : null);
 const requestType = job.requestType || (hasSource ? 'edit' : 'create');
 const rawModel = job.model || '';
 const lowerModel = rawModel.toLowerCase();
 const kieProvider: string | null = typeof payload.provider === 'string' && payload.provider.startsWith('kie')
  ? payload.provider
  : null;
 const provider = kieProvider
  ? kieProvider
  : lowerModel.includes('gemini') || lowerModel.includes('nb2') || lowerModel.includes('nano-banana')
   ? 'google'
   : 'legacy';
 const kieProviderLabel = kieProvider === 'kie_primary'
  ? 'Kie.ai (Primary)'
  : kieProvider === 'kie_fallback'
  ? 'Kie.ai (Fallback)'
  : kieProvider
  ? `Kie.ai (${kieProvider})`
  : null;
 const providerModelVersion = payload.providerModelVersion || img?.model_version || rawModel || '–';
 const generationConfig = payload.generationConfig || {};
 const imageConfig = generationConfig.imageConfig || {};
 const responseModalities = payload.responseModalities || generationConfig.responseModalities || null;
 const aspectRatioRequested = payload.aspectRatioRequested || imageConfig.aspectRatio || null;
 const toolsEnabled = Array.isArray(payload.tools)
  ? payload.tools.map((tool: any) => Object.keys(tool || {})).flat().filter(Boolean)
  : [];
 const groundingUsed = !!payload.groundingConfig || toolsEnabled.includes('google_search');
 const usageMetadata = job.tokensPrompt != null || job.tokensCompletion != null || job.tokensTotal != null
  ? {
    prompt: job.tokensPrompt || 0,
    completion: job.tokensCompletion || 0,
    total: job.tokensTotal || 0
   }
  : null;

 const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '–';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '–';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
 };

 const providerRows: { label: string; value: React.ReactNode }[] = [
  { label: 'Provider', value: kieProviderLabel
   ? <span className="font-semibold text-violet-500">{kieProviderLabel}</span>
   : provider },
  { label: 'Provider Model', value: formatValue(rawModel) },
  { label: 'Provider Model Version', value: formatValue(providerModelVersion) },
  { label: 'Provider Response ID', value: formatValue(webhookData.providerResponseId || payload.responseId) },
  { label: 'Finish Reason', value: formatValue(webhookData.finishReason || payload.finishReason) },
  { label: 'Finish Message', value: formatValue(webhookData.finishMessage || payload.finishMessage) },
  { label: 'Prompt Block Reason', value: formatValue(webhookData.promptBlockReason || payload.promptBlockReason) },
  { label: 'Prompt Safety Ratings', value: formatValue(webhookData.promptSafetyRatings || payload.promptSafetyRatings) },
  { label: 'Candidate Safety Ratings', value: formatValue(webhookData.candidateSafetyRatings || payload.candidateSafetyRatings) },
  { label: 'Usage Metadata', value: formatValue(webhookData.usageMetadata || usageMetadata) },
  { label: 'Response Modalities', value: formatValue(responseModalities) },
  { label: 'Aspect Ratio Requested', value: formatValue(aspectRatioRequested) },
  { label: 'Image Size', value: formatValue(imageSize) },
  { label: 'Reference Count', value: formatValue(refCount) },
  { label: 'Has Source Image', value: formatValue(hasSource) },
  { label: 'Has Mask', value: formatValue(hasMask) },
  { label: 'Tools Enabled', value: formatValue(toolsEnabled) },
  { label: 'Grounding Used', value: formatValue(groundingUsed) },
  ...(payload.providerLatencyMs ? [{ label: 'Provider Latency', value: `${Math.round(payload.providerLatencyMs / 1000)}s` }] : []),
  ...(payload.storageLatencyMs ? [{ label: 'Storage Latency', value: `${Math.round(payload.storageLatencyMs / 1000)}s` }] : []),
  ...(payload.saveStage ? [{ label: 'Save Stage', value: formatValue(payload.saveStage) }] : []),
  ...(payload.current_stage ? [{ label: 'Last Known Stage', value: <span className="font-mono text-yellow-500">{payload.current_stage}</span> }] : []),
  ...(payload.stage_updated_at ? [{ label: 'Stage Updated At', value: new Date(payload.stage_updated_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'medium' }) }] : []),
 ];

 // Single flat table rows — only truthy values shown
 const rows: { label: string; value: React.ReactNode }[] = [
  { label: 'Status',        value: <span className={`font-semibold ${statusColor}`}>{job.status?.toUpperCase()}</span> },
  ...(job.error ? [{ label: 'Fehler', value: <span className="text-red-500 text-xs">{job.error}</span> }] : []),
  { label: t('admin_job_user'),  value: job.userName },
  ...(job.userEmail ? [{ label: 'E-Mail', value: <span className="text-zinc-500 dark:text-zinc-400">{job.userEmail}</span> }] : []),
  { label: t('admin_job_date'),  value: new Date(job.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) },
  { label: t('model'),           value: formatModel(qm) },
  { label: t('admin_job_cost'),  value: `${(job.cost || 0).toFixed(2)} €` },
  ...(requestType ? [{ label: 'Typ', value: requestType === 'edit' ? 'Edit' : 'Create' }] : []),
  ...(imageSize ? [{ label: 'Bildgröße', value: imageSize }] : []),
  ...(job.durationMs ? [{ label: 'Dauer', value: `${Math.round(job.durationMs / 1000)}s` }] : []),
  ...(job.apiCost ? [{ label: t('admin_job_api_cost'), value: `$${job.apiCost.toFixed(6)}` }] : []),
  ...(resW && resH ? [{ label: t('resolution'), value: `${resW} × ${resH} px` }] : []),
  { label: 'Job ID',        value: <span className="font-mono text-[10px] text-zinc-400">{job.id}</span> },
 ];

 return (
  <div
   className={
    variant === 'page'
     ? "w-full min-h-[100dvh] bg-white dark:bg-black flex flex-col"
     : "w-full h-full bg-white dark:bg-black flex flex-col"
   }
  >

   {/* Header */}
   <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
    <div className="flex flex-col gap-0.5">
     {filename
      ? <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[280px]">{filename}</span>
      : <span className="text-sm font-medium text-zinc-400">–</span>
     }
     <span className="text-[10px] font-mono text-zinc-400">{job.id}</span>
    </div>
    <IconButton icon={variant === 'page' ? <ChevronLeft className="w-5 h-5" /> : <X className="w-5 h-5" />} onClick={onClose} />
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

    {/* Prompt + Variables */}
    {job.promptPreview && (
     <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
      <div>
       <p className="text-[10px] font-medium text-zinc-400 mb-1.5">Prompt</p>
       <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{job.promptPreview}</p>
      </div>
      {(() => {
       const vars = (webhookData.variableValues || payload.variableValues || payload.variables) as Record<string, any> | undefined;
       if (!vars || Object.keys(vars).length === 0) return null;
       return (
        <div>
         <p className="text-[10px] font-medium text-zinc-400 mb-1.5">Variablen</p>
         <div className="flex flex-col gap-1">
          {Object.entries(vars).map(([key, val]) => (
           <div key={key} className="flex items-baseline gap-2">
            <span className="text-[10px] text-zinc-400 shrink-0">{key}</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300">
             {Array.isArray(val) ? val.join(', ') : String(val ?? '–')}
            </span>
           </div>
          ))}
         </div>
        </div>
       );
      })()}
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
      {(() => {
       const refs: { src?: string; instruction?: string }[] = payload.references || [];
       const instructions = refs.map(r => r.instruction).filter(Boolean);
       if (!instructions.length) return null;
       return instructions.map((instr, i) => (
        <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-[11px] text-blue-700 dark:text-blue-300 max-w-full truncate" title={instr}>
         {instr}
        </span>
       ));
      })()}
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

    <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800">
     <p className="text-[10px] font-medium text-zinc-400 mb-2">Google / Provider</p>
     <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {providerRows.map(({ label, value }) => (
       <div key={label} className="flex justify-between items-center py-2.5 text-xs">
        <span className="text-zinc-400 shrink-0 mr-4">{label}</span>
        <span className="text-zinc-900 dark:text-zinc-100 text-right break-all">{value}</span>
       </div>
      ))}
     </div>
    </div>

   </div>
  </div>
 );
};
