import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ChevronDown, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo, Input, Button } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { AdminJobDetail } from './AdminJobDetail';

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
            <div className="p-8 pb-6 flex items-center justify-between shrink-0">
                <div>
                    <h2 className={Typo.H1}>{t('admin_jobs')}</h2>
                    <p className={Typo.Micro}>{t('admin_jobs_desc')}</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                        className="pl-9 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-none"
                        placeholder={t('search')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
                <div className="min-w-[900px] flex flex-col">
                    {loading && jobs.length === 0 ? (
                        <div className="py-20 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 sticky top-0 z-20">
                                    <tr>
                                        <th className="px-5 py-4 font-medium">{t('id_label')}</th>
                                        <th className="px-5 py-4 font-medium">{t('admin_job_user') || 'User'}</th>
                                        <th className="px-5 py-4 font-medium">{t('model')}</th>
                                        <th className="px-5 py-4 font-medium text-right">{t('admin_job_api_cost')}</th>
                                        <th className="px-5 py-4 font-medium text-right">{t('admin_job_date')}</th>
                                        <th className="px-5 py-4 font-medium text-right">{t('admin_job_status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                    {filteredJobs.map(j => (
                                        <tr
                                            key={j.id}
                                            onClick={() => setSelectedJob(j)}
                                            className={`cursor-pointer transition-colors ${selectedJob?.id === j.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                        >
                                            <td className="px-5 py-5 font-mono text-xs text-zinc-500">{j.id.slice(0, 8)}...</td>
                                            <td className="px-5 py-5 font-medium text-black dark:text-white">{j.userName}</td>
                                            <td className="px-5 py-5">
                                                {(() => {
                                                    const m = j.model || 'unknown';
                                                    const isNb2 = m.startsWith('nb2');
                                                    const isPro = m.includes('pro');
                                                    const displayName = isNb2 ? 'NB2' : isPro ? 'Nano Banana Pro' : 'Nano Banana';
                                                    const quality = m.includes('4k') ? '4K' : m.includes('2k') ? '2K' : m.includes('1k') ? '1K' : 'Fast';
                                                    const badgeColor = quality === 'Fast'
                                                        ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                                                        : quality === '1K' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : quality === '2K' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
                                                    return (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                                            {displayName} • {quality}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-5 py-5 text-right font-mono text-zinc-700 dark:text-zinc-300 text-xs">
                                                {j.apiCost ? `$${Number(j.apiCost).toFixed(6)}` : <span className="text-zinc-400">—</span>}
                                            </td>
                                            <td className="px-5 py-5 text-right text-zinc-500 text-xs">
                                                {new Date(j.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-5 py-5 text-right">
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
