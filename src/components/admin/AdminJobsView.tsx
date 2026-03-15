import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, CheckCircle2, XCircle, Clock } from 'lucide-react';
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

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <AdminViewHeader
                title={t('admin_jobs')}
                search={{ value: search, onChange: setSearch, placeholder: t('search') }}
            />

            <div className="flex-1 min-h-0 overflow-auto">
                <div className="min-w-[900px] flex flex-col">
                    {loading && jobs.length === 0 ? (
                        <div className="py-20 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/60">
                                    <tr>
                                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">{t('id_label')}</th>
                                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">{t('admin_job_user') || 'User'}</th>
                                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">{t('model')}</th>
                                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">Auflösung</th>
                                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">{t('admin_job_date')}</th>
                                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">{t('admin_job_status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                    {filteredJobs.map(j => (
                                        <tr
                                            key={j.id}
                                            onClick={() => setSelectedJob(j)}
                                            className={`cursor-pointer transition-colors ${selectedJob?.id === j.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                        >
                                            <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">{j.id.slice(0, 8)}...</td>
                                            <td className="px-5 py-3.5 font-medium text-black dark:text-white">{j.userName}</td>
                                            <td className="px-5 py-3.5">
                                                {(() => {
                                                    const m = j.model || 'unknown';
                                                    const isNb2 = m.startsWith('nb2') || m.includes('nano-banana-2');
                                                    const isPro = !isNb2 && (m.includes('pro') || m.includes('nano-banana-pro'));
                                                    const displayName = isNb2 ? 'NB2' : isPro ? 'NB Pro' : 'Legacy';
                                                    const color = isNb2
                                                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                                        : isPro
                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300';
                                                    return (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color}`}>
                                                            {displayName}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {(() => {
                                                    const m = j.model || '';
                                                    const res = m.includes('4k') ? '4K' : m.includes('2k') ? '2K' : m.includes('1k') ? '1K' : 'Fast';
                                                    const color = res === 'Fast' ? 'text-zinc-400' : res === '1K' ? 'text-emerald-500' : res === '2K' ? 'text-purple-500' : 'text-rose-500';
                                                    return <span className={`text-[11px] font-bold uppercase ${color}`}>{res}</span>;
                                                })()}
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-zinc-500 text-xs">
                                                {new Date(j.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {j.status?.toLowerCase() === 'completed'
                                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                                                    : j.status?.toLowerCase() === 'failed'
                                                    ? <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                                                    : <Clock className="w-4 h-4 text-amber-500 ml-auto" />}
                                            </td>
                                        </tr>
                                    ))}
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

            {selectedJob && (
                <AdminJobDetail
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    t={t}
                />
            )}
        </div>
    );
};
