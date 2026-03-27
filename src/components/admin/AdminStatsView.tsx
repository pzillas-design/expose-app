import React, { useEffect, useMemo, useState } from 'react';
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

type TimeRange = 'tag' | 'woche' | 'monat' | 'jahr';
type ResolutionBucket = '1K' | '2K' | '4K' | 'Other';

const USD_TO_EUR = 0.92;
const GOOGLE_INPUT_TEXT_IMAGE_USD_PER_M = 0.5;
const GOOGLE_OUTPUT_IMAGE_USD_PER_M = 60;
const GOOGLE_OUTPUT_TEXT_USD_PER_M = 3;

const RESOLUTION_INFO: Record<ResolutionBucket, { label: string; color: string; fallbackUsd: number }> = {
    '1K': { label: '1K', color: '#3b82f6', fallbackUsd: 0.067 },
    '2K': { label: '2K', color: '#14b8a6', fallbackUsd: 0.101 },
    '4K': { label: '4K', color: '#d97706', fallbackUsd: 0.151 },
    'Other': { label: 'Other', color: '#71717a', fallbackUsd: 0 },
};

const RESOLUTION_ORDER: ResolutionBucket[] = ['1K', '2K', '4K', 'Other'];

const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: 'tag', label: 'Tag' },
    { id: 'woche', label: 'Woche' },
    { id: 'monat', label: 'Monat' },
    { id: 'jahr', label: 'Jahr' },
];

const STRIPE_REVENUE_START = new Date('2026-03-27T00:00:00+01:00');

const getResolutionBucket = (job: any): ResolutionBucket => {
    const value = String(job.imageSize || job.qualityMode || job.model || '').toLowerCase();
    if (value.includes('4k')) return '4K';
    if (value.includes('2k')) return '2K';
    if (value.includes('1k')) return '1K';
    return 'Other';
};

