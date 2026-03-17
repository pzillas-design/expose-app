import React, { useState, useEffect } from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Bar, Legend, Line, ComposedChart
} from 'recharts';
import { TranslationFunction } from '@/types';
import { adminService } from '@/services/adminService';
import { supabase } from '@/services/supabaseClient';
import { AdminViewHeader } from './AdminViewHeader';

interface AdminStatsViewProps {
    t: TranslationFunction;
}

// Actual model names as stored in DB
const USD_TO_EUR = 0.92;
const KIE_COST: Record<string, { eur: number; label: string; color: string }> = {
    // NB2 family — violet, darker → lighter for higher resolution
    'nano-banana-2':   { eur: 0.02 * USD_TO_EUR, label: 'NB2',      color: '#7c3aed' },
    'nb2-1k':          { eur: 0.02 * USD_TO_EUR, label: 'NB2 1K',   color: '#7c3aed' },
    'nb2-2k':          { eur: 0.02 * USD_TO_EUR, label: 'NB2 2K',   color: '#8b5cf6' },
    'nb2-4k':          { eur: 0.02 * USD_TO_EUR, label: 'NB2 4K',   color: '#a78bfa' },
    // NB Pro family — orange, darker → lighter for higher resolution
    'nano-banana-pro': { eur: 0.09 * USD_TO_EUR, label: 'NB Pro',   color: '#ea580c' },
    'pro-1k':          { eur: 0.09 * USD_TO_EUR, label: 'NB Pro 1K', color: '#ea580c' },
    'pro-2k':          { eur: 0.09 * USD_TO_EUR, label: 'NB Pro 2K', color: '#f97316' },
    'pro-4k':          { eur: 0.12 * USD_TO_EUR, label: 'NB Pro 4K', color: '#fb923c' },
};

// Fixed display order: NB2 (1K→4K) then NB Pro (1K→4K)
const MODEL_ORDER = [
    'nano-banana-2', 'nb2-1k', 'nb2-2k', 'nb2-4k',
    'nano-banana-pro', 'pro-1k', 'pro-2k', 'pro-4k',
];

type TimeRange = 'tag' | 'woche' | 'monat' | 'jahr';

