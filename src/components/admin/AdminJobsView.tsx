import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Button } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { AdminJobDetail } from './AdminJobDetail';
import { VoiceSessionDetail } from './VoiceSessionDetail';
import { AdminViewHeader } from './AdminViewHeader';
import { useMobile } from '@/hooks/useMobile';

interface AdminJobsViewProps {
    t: TranslationFunction;
}

const PAGE_SIZE = 50;

export const AdminJobsView: React.FC<AdminJobsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [voiceSessions, setVoiceSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedJob, setSelectedJob] = useState<any | null>(null);

    const handleSelectJob = useCallback(async (job: any) => {
        if (job._type === 'voice') { setSelectedJob(job); return; }
        setSelectedJob(job);
        // Lazy-load heavy JSONB fields only when opening detail
        if (!job.requestPayload && !job.webhookData) {
            const detail = await adminService.getJobDetail(job.id);
            if (detail) setSelectedJob(prev => prev?.id === job.id ? { ...prev, ...detail } : prev);
        }
    }, []);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const isMobile = useMobile();
    const [sidebarWidth, setSidebarWidth] = useState(440);
    const [isResizing, setIsResizing] = useState(false);

    const fetchJobs = useCallback(async (pageNum: number, isInitial: boolean = false) => {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);

        try {
            const [data, sessions] = await Promise.all([
                adminService.getJobs(pageNum, PAGE_SIZE),
                isInitial ? adminService.getVoiceSessions(30) : Promise.resolve([]),
            ]);
            if (isInitial) {
                setJobs(data);
                setVoiceSessions(sessions);
            } else {
                setJobs(prev => [...prev, ...data]);
            }
            setHasMore(data.length === PAGE_SIZE);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs(1, true);
    }, []);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchJobs(nextPage, false);
    };

    // Merge generation jobs + voice sessions into one sorted list
    const allRows = React.useMemo(() => {
        const genRows = jobs.map(j => ({ ...j, _type: 'job' as const }));
        const voiceRows = voiceSessions;
        const merged = [...genRows, ...voiceRows].sort((a, b) => b.createdAt - a.createdAt);
        if (!search) return merged;
        const q = search.toLowerCase();
        return merged.filter(r =>
            (r.userName || '').toLowerCase().includes(q) ||
            (r.id || '').toLowerCase().includes(q) ||
            (r.firstUserMessage || '').toLowerCase().includes(q)
        );
    }, [jobs, voiceSessions, search]);

    const maxDurationMs = 100_000; // fixed 100s cap for duration bar

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            const clampedWidth = Math.min(Math.max(newWidth, 340), 720);
            setSidebarWidth(clampedWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    return (
        <div className="relative flex flex-col flex-1 min-h-0">
            {!isMobile || !selectedJob ? (
                <>
                    <AdminViewHeader
                        title={t('admin_jobs')}
                        search={{ value: search, onChange: setSearch, placeholder: t('search') }}
                    />

                    <div className="flex flex-1 min-h-0">
                        <div className="flex-1 min-w-0 overflow-x-auto">
                            <div className="min-w-[760px] flex flex-col">
                                {loading && jobs.length === 0 ? (
                                    <div className="py-20 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                                    </div>
                                ) : (
                                    <>
                                        <table className="w-full text-left text-sm">
                                            <thead className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/60">
                                                <tr>
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-left">{t('admin_job_date')}</th>
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-left">{t('admin_job_user') || 'User'}</th>
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-left">Details</th>
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-left w-40">Dauer</th>
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-right">{t('admin_job_status')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                                {allRows.map(row => {
                                                    const isVoice = row._type === 'voice';
                                                    const isSelected = selectedJob?.id === row.id;
                                                    const badgeClass = 'px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';

                                                    // Shared duration cell renderer
                                                    const durationMs = Number(row.durationMs || 0);
                                                    const dSec = Math.round(durationMs / 1000);
                                                    const dLabel = dSec < 60 ? `${dSec}s` : `${Math.floor(dSec / 60)}m ${dSec % 60}s`;
                                                    const barPct = Math.min(100, (durationMs / maxDurationMs) * 100);

                                                    if (isVoice) {
                                                        return (
                                                            <tr
                                                                key={row.id}
                                                                onClick={() => handleSelectJob(row)}
                                                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                                            >
                                                                <td className="px-5 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                                                                    {new Date(row.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                                <td className="px-5 py-3.5 font-medium text-black dark:text-white">{row.userName}</td>
                                                                <td className="px-5 py-3.5">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className={badgeClass}>Voice</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-3.5">
                                                                    <div className="flex flex-col items-start gap-1">
                                                                        <span className="font-mono text-xs text-zinc-500">{dLabel}</span>
                                                                        <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                                            <div className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ width: `${barPct}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-3.5 text-right">
                                                                    {row.status === 'failed'
                                                                        ? <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                                                                        : (row.hadGeneration || row.cleanExit)
                                                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                                                                        : null}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    // Generation job row
                                                    const j = row;
                                                    const payload = j.requestPayload || {};
                                                    const hasVars = payload.variables && Object.keys(payload.variables).length > 0;
                                                    const isMultiEdit = (payload.batchSize || 1) > 1 || !!payload.isMultiEdit;
                                                    const hasAnnotation = j.hasMask || j.type === 'Edit';
                                                    const isRepeat = !!payload.isRepeat;

                                                    // Resolution badge
                                                    const m = j.qualityMode || j.model || '';
                                                    const res = m.includes('4k') ? '4K' : m.includes('2k') ? '2K' : m.includes('1k') ? '1K' : m.includes('05k') ? '0.5K' : '';
                                                    const resColor = res === '4K' ? 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                                        : res === '2K' ? 'bg-orange-200 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                                                        : res === '1K' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                                        : res === '0.5K' ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-300'
                                                        : '';

                                                    return (
                                                    <tr
                                                        key={j.id}
                                                        onClick={() => handleSelectJob(j)}
                                                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                                    >
                                                        <td className="px-5 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                                                            {new Date(j.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-5 py-3.5 font-medium text-black dark:text-white">{j.userName}</td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {res && <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${resColor}`}>{res}</span>}
                                                                {isMultiEdit && <span className={badgeClass}>Multi Edit</span>}
                                                                {hasAnnotation && <span className={badgeClass}>Anmerkung</span>}
                                                                {hasVars      && <span className={badgeClass}>Variablen</span>}
                                                                {isRepeat     && <span className={badgeClass}>Mehr</span>}
                                                                {j.downloadedAt && <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0 mx-1" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {j.durationMs ? (
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <span className="font-mono text-xs text-zinc-500">{dLabel}</span>
                                                                    <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                                        <div className="h-full rounded-full bg-zinc-500 dark:bg-zinc-400" style={{ width: `${barPct}%` }} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-zinc-400">–</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            {j.status?.toLowerCase() === 'completed'
                                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                                                                : j.status?.toLowerCase() === 'failed'
                                                                ? <span title={j.error || 'Failed'} className="ml-auto flex justify-end"><XCircle className="w-4 h-4 text-red-500" /></span>
                                                                : <Clock className="w-4 h-4 text-amber-500 ml-auto" />}
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {hasMore && (
                                            <div className="p-8 flex justify-center border-t border-zinc-100 dark:border-zinc-800">
                                                <Button
                                                    onClick={handleLoadMore}
                                                    disabled={loadingMore}
                                                    variant="secondary"
                                                    className="gap-2"
                                                >
                                                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                                                    {t('load_more')}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div
                            className={`hidden md:flex relative shrink-0 self-start sticky top-14 h-[calc(100dvh-56px)] overflow-hidden border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black ${isResizing ? 'select-none' : 'transition-[width] duration-200 ease-out'}`}
                            style={{ width: `${sidebarWidth}px` }}
                        >
                            <div
                                onMouseDown={() => setIsResizing(true)}
                                className="absolute left-0 top-0 bottom-0 w-1.5 -translate-x-1/2 cursor-col-resize z-20 group"
                            >
                                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-transparent group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700" />
                            </div>
                            {selectedJob?._type === 'voice' ? (
                                <VoiceSessionDetail
                                    session={selectedJob}
                                    onClose={() => setSelectedJob(null)}
                                    variant="sidebar"
                                />
                            ) : selectedJob ? (
                                <AdminJobDetail
                                    job={selectedJob}
                                    onClose={() => setSelectedJob(null)}
                                    t={t}
                                    variant="sidebar"
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Nichts ausgewählt</p>
                                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                                        Wähle links einen Auftrag aus, um Details, Prompt und Provider-Daten zu sehen.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : selectedJob?._type === 'voice' ? (
                <VoiceSessionDetail
                    session={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    variant="page"
                />
            ) : (
                <AdminJobDetail
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    t={t}
                    variant="page"
                />
            )}
        </div>
    );
};
