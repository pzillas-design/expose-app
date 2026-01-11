import React, { useState, useEffect } from 'react';
import { Loader2, Coins, BarChart3, TrendingUp, DollarSign, Activity, RefreshCw, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { supabase } from '@/services/supabaseClient';

interface AdminStatsViewProps {
    t: TranslationFunction;
}

const DEFAULT_USD_TO_EUR = 0.92;

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pricing, setPricing] = useState<any[]>([]);
    const [syncingPricing, setSyncingPricing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [isPricingExpanded, setIsPricingExpanded] = useState(false);
    const [exchangeRate, setExchangeRate] = useState({
        rate: DEFAULT_USD_TO_EUR,
        lastUpdated: null as string | null
    });

    useEffect(() => {
        fetchData();
        fetchPricing();
        fetchExchangeRate();
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

    const fetchPricing = async () => {
        try {
            const { data, error } = await supabase
                .from('api_pricing')
                .select('*')
                .order('model_name');

            if (error) throw error;
            setPricing(data || []);
        } catch (error) {
            console.error('Failed to fetch pricing:', error);
        }
    };

    const fetchExchangeRate = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'currency_rates')
                .maybeSingle();

            if (error) throw error;
            if (data?.value) {
                setExchangeRate({
                    rate: data.value.usd_to_eur || DEFAULT_USD_TO_EUR,
                    lastUpdated: data.value.last_updated
                });
            }
        } catch (error) {
            console.error('Failed to fetch exchange rate:', error);
        }
    };

    const handleSyncPricing = async () => {
        setSyncingPricing(true);
        setSyncError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await supabase.functions.invoke('sync-pricing', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (response.error) throw response.error;

            // Refresh both pricing and exchange rate
            await Promise.all([
                fetchPricing(),
                fetchExchangeRate()
            ]);
        } catch (error: any) {
            console.error('Failed to sync pricing:', error);
            setSyncError(error.message || 'Sync failed');
        } finally {
            setSyncingPricing(false);
        }
    };

    const stats = React.useMemo(() => {
        const completedJobs = jobs.filter(j => j.status === 'completed');
        const revenue = completedJobs.reduce((acc, j) => acc + (j.cost || 0), 0);
        const apiCostUsd = completedJobs.reduce((acc, j) => acc + (j.apiCost || 0), 0);
        const apiCostEur = apiCostUsd * exchangeRate.rate;
        const profit = revenue - apiCostEur;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
            revenue,
            apiCostUsd,
            profit,
            margin,
            totalJobs: completedJobs.length,
            totalTokens: completedJobs.reduce((acc, j) => acc + (j.tokensTotal || 0), 0)
        };
    }, [jobs, exchangeRate.rate]);

    const tierStats = React.useMemo(() => {
        const TIERS = [
            { id: 'fast', name: 'Nano Banana', cost: 0.0, color: 'text-zinc-500' },
            { id: 'pro-1k', name: 'Pro 1K', cost: 0.1, color: 'text-indigo-500' },
            { id: 'pro-2k', name: 'Pro 2K', cost: 0.25, color: 'text-purple-500' },
            { id: 'pro-4k', name: 'Pro 4K', cost: 0.5, color: 'text-pink-500' }
        ];

        return TIERS.map(tier => {
            const tierJobs = jobs.filter(j => {
                if (j.status !== 'completed') return false;
                if (tier.id === 'fast') {
                    return (j.model === 'gemini-2.5-flash-image' || j.model === 'fast');
                } else {
                    return (j.model === 'gemini-3-pro-image-preview' || j.model?.startsWith('pro-')) &&
                        Math.abs((j.cost || 0) - tier.cost) < 0.01;
                }
            });

            const revenue = tierJobs.reduce((acc, j) => acc + (j.cost || 0), 0);
            const apiCostUsd = tierJobs.reduce((acc, j) => acc + (j.apiCost || 0), 0);
            const apiCostEur = apiCostUsd * exchangeRate.rate;
            const profit = revenue - apiCostEur;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

            return {
                ...tier,
                count: tierJobs.length,
                tokens: tierJobs.reduce((acc, j) => acc + (j.tokensTotal || 0), 0),
                revenue,
                apiCostUsd,
                profit,
                margin
            };
        });
    }, [jobs, exchangeRate.rate]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="p-8 flex-1 min-h-0 space-y-8 overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={Typo.H1}>Kosten & Performance</h2>
                    <p className="text-xs text-zinc-500 font-medium">Finanz-Dashboard auf Basis echter Gemini-Tokens</p>
                </div>
                <div className="flex gap-2">
                    <div className="hidden md:flex flex-col items-end justify-center mr-2">
                        <span className="text-[9px] uppercase font-bold text-zinc-400">USD/EUR Kurs</span>
                        <span className="text-[10px] font-mono font-bold text-blue-500">1.00$ = {exchangeRate.rate.toFixed(4)}€</span>
                    </div>
                    <button
                        onClick={() => setIsPricingExpanded(!isPricingExpanded)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                        {isPricingExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        API Tarife
                    </button>
                    <button
                        onClick={handleSyncPricing}
                        disabled={syncingPricing}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3 h-3 ${syncingPricing ? 'animate-spin' : ''}`} />
                        Sync
                    </button>
                </div>
            </div>

            {/* API Pricing Section (Collapsible) */}
            {isPricingExpanded && (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 animate-in slide-in-from-top duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pricing.map(p => (
                            <div key={p.model_name} className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1">
                                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{p.model_name}</div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] font-mono text-blue-500">${(parseFloat(p.input_price_per_token) * 1000000).toFixed(2)} / 1M Input</span>
                                    <span className="text-[11px] font-mono text-amber-500">${(parseFloat(p.output_price_per_token) * 1000000).toFixed(2)} / 1M Output</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {exchangeRate.lastUpdated && (
                        <div className="mt-4 text-[9px] text-zinc-400 text-center italic">
                            Preise und Wechselkurse zuletzt aktualisiert: {new Date(exchangeRate.lastUpdated).toLocaleString('de-DE')}
                        </div>
                    )}
                </div>
            )}

            {/* Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Gesamtumsatz"
                    value={`${stats.revenue.toFixed(2)}€`}
                    icon={<Coins className="w-4 h-4 text-emerald-500" />}
                    sub="Einlösete Credits"
                />
                <SummaryCard
                    title="Google Kosten"
                    value={`$${stats.apiCostUsd.toFixed(4)}`}
                    icon={<DollarSign className="w-4 h-4 text-red-500" />}
                    sub={`${(stats.apiCostUsd * exchangeRate.rate).toFixed(4)}€ (Live Kurs)`}
                />
                <SummaryCard
                    title="Rohertrag"
                    value={`${stats.profit.toFixed(2)}€`}
                    icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
                    sub="Revenue - Google Cost"
                />
                <SummaryCard
                    title="Netto Marge"
                    value={`${stats.margin.toFixed(1)}%`}
                    icon={<Activity className="w-4 h-4 text-purple-500" />}
                    sub={`Ø ${stats.totalTokens > 0 ? (stats.totalTokens / stats.totalJobs).toFixed(0) : 0} tokens/job`}
                />
            </div>

            {/* Performance Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <h3 className={Typo.H2}>Performance nach Qualitätsstufe</h3>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-400">
                        <Database className="w-3 h-3" />
                        Live DB Sync
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                <th className="px-6 py-4">Stufe</th>
                                <th className="px-6 py-4 text-right">Jobs</th>
                                <th className="px-6 py-4 text-right">Tokens</th>
                                <th className="px-6 py-4 text-right">Umsatz (€)</th>
                                <th className="px-6 py-4 text-right">Google ($)</th>
                                <th className="px-6 py-4 text-right">Gewinn (€)</th>
                                <th className="px-6 py-4 text-right">Marge</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {tierStats.map(tier => (
                                <tr key={tier.id} className="text-sm border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={`font-bold uppercase text-[11px] tracking-tight ${tier.color}`}>{tier.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">{tier.count}</td>
                                    <td className="px-6 py-4 text-right font-mono text-xs text-zinc-500">
                                        {tier.tokens >= 1000 ? `${(tier.tokens / 1000).toFixed(1)}k` : tier.tokens}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                        {tier.revenue.toFixed(2)}€
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-xs text-red-500">
                                        ${tier.apiCostUsd.toFixed(4)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-xs font-bold">
                                        {tier.profit.toFixed(2)}€
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${tier.margin > 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            tier.margin > 20 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}>
                                            {tier.margin.toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ title, value, icon, sub }: { title: string, value: string, icon: React.ReactNode, sub: string }) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">{title}</span>
            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                {icon}
            </div>
        </div>
        <div>
            <div className="text-2xl font-bold font-mono tracking-tighter">{value}</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">{sub}</div>
        </div>
    </div>
);


