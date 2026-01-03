import React, { useState, useEffect } from 'react';
import { Loader2, Coins, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';

interface AdminStatsViewProps {
    t: TranslationFunction;
}

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const jobsData = await adminService.getJobs();
            setJobs(jobsData);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = React.useMemo(() => {
        const completedJobs = jobs.filter(j => j.status === 'completed');
        const totalTokens = completedJobs.reduce((acc, j) => acc + (j.tokensTotal || 0), 0);
        const totalApiCost = completedJobs.reduce((acc, j) => acc + (j.apiCost || 0), 0);
        const totalUserCredits = completedJobs.reduce((acc, j) => acc + (j.cost || 0), 0);

        return {
            totalJobs: jobs.length,
            completedJobs: completedJobs.length,
            totalTokens,
            totalApiCost,
            totalUserCredits,
            averageCostPerJob: completedJobs.length > 0 ? totalApiCost / completedJobs.length : 0
        };
    }, [jobs]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50 space-y-6 overflow-y-auto">
            <h2 className={Typo.H1}>Token & Kosten Analyse</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Gesamtverbrauch"
                    value={`${stats.totalTokens.toLocaleString()} tokens`}
                    icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
                />
                <StatCard
                    title="Google API Kosten"
                    value={`$${stats.totalApiCost.toFixed(4)}`}
                    icon={<DollarSign className="w-5 h-5 text-red-500" />}
                    desc="Echtzeit Schätzung"
                />
                <StatCard
                    title="User Einnahmen"
                    value={`${stats.totalUserCredits.toFixed(2)} €`}
                    icon={<Coins className="w-5 h-5 text-emerald-500" />}
                    desc="Abgebuchte Credits"
                />
                <StatCard
                    title="Marge"
                    value={`${stats.totalUserCredits > 0 ? (((stats.totalUserCredits * 1.05 - stats.totalApiCost) / (stats.totalUserCredits * 1.05)) * 100).toFixed(1) : 0}%`}
                    icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
                    desc="Geschätzte Profitabilität"
                />
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <h3 className={`${Typo.H2} mb-4`}>Verbrauch nach Modell</h3>
                <div className="space-y-3">
                    {['gemini-3-flash-preview', 'gemini-3-pro-preview', 'fast', 'pro-1k', 'pro-2k', 'pro-4k'].map(modelId => {
                        const modelJobs = jobs.filter(j => j.model === modelId);
                        if (modelJobs.length === 0) return null;

                        const tokens = modelJobs.reduce((acc, j) => acc + (j.tokensTotal || 0), 0);
                        const apiCost = modelJobs.reduce((acc, j) => acc + (j.apiCost || 0), 0);
                        const userCost = modelJobs.reduce((acc, j) => acc + (j.cost || 0), 0);

                        return (
                            <div key={modelId} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                <div>
                                    <div className="font-bold text-sm uppercase tracking-tight">{modelId.replace('-preview', '').replace('gemini-3-', 'Banana ')}</div>
                                    <div className="text-[10px] text-zinc-500 font-medium">{modelJobs.length} Generations</div>
                                </div>
                                <div className="flex gap-8 text-right">
                                    <div>
                                        <div className="text-[10px] text-zinc-400 uppercase">Tokens</div>
                                        <div className="font-mono text-xs">{tokens.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-400 uppercase">Echtkosten</div>
                                        <div className="font-mono text-xs text-red-500">${apiCost.toFixed(4)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-400 uppercase">Credits</div>
                                        <div className="font-mono text-xs text-emerald-500">{userCost.toFixed(2)} €</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hint */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                <strong>Hintergrund:</strong> Die API-Kosten werden live auf Basis der von Google zurückgegebenen Tokens berechnet.
                Die Schätzung nutzt die aktuellen Raten für Gemini 3 Flash ($0.10/1M input) und Gemini 3 Pro ($1.25/1M input).
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, desc }: { title: string, value: string, icon: React.ReactNode, desc?: string }) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{title}</span>
            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                {icon}
            </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        {desc && <div className="text-[10px] text-zinc-500 italic">{desc}</div>}
    </div>
);
