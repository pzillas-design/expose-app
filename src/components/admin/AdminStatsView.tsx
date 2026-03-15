import React, { useState, useEffect } from 'react';
import { Loader2, Coins, TrendingUp, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { adminService } from '@/services/adminService';
import { supabase } from '@/services/supabaseClient';

interface AdminStatsViewProps {
    t: TranslationFunction;
}

// Kie AI fixed costs per generation (source: kie.ai, March 2026)
const USD_TO_EUR = 0.92;
const KIE_COST: Record<string, number> = {
    'nb2-1k':  0.02 * USD_TO_EUR,
    'nb2-2k':  0.02 * USD_TO_EUR,
    'nb2-4k':  0.02 * USD_TO_EUR,
    'pro-1k':  0.09 * USD_TO_EUR,
    'pro-2k':  0.09 * USD_TO_EUR,
    'pro-4k':  0.12 * USD_TO_EUR,
};

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePaymentCount, setStripePaymentCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [jobsData, { data: { session } }] = await Promise.all([
                    adminService.getJobs(),
                    supabase.auth.getSession()
                ]);
                setJobs(jobsData);

                if (session?.access_token) {
                    const res = await supabase.functions.invoke('admin-stats', {
                        headers: { Authorization: `Bearer ${session.access_token}` }
                    });
                    if (!res.error && res.data) {
                        setStripeRevenue(res.data.totalRevenue ?? null);
                        setStripePaymentCount(res.data.paymentCount ?? 0);
                    }
                }
            } catch (e) {
                console.error('AdminStatsView fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const completedJobs = jobs.filter(j => j.status === 'completed');
    const kieAiCost = completedJobs.reduce((acc, j) => acc + (KIE_COST[j.model] ?? 0), 0);
    const profit = stripeRevenue != null ? stripeRevenue - kieAiCost : null;
    const margin = stripeRevenue != null && stripeRevenue > 0 && profit != null
        ? (profit / stripeRevenue) * 100 : null;

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="p-8 flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-8">
            <div>
                <h2 className="text-xl font-bold tracking-tight">Kosten & Einnahmen</h2>
                <p className="text-xs text-zinc-500 mt-1">Stripe-Einnahmen vs. Kie AI Ausgaben</p>
            </div>

            {/* Main 3-card comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stripe Revenue */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Stripe Einnahmen</span>
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-mono tracking-tighter text-emerald-600 dark:text-emerald-400">
                            {stripeRevenue != null ? `${stripeRevenue.toFixed(2)}€` : '—'}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                            {stripePaymentCount} erfolgreiche Zahlungen
                        </div>
                    </div>
                </div>

                {/* Kie AI Cost */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Kie AI Ausgaben</span>
                        <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20">
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-mono tracking-tighter text-red-500">
                            {kieAiCost.toFixed(2)}€
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                            {completedJobs.length} Generierungen (est.)
                        </div>
                    </div>
                </div>

                {/* Profit */}
                <div className={`rounded-2xl p-6 space-y-4 border ${profit != null && profit >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Gewinn</span>
                        <div className="p-2 rounded-xl bg-white/60 dark:bg-black/20">
                            <TrendingUp className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                        </div>
                    </div>
                    <div>
                        <div className={`text-3xl font-bold font-mono tracking-tighter ${profit != null && profit >= 0
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-red-600 dark:text-red-400'}`}>
                            {profit != null ? `${profit.toFixed(2)}€` : '—'}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                            {margin != null ? `Marge ${margin.toFixed(0)}%` : 'Marge —'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-model breakdown */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold">Kie AI Kosten nach Modell</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Festpreise: NB2 $0.02 · NB Pro 1K/2K $0.09 · NB Pro 4K $0.12</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400">
                        <Zap className="w-3 h-3" />
                        Kie AI
                    </div>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            <th className="px-6 py-3">Modell</th>
                            <th className="px-6 py-3 text-right">Jobs</th>
                            <th className="px-6 py-3 text-right">Kosten/Job</th>
                            <th className="px-6 py-3 text-right">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {Object.entries(KIE_COST).map(([modelId, costEur]) => {
                            const count = completedJobs.filter(j => j.model === modelId).length;
                            if (count === 0) return null;
                            const total = count * costEur;
                            const colors: Record<string, string> = {
                                'nb2-1k': 'text-emerald-500', 'nb2-2k': 'text-purple-500', 'nb2-4k': 'text-rose-500',
                                'pro-1k': 'text-indigo-500', 'pro-2k': 'text-violet-500', 'pro-4k': 'text-pink-500',
                            };
                            const names: Record<string, string> = {
                                'nb2-1k': 'NB2 · 1K', 'nb2-2k': 'NB2 · 2K', 'nb2-4k': 'NB2 · 4K',
                                'pro-1k': 'NB Pro · 1K', 'pro-2k': 'NB Pro · 2K', 'pro-4k': 'NB Pro · 4K',
                            };
                            return (
                                <tr key={modelId} className="text-sm hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                    <td className="px-6 py-4">
                                        <span className={`font-bold text-[11px] uppercase ${colors[modelId]}`}>{names[modelId]}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">{count}</td>
                                    <td className="px-6 py-4 text-right font-mono text-xs text-zinc-500">{costEur.toFixed(3)}€</td>
                                    <td className="px-6 py-4 text-right font-mono text-xs font-bold text-red-500">{total.toFixed(2)}€</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-zinc-50/30 dark:bg-zinc-800/20 font-bold">
                            <td className="px-6 py-4 text-[11px] uppercase tracking-wide text-zinc-500">Gesamt</td>
                            <td className="px-6 py-4 text-right">{completedJobs.length}</td>
                            <td className="px-6 py-4" />
                            <td className="px-6 py-4 text-right font-mono text-sm text-red-500">{kieAiCost.toFixed(2)}€</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
