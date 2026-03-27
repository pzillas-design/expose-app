import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Button } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { AdminJobDetail } from './AdminJobDetail';
import { AdminViewHeader } from './AdminViewHeader';

interface AdminJobsViewProps {
    t: TranslationFunction;
}

const PAGE_SIZE = 50;

export const AdminJobsView: React.FC<AdminJobsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchJobs = useCallback(async (pageNum: number, isInitial: boolean = false) => {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);

        try {
            const data = await adminService.getJobs(pageNum, PAGE_SIZE);
            if (isInitial) {
                setJobs(data);
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

    const filteredJobs = jobs.filter(j =>
        (j.userName || '').toLowerCase().includes(search.toLowerCase()) ||
        (j.id || '').toLowerCase().includes(search.toLowerCase())
    );

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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
                            <div className="min-w-[960px] flex flex-col">
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
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-left">Auflösung</th>
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-left">Tools</th>
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-right">{t('admin_job_status')}</th>
                                                    <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-center">Download</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                                {filteredJobs.map(j => {
                                                    const payload = j.requestPayload || {};
                                                    const hasVars = payload.variables && Object.keys(payload.variables).length > 0;
                                                    const isMultiEdit = (payload.batchSize || 1) > 1 || !!payload.isMultiEdit;
                                                    const hasAnnotation = payload.hasMask || (!j.requestPayload && j.type === 'Edit');
                                                    const badgeClass = 'px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
                                                    return (
                                                    <tr
                                                        key={j.id}
                                                        onClick={() => setSelectedJob(j)}
                                                        className={`cursor-pointer transition-colors ${selectedJob?.id === j.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                                    >
                                                        <td className="px-5 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                                                            {new Date(j.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-5 py-3.5 font-medium text-black dark:text-white">{j.userName}</td>
                                                        <td className="px-5 py-3.5">
                                                            {(() => {
                                                                const m = j.qualityMode || j.model || '';
                                                                const res = m.includes('4k') ? '4K' : m.includes('2k') ? '2K' : m.includes('1k') ? '1K' : '–';
                                                                const color = res === '4K'
                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                                    : res === '2K'
                                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                                                    : res === '1K'
                                                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300';
                                                                return (
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color}`}>
                                                                        {res}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-1">
                                                                {isMultiEdit && <span className={badgeClass}>Multi Edit</span>}
                                                                {hasAnnotation && <span className={badgeClass}>Anmerkung</span>}
                                                                {hasVars      && <span className={badgeClass}>Variablen</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            {j.status?.toLowerCase() === 'completed'
                                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                                                                : j.status?.toLowerCase() === 'failed'
                                                                ? <span title={j.error || 'Failed'} className="ml-auto flex justify-end"><XCircle className="w-4 h-4 text-red-500" /></span>
                                                                : <Clock className="w-4 h-4 text-amber-500 ml-auto" />}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            {j.downloadedAt && <Download className="w-3.5 h-3.5 text-zinc-400 mx-auto" />}
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

                        <div className="hidden md:flex w-[400px] lg:w-[440px] xl:w-[480px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
                            {selectedJob ? (
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
