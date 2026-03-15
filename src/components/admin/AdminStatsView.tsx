import React, { useState, useEffect } from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Line, ComposedChart
} from 'recharts';
import { TranslationFunction } from '@/types';
import { adminService } from '@/services/adminService';
import { supabase } from '@/services/supabaseClient';

interface AdminStatsViewProps {
    t: TranslationFunction;
}

// Actual model names as stored in DB
const USD_TO_EUR = 0.92;
const KIE_COST: Record<string, { eur: number; label: string; color: string }> = {
    // NB2 family — violet, darker → lighter for higher resolution
    'nano-banana-2':   { eur: 0.02 * USD_TO_EUR, label: 'NB2 1K', color: '#7c3aed' },
    'nb2-1k':          { eur: 0.02 * USD_TO_EUR, label: 'NB2 1K', color: '#7c3aed' },
    'nb2-2k':          { eur: 0.02 * USD_TO_EUR, label: 'NB2 2K', color: '#8b5cf6' },
    'nb2-4k':          { eur: 0.02 * USD_TO_EUR, label: 'NB2 4K', color: '#a78bfa' },
    // NB Pro family — orange, darker → lighter for higher resolution
    'nano-banana-pro': { eur: 0.09 * USD_TO_EUR, label: 'NB Pro 1K', color: '#ea580c' },
    'pro-1k':          { eur: 0.09 * USD_TO_EUR, label: 'NB Pro 1K', color: '#ea580c' },
    'pro-2k':          { eur: 0.09 * USD_TO_EUR, label: 'NB Pro 2K', color: '#f97316' },
    'pro-4k':          { eur: 0.12 * USD_TO_EUR, label: 'NB Pro 4K', color: '#fb923c' },
};

// Fixed display order: NB2 (1K→4K) then NB Pro (1K→4K)
const MODEL_ORDER = [
    'nano-banana-2', 'nb2-1k', 'nb2-2k', 'nb2-4k',
    'nano-banana-pro', 'pro-1k', 'pro-2k', 'pro-4k',
];

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePaymentCount, setStripePaymentCount] = useState<number>(0);
    const [stripeMonthly, setStripeMonthly] = useState<Record<string, number>>({});
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

    // Chart data: last 8 weeks grouped by week
    const chartData = React.useMemo(() => {
        const weeks: Record<string, any> = {};
        // Last 8 weeks
        for (let i = 7; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i * 7);
            const key = `KW${getWeekNumber(d)}`;
            weeks[key] = { week: key };
        }

        completedJobs.forEach(job => {
            const d = new Date(job.createdAt);
            const key = `KW${getWeekNumber(d)}`;
            if (weeks[key]) {
                const modelKey = job.model || 'unknown';
                weeks[key][modelKey] = (weeks[key][modelKey] || 0) + (KIE_COST[modelKey]?.eur ?? 0);
            }
        });

        // Add Stripe revenue by month → distribute to weeks roughly
        Object.entries(stripeMonthly).forEach(([monthKey, rev]) => {
            const [year, month] = monthKey.split('-').map(Number);
            // Find weeks in this month and distribute evenly
            const weeksInMonth = Object.keys(weeks).filter(k => {
                // Simple: just add to last week of month key
                return true; // will handle separately
            });
        });

        // For simplicity: add monthly Stripe revenue to the chart as a separate field
        // Map month → week by approximate date
        completedJobs.forEach(job => {
            const d = new Date(job.createdAt);
            const key = `KW${getWeekNumber(d)}`;
            if (!weeks[key]) return;
            // revenue per job = job.cost
            weeks[key]['_revenue'] = (weeks[key]['_revenue'] || 0) + (job.cost || 0);
        });

        return Object.values(weeks);
    }, [completedJobs, stripeMonthly]);

    // Unique model keys found in jobs, in fixed display order
    const modelKeys = React.useMemo(() => {
        const found = new Set(completedJobs.map(j => j.model).filter(m => KIE_COST[m]));
        return MODEL_ORDER.filter(m => found.has(m));
    }, [completedJobs]);

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="p-8 flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-6">
            <div>
                <h2 className="text-xl font-bold tracking-tight">Kosten & Einnahmen</h2>
                <p className="text-xs text-zinc-500 mt-1">Stripe-Zahlungen vs. Kie AI Ausgaben</p>
            </div>

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

            {/* Chart: stacked bars (Kie AI costs by model) + line (credit consumption) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold">Verlauf (letzte 8 Wochen)</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Gestapelte Balken = Kie AI Kosten nach Modell · Linie = Credit-Verbrauch der User</p>
                    </div>
                </div>
                <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800" />
                            <XAxis dataKey="week" axisLine={false} tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                tickFormatter={v => `${v.toFixed(2)}€`} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                tickFormatter={v => `${v.toFixed(2)}€`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f1f1', borderRadius: '10px', fontSize: '11px' }}
                                formatter={(value: any, name: string) => {
                                    if (name === '_revenue') return [`${Number(value).toFixed(2)}€`, 'Credit-Verbrauch'];
                                    const m = KIE_COST[name];
                                    return [`${Number(value).toFixed(3)}€`, m?.label ?? name];
                                }}
                            />
                            <Legend formatter={(value) => {
                                if (value === '_revenue') return 'Credit-Verbrauch';
                                return KIE_COST[value]?.label ?? value;
                            }} />
                            {modelKeys.map((modelId, i) => (
                                <Bar key={modelId} yAxisId="left" dataKey={modelId} stackId="cost"
                                    fill={KIE_COST[modelId]?.color ?? '#a1a1aa'}
                                    radius={i === modelKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                            ))}
                            <Line yAxisId="right" type="monotone" dataKey="_revenue"
                                stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
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
                        <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
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
                            <td className="px-6 py-3 text-[11px] uppercase tracking-wide text-zinc-500">Gesamt</td>
                            <td className="px-6 py-3 text-right">{completedJobs.length}</td>
                            <td className="px-6 py-3" />
                            <td className="px-6 py-3 text-right font-mono text-red-500">{kieAiCost.toFixed(2)}€</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

function getWeekNumber(d: Date): string {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear().toString().slice(2)}W${weekNo}`;
}

const StatCard = ({ label, value, sub, icon, iconBg, valueColor }: {
    label: string; value: string; sub: string;
    icon: React.ReactNode; iconBg: string; valueColor: string;
}) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
            <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
        </div>
        <div>
            <div className={`text-3xl font-bold font-mono tracking-tighter ${valueColor}`}>{value}</div>
            <div className="text-[11px] text-zinc-400 mt-1">{sub}</div>
        </div>
    </div>
);
