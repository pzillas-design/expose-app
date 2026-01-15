import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ChevronDown } from 'lucide-react';
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
            setLoading(isInitial ? false : loading);
            if (!isInitial) setLoadingMore(false);
        }
    }, [loading]);

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
                                        <th className="px-5 py-4 font-medium">Image</th>
                                        <th className="px-5 py-4 font-medium">{t('id_label')}</th>
                                        <th className="px-5 py-4 font-medium">{t('admin_job_user') || 'User'}</th>
                                        <th className="px-5 py-4 font-medium">{t('model')}</th>
                                        <th className="px-5 py-4 font-medium">{t('admin_job_status')}</th>
                                        <th className="px-5 py-4 font-medium text-right">{t('admin_job_api_cost')}</th>
                                        <th className="px-5 py-4 font-medium text-right">{t('admin_job_date')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                    {filteredJobs.map(j => (
                                        <tr
                                            key={j.id}
                                            onClick={() => setSelectedJob(j)}
                                            className={`cursor-pointer transition-colors ${selectedJob?.id === j.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                        >
                                            <td className="px-5 py-5">
                                                {j.resultImage?.storage_path ? (
                                                    <img
                                                        src={`https://nwxamngfnysostaefxif.supabase.co/storage/v1/object/public/user-content/${j.resultImage.storage_path}`}
                                                        alt="Generated"
                                                        className="w-12 h-12 object-cover rounded border border-zinc-200 dark:border-zinc-700"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">N/A</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-5 font-mono text-xs text-zinc-500">{j.id.slice(0, 8)}...</td>
                                            <td className="px-5 py-5 font-medium text-black dark:text-white">{j.userName}</td>
                                            <td className="px-5 py-5">
                                                {(() => {
                                                    const modelName = j.model || 'unknown';
                                                    let displayName = 'Nano Banana';
                                                    let badgeColor = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300';
                                                    let quality = 'Fast';

                                                    // Determine Quality & Base Name
                                                    if (modelName.includes('pro') || modelName.includes('3')) {
                                                        displayName = 'Nano Banana Pro';
                                                        quality = '1K'; // Default for Pro
                                                        badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';

                                                        if (modelName.includes('4k')) {
                                                            quality = '4K';
                                                            badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
                                                        } else if (modelName.includes('2k')) {
                                                            quality = '2K';
                                                            badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
                                                        } else if (modelName.includes('1k')) {
                                                            quality = '1K';
                                                            badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
                                                        }

                                                        // Fallback check dimensions if quality is still default 1K but might be higher
                                                        if (quality === '1K' && j.resultImage?.width) {
                                                            const maxDim = Math.max(j.resultImage.width, j.resultImage.height || 0);
                                                            if (maxDim > 3000) {
                                                                quality = '4K';
                                                                badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
                                                            } else if (maxDim > 1800) {
                                                                quality = '2K';
                                                                badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
                                                            }
                                                        }
                                                    } else {
                                                        // Non-pro / Fast
                                                        displayName = 'Nano Banana';
                                                        quality = 'Fast';
                                                        badgeColor = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700';
                                                    }

                                                    return (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                                            {displayName} • {quality}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-5 py-5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider 
                                                ${j.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                                        j.status?.toLowerCase() === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                                    {j.status?.toLowerCase() === 'completed' ? (t('admin_job_completed') || "Completed") :
                                                        j.status?.toLowerCase() === 'failed' ? (t('admin_job_failed') || "Failed") :
                                                            (t('admin_job_processing') || "Processing")}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5 text-right font-mono text-zinc-700 dark:text-zinc-300">
                                                <div className="flex flex-col items-end">
                                                    {j.apiCost !== undefined && j.apiCost !== null ? (
                                                        <span className="text-xs font-medium">
                                                            ${Number(j.apiCost).toFixed(6)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-zinc-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-5 text-right text-zinc-500 text-xs">
                                                {new Date(j.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