const calculateEstimatedGoogleCostEur = (job: any): number => {
    const inputTokens = Number(job.tokensPrompt || 0);
    const outputTokens = Number(job.tokensCompletion || 0);
    const resolution = getResolutionBucket(job);

    const inputUsd = (inputTokens / 1_000_000) * GOOGLE_INPUT_TEXT_IMAGE_USD_PER_M;

    // For image generation, candidatesTokenCount usually reflects image output tokens.
    // If unavailable, fall back to official per-image pricing by resolution.
    const outputUsd = outputTokens > 0
        ? (outputTokens / 1_000_000) * GOOGLE_OUTPUT_IMAGE_USD_PER_M
        : RESOLUTION_INFO[resolution].fallbackUsd;

    // Tiny text output may exist, but we do not store modality-split output tokens yet.
    // Keeping image output dominant avoids undercounting the actual image generation cost.
    const totalUsd = inputUsd + outputUsd;
    return totalUsd * USD_TO_EUR;
};

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePaymentCount, setStripePaymentCount] = useState(0);
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
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        body: { startDate: STRIPE_REVENUE_START.toISOString() }
                    });
                    if (!res.error && res.data) {
                        setStripeRevenue(res.data.totalRevenue ?? 0);
                        setStripePaymentCount(res.data.paymentCount ?? 0);
                        setStripeMonthly(res.data.monthlyRevenue ?? {});
                    } else {
                        setStripeRevenue(0);
                        setStripePaymentCount(0);
                        setStripeMonthly({});
                    }
                } else {
                    setStripeRevenue(0);
                    setStripePaymentCount(0);
                    setStripeMonthly({});
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
    const googleAiCost = completedJobs.reduce((acc, j) => acc + calculateEstimatedGoogleCostEur(j), 0);
    const profit = stripeRevenue != null ? stripeRevenue - googleAiCost : null;
    const margin = stripeRevenue != null && stripeRevenue > 0 && profit != null
        ? (profit / stripeRevenue) * 100 : null;

    const chartData = useMemo(() => {
        const buckets: Record<string, any> = {};
        const now = new Date();

        if (timeRange === 'tag') {
            for (let i = 13; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                buckets[key] = { _label: d.toLocaleString('de-DE', { day: '2-digit', month: 'short' }) };
            }
            completedJobs.forEach(job => {
                const d = new Date(job.createdAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (!buckets[key]) return;
                const resolution = getResolutionBucket(job);
                buckets[key][resolution] = (buckets[key][resolution] || 0) + calculateEstimatedGoogleCostEur(job);
            });
        } else if (timeRange === 'woche') {
            for (let i = 9; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i * 7);
                buckets[isoWeekKey(d)] = { _label: `KW${isoWeekNum(d)}` };
            }
            completedJobs.forEach(job => {
                const key = isoWeekKey(new Date(job.createdAt));
                if (!buckets[key]) return;
                const resolution = getResolutionBucket(job);
                buckets[key][resolution] = (buckets[key][resolution] || 0) + calculateEstimatedGoogleCostEur(job);
            });
        } else if (timeRange === 'monat') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                buckets[key] = { _label: d.toLocaleString('de-DE', { month: 'short' }) };
            }
            completedJobs.forEach(job => {
                const d = new Date(job.createdAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!buckets[key]) return;
                const resolution = getResolutionBucket(job);
                buckets[key][resolution] = (buckets[key][resolution] || 0) + calculateEstimatedGoogleCostEur(job);
            });
            Object.entries(stripeMonthly).forEach(([key, rev]) => {
                if (buckets[key]) buckets[key]._stripe = rev;
            });
        } else {
            for (let i = 2; i >= 0; i--) {
                const year = now.getFullYear() - i;
                buckets[String(year)] = { _label: String(year) };
            }
            completedJobs.forEach(job => {
                const key = String(new Date(job.createdAt).getFullYear());
                if (!buckets[key]) return;
                const resolution = getResolutionBucket(job);
                buckets[key][resolution] = (buckets[key][resolution] || 0) + calculateEstimatedGoogleCostEur(job);
            });
            Object.entries(stripeMonthly).forEach(([monthKey, rev]) => {
                const year = monthKey.split('-')[0];
                if (buckets[year]) buckets[year]._stripe = (buckets[year]._stripe || 0) + rev;
            });
        }

        return Object.values(buckets);
    }, [completedJobs, stripeMonthly, timeRange]);

    const resolutionKeys = useMemo(() => {
        const found = new Set(completedJobs.map(getResolutionBucket));
        return RESOLUTION_ORDER.filter(key => found.has(key) && key !== 'Other');
    }, [completedJobs]);

    const breakdownRows = useMemo(() => {
        return RESOLUTION_ORDER.map((resolution) => {
            const resolutionJobs = completedJobs.filter(job => getResolutionBucket(job) === resolution);
            if (resolutionJobs.length === 0 || resolution === 'Other') return null;
            const total = resolutionJobs.reduce((sum, job) => sum + calculateEstimatedGoogleCostEur(job), 0);
            const avg = total / resolutionJobs.length;
            return {
                resolution,
                label: RESOLUTION_INFO[resolution].label,
                color: RESOLUTION_INFO[resolution].color,
                count: resolutionJobs.length,
                avg,
                total,
            };
        }).filter(Boolean) as Array<{ resolution: ResolutionBucket; label: string; color: string; count: number; avg: number; total: number }>;
    }, [completedJobs]);

    const topUsers = useMemo(() => {
        const byUser = new Map<string, { name: string; count: number }>();
        completedJobs.forEach((job) => {
            const name = job.userName || 'Unknown';
            const current = byUser.get(name) || { name, count: 0 };
            current.count += 1;
            byUser.set(name, current);
        });
        return Array.from(byUser.values())
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
            .slice(0, 10);
    }, [completedJobs]);

    const showStripeLine = timeRange === 'monat' || timeRange === 'jahr';

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col">
            <AdminViewHeader title="Kosten & Einnahmen" description="Stripe-Zahlungen vs. Google AI Ausgaben" />
            <div className="px-6 md:px-8 py-6 space-y-6">

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
                        label="Google AI Ausgaben"
                        value={`${googleAiCost.toFixed(2)}€`}
                        sub={`${completedJobs.length} Generierungen (geschätzt)`}
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

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-bold">Verlauf</h3>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                                Balken = Google AI Kosten nach Auflösung
                                {showStripeLine ? ' · Linie = Stripe Einnahmen' : ''}
                            </p>
                        </div>
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
                                    tickFormatter={v => `${Number(v).toFixed(2)}€`} />
                                {showStripeLine && (
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#10b981' }}
                                        tickFormatter={v => `${Number(v).toFixed(0)}€`} />
                                )}
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f1f1', borderRadius: '10px', fontSize: '11px' }}
                                    formatter={(value: any, name: string) => {
                                        if (name === '_stripe') return [`${Number(value).toFixed(2)}€`, 'Stripe Einnahmen'];
                                        const info = RESOLUTION_INFO[name as ResolutionBucket];
                                        return [`${Number(value).toFixed(3)}€`, info?.label ?? name];
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                                    formatter={(value) => {
                                        if (value === '_stripe') return 'Stripe Einnahmen';
                                        return RESOLUTION_INFO[value as ResolutionBucket]?.label ?? value;
                                    }}
                                />
                                {resolutionKeys.map((resolution, i) => (
                                    <Bar
                                        key={resolution}
                                        yAxisId="left"
                                        dataKey={resolution}
                                        stackId="cost"
                                        fill={RESOLUTION_INFO[resolution].color}
                                        radius={i === resolutionKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
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

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-sm font-bold">Aufschlüsselung nach Auflösung</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            Google NB2 Standardpreise: 1K $0.067 · 2K $0.101 · 4K $0.151. Wenn Token vorliegen, wird daraus die Schätzung berechnet.
                        </p>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-medium text-zinc-500">
                                <th className="px-6 py-3">Auflösung</th>
                                <th className="px-6 py-3 text-right">Abgeschlossen</th>
                                <th className="px-6 py-3 text-right">Ø Kosten/Job</th>
                                <th className="px-6 py-3 text-right">Gesamt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {breakdownRows.map((row) => (
                                <tr key={row.resolution} className="text-sm hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                    <td className="px-6 py-3">
                                        <span className="font-bold text-[11px] uppercase" style={{ color: row.color }}>{row.label}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium">{row.count}</td>
                                    <td className="px-6 py-3 text-right font-mono text-xs text-zinc-400">{row.avg.toFixed(3)}€</td>
                                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-red-500">{row.total.toFixed(2)}€</td>
                                </tr>
                            ))}
                            <tr className="bg-zinc-50/30 dark:bg-zinc-800/20 font-bold text-sm">
                                <td className="px-6 py-3 text-[11px] font-medium text-zinc-500">Gesamt</td>
                                <td className="px-6 py-3 text-right">{completedJobs.length}</td>
                                <td className="px-6 py-3" />
                                <td className="px-6 py-3 text-right font-mono text-red-500">{googleAiCost.toFixed(2)}€</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-sm font-bold">Häufigste Nutzer</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Top 10 nach abgeschlossenen Generierungen.</p>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-medium text-zinc-500">
                                <th className="px-6 py-3">Benutzer</th>
                                <th className="px-6 py-3 text-right">Generierungen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {topUsers.map((user) => (
                                <tr key={user.name} className="text-sm hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                    <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">{user.name}</td>
                                    <td className="px-6 py-3 text-right font-mono text-sm text-zinc-500">{user.count}</td>
                                </tr>
                            ))}
                            {topUsers.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-zinc-400">
                                        Keine Daten vorhanden
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
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