const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: 'tag',   label: 'Tag' },
    { id: 'woche', label: 'Woche' },
    { id: 'monat', label: 'Monat' },
    { id: 'jahr',  label: 'Jahr' },
];

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePaymentCount, setStripePaymentCount] = useState<number>(0);
    const [stripeMonthly, setStripeMonthly] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('monat');

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
                        setStripeMonthly(res.data.monthlyRevenue ?? {});
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
    const kieAiCost = completedJobs.reduce((acc, j) => acc + (KIE_COST[j.model]?.eur ?? 0), 0);
    const profit = stripeRevenue != null ? stripeRevenue - kieAiCost : null;
    const margin = stripeRevenue != null && stripeRevenue > 0 && profit != null
        ? (profit / stripeRevenue) * 100 : null;

    // Build chart buckets based on timeRange
    const chartData = React.useMemo(() => {
        const buckets: Record<string, any> = {};
        const now = new Date();

        if (timeRange === 'tag') {
            // Last 14 days
            for (let i = 13; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const label = d.toLocaleString('de-DE', { day: '2-digit', month: 'short' });
                buckets[key] = { _label: label };
            }
            completedJobs.forEach(job => {
                const d = new Date(job.createdAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (!buckets[key]) return;
                const m = job.model || 'unknown';
                buckets[key][m] = (buckets[key][m] || 0) + (KIE_COST[m]?.eur ?? 0);
            });

        } else if (timeRange === 'woche') {
            // Last 10 weeks
            for (let i = 9; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i * 7);
                const key = isoWeekKey(d);
                const label = `KW${isoWeekNum(d)}`;
                buckets[key] = { _label: label };
            }
            completedJobs.forEach(job => {
                const d = new Date(job.createdAt);
                const key = isoWeekKey(d);
                if (!buckets[key]) return;
                const m = job.model || 'unknown';
                buckets[key][m] = (buckets[key][m] || 0) + (KIE_COST[m]?.eur ?? 0);
            });

        } else if (timeRange === 'monat') {
            // Last 6 months
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleString('de-DE', { month: 'short' });
                buckets[key] = { _label: label };
            }
            completedJobs.forEach(job => {
                const d = new Date(job.createdAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!buckets[key]) return;
                const m = job.model || 'unknown';
                buckets[key][m] = (buckets[key][m] || 0) + (KIE_COST[m]?.eur ?? 0);
            });
            // Add Stripe revenue per month
            Object.entries(stripeMonthly).forEach(([key, rev]) => {
                if (buckets[key]) buckets[key]['_stripe'] = rev;
            });

        } else {
            // 'jahr' — last 3 years
            for (let i = 2; i >= 0; i--) {
                const year = now.getFullYear() - i;
                const key = String(year);
                buckets[key] = { _label: key };
            }
            completedJobs.forEach(job => {
                const d = new Date(job.createdAt);
                const key = String(d.getFullYear());
                if (!buckets[key]) return;
                const m = job.model || 'unknown';
                buckets[key][m] = (buckets[key][m] || 0) + (KIE_COST[m]?.eur ?? 0);
            });
            // Aggregate monthly Stripe into years
            Object.entries(stripeMonthly).forEach(([monthKey, rev]) => {
                const year = monthKey.split('-')[0];
                if (buckets[year]) buckets[year]['_stripe'] = (buckets[year]['_stripe'] || 0) + rev;
            });
        }

        return Object.values(buckets);
    }, [completedJobs, stripeMonthly, timeRange]);

    // Unique model keys found in jobs, in fixed display order
    const modelKeys = React.useMemo(() => {
        const found = new Set(completedJobs.map(j => j.model).filter(m => KIE_COST[m]));
        return MODEL_ORDER.filter(m => found.has(m));
    }, [completedJobs]);

    const showStripeLine = timeRange === 'monat' || timeRange === 'jahr';

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col">
            <AdminViewHeader title="Kosten & Einnahmen" description="Stripe-Zahlungen vs. Kie AI Ausgaben" />
            <div className="px-6 md:px-8 py-6 space-y-6">

            {/* 3-card comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Stripe Einnahmen"
                    value={stripeRevenue != null ? `${stripeRevenue.toFixed(2)}€` : '—'}
                    sub={`${stripePaymentCount} Zahlungen`}
                    icon={<ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                    iconBg="bg-emerald-50 dark:bg-emerald-900/20"
                    valueColor="text-emerald-600 dark:text-emerald-400"
                />
                <StatCard
                    label="Kie AI Ausgaben"
                    value={`${kieAiCost.toFixed(2)}€`}
                    sub={`${completedJobs.length} Generierungen (est.)`}
                    icon={<ArrowDownRight className="w-4 h-4 text-red-500" />}
                    iconBg="bg-red-50 dark:bg-red-900/20"
                    valueColor="text-red-500"
                />
                <StatCard
                    label="Gewinn"
                    value={profit != null ? `${profit.toFixed(2)}€` : '—'}
                    sub={margin != null ? `Marge ${margin.toFixed(0)}%` : '—'}
                    icon={<TrendingUp className="w-4 h-4 text-orange-500" />}
                    iconBg="bg-orange-50 dark:bg-orange-900/20"
                    valueColor={profit != null && profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}
                />
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold">Verlauf</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            Balken = Kie AI Kosten nach Modell
                            {showStripeLine ? ' · Linie = Stripe Einnahmen' : ''}
                        </p>
                    </div>
                    {/* Time range toggle */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                        {TIME_RANGES.map(tr => (
                            <button
                                key={tr.id}
                                onClick={() => setTimeRange(tr.id)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                    timeRange === tr.id
                                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                                }`}
                            >
                                {tr.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                            <XAxis dataKey="_label" axisLine={false} tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                tickFormatter={v => `${v.toFixed(2)}€`} />
                            {showStripeLine && (
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#10b981' }}
                                    tickFormatter={v => `${v.toFixed(0)}€`} />
                            )}
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f1f1', borderRadius: '10px', fontSize: '11px' }}
                                formatter={(value: any, name: string) => {
                                    if (name === '_stripe') return [`${Number(value).toFixed(2)}€`, 'Stripe Einnahmen'];
                                    const m = KIE_COST[name];
                                    return [`${Number(value).toFixed(3)}€`, m?.label ?? name];
                                }}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                                formatter={(value) => {
                                    if (value === '_stripe') return 'Stripe Einnahmen';
                                    return KIE_COST[value]?.label ?? value;
                                }}
                            />
                            {modelKeys.map((modelId, i) => (
                                <Bar key={modelId} yAxisId="left" dataKey={modelId} stackId="cost"
                                    fill={KIE_COST[modelId]?.color ?? '#a1a1aa'}
                                    radius={i === modelKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                            ))}
                            {showStripeLine && (
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="_stripe"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    connectNulls
                                    dot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                    activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Per-model breakdown table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-sm font-bold">Aufschlüsselung nach Modell</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">NB2 $0.02 · NB Pro $0.09 · NB Pro 4K $0.12 (Kie AI, März 2026)</p>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-medium text-zinc-500">
                            <th className="px-6 py-3">Modell</th>
                            <th className="px-6 py-3 text-right">Abgeschlossen</th>
                            <th className="px-6 py-3 text-right">Kosten/Job</th>
                            <th className="px-6 py-3 text-right">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {Object.entries(KIE_COST).map(([modelId, info]) => {
                            const count = completedJobs.filter(j => j.model === modelId).length;
                            if (count === 0) return null;
                            return (
                                <tr key={modelId} className="text-sm hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                    <td className="px-6 py-3">
                                        <span className="font-bold text-[11px] uppercase" style={{ color: info.color }}>{info.label}</span>
                                        <span className="ml-2 text-[10px] text-zinc-400 font-mono">{modelId}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium">{count}</td>
                                    <td className="px-6 py-3 text-right font-mono text-xs text-zinc-400">{info.eur.toFixed(3)}€</td>
                                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-red-500">{(count * info.eur).toFixed(2)}€</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-zinc-50/30 dark:bg-zinc-800/20 font-bold text-sm">
                            <td className="px-6 py-3 text-[11px] font-medium text-zinc-500">Gesamt</td>
                            <td className="px-6 py-3 text-right">{completedJobs.length}</td>
                            <td className="px-6 py-3" />
                            <td className="px-6 py-3 text-right font-mono text-red-500">{kieAiCost.toFixed(2)}€</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            </div>{/* end inner padding div */}
        </div>
    );
};

function isoWeekNum(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function isoWeekKey(d: Date): string {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const year = date.getUTCFullYear();
    const weekNo = Math.ceil((((date.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
    return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

const StatCard = ({ label, value, sub, icon, iconBg, valueColor }: {
    label: string; value: string; sub: string;
    icon: React.ReactNode; iconBg: string; valueColor: string;
}) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-zinc-400">{label}</span>
            <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
        </div>
        <div>
            <div className={`text-3xl font-bold font-mono tracking-tighter ${valueColor}`}>{value}</div>
            <div className="text-[11px] text-zinc-400 mt-1">{sub}</div>
        </div>
    </div>
);
