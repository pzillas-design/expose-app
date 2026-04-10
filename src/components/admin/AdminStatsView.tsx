import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Bar, Line, ComposedChart
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

const RESOLUTION_INFO: Record<ResolutionBucket, { label: string; color: string; fallbackUsd: number }> = {
    '1K': { label: '1K', color: '#eab308', fallbackUsd: 0.067 },
    '2K': { label: '2K', color: '#f97316', fallbackUsd: 0.101 },
    '4K': { label: '4K', color: '#ef4444', fallbackUsd: 0.151 },
    'Other': { label: 'Other', color: '#71717a', fallbackUsd: 0 },
};

const RESOLUTION_ORDER: ResolutionBucket[] = ['1K', '2K', '4K', 'Other'];

const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: 'tag', label: 'Tag' },
    { id: 'woche', label: 'Woche' },
    { id: 'monat', label: 'Monat' },
    { id: 'jahr', label: 'Jahr' },
];

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
    const outputUsd = outputTokens > 0
        ? (outputTokens / 1_000_000) * GOOGLE_OUTPUT_IMAGE_USD_PER_M
        : RESOLUTION_INFO[resolution].fallbackUsd;
    return (inputUsd + outputUsd) * USD_TO_EUR;
};

const EXCLUDED_EMAILS = ['pzillas@gmail.com'];

type VisibleSeries = {
    generierungen: boolean;
    newUsers: boolean;
    failedJobs: boolean;
    revenue: boolean;
    aiCost: boolean;
};

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePaymentCount, setStripePaymentCount] = useState(0);
    const [stripeMonthly, setStripeMonthly] = useState<Record<string, number>>({});
    const [voiceStats, setVoiceStats] = useState<{ sessionCount: number; totalMinutes: number; costEur: number }>({ sessionCount: 0, totalMinutes: 0, costEur: 0 });
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('tag');
    const [visibleSeries, setVisibleSeries] = useState<VisibleSeries>({
        generierungen: true,
        newUsers: true,
        failedJobs: false,
        revenue: false,
        aiCost: false,
    });

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [jobsData, voiceSessions, profilesResult, { data: { session } }] = await Promise.all([
                    adminService.getJobs(),
                    adminService.getVoiceSessions(200),
                    supabase.from('profiles').select('id, created_at, email'),
                    supabase.auth.getSession()
                ]);
                const filteredJobs = jobsData.filter((j: any) => !EXCLUDED_EMAILS.includes(j.userEmail));
                const filteredVoice = voiceSessions.filter((s: any) => !EXCLUDED_EMAILS.includes(s.userEmail));
                setJobs(filteredJobs);
                const filteredProfiles = (profilesResult.data || []).filter((p: any) => !EXCLUDED_EMAILS.includes(p.email));
                setProfiles(filteredProfiles);

                const VOICE_USD_PER_MIN = 0.043;
                const totalVoiceMinutes = filteredVoice.reduce((sum: number, s: any) => sum + (s.durationMs || 0) / 60000, 0);
                setVoiceStats({
                    sessionCount: filteredVoice.length,
                    totalMinutes: totalVoiceMinutes,
                    costEur: totalVoiceMinutes * VOICE_USD_PER_MIN * USD_TO_EUR,
                });

                if (session?.access_token) {
                    const defaultStart = new Date();
                    defaultStart.setDate(defaultStart.getDate() - 90);
                    const res = await supabase.functions.invoke('admin-stats', {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        body: { startDate: defaultStart.toISOString() },
                    });
                    if (!res.error && res.data) {
                        setStripeRevenue(res.data.totalRevenue ?? 0);
                        setStripePaymentCount(res.data.paymentCount ?? 0);
                        setStripeMonthly(res.data.monthlyRevenue ?? {});
                    } else {
                        setStripeRevenue(0); setStripePaymentCount(0); setStripeMonthly({});
                    }
                } else {
                    setStripeRevenue(0); setStripePaymentCount(0); setStripeMonthly({});
                }
            } catch (e) {
                console.error('AdminStatsView fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ── Derived values ──────────────────────────────────────────────────────
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs = jobs.filter(j => j.status === 'failed');
    const googleAiCost = completedJobs.reduce((acc, j) => acc + calculateEstimatedGoogleCostEur(j), 0);
    const totalAiCost = googleAiCost + voiceStats.costEur;
    const profit = stripeRevenue != null ? stripeRevenue - totalAiCost : null;
    const margin = stripeRevenue != null && stripeRevenue > 0 && profit != null
        ? (profit / stripeRevenue) * 100 : null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const start7d = startOfToday - 6 * 86400000;
    const start30d = startOfToday - 29 * 86400000;

    const newSignupsToday = profiles.filter(p => new Date(p.created_at).getTime() >= startOfToday).length;
    const newSignups7d = profiles.filter(p => new Date(p.created_at).getTime() >= start7d).length;
    const newSignups30d = profiles.filter(p => new Date(p.created_at).getTime() >= start30d).length;

    const uniqueUsersWithJobs = new Set(completedJobs.map(j => j.userEmail || j.userName)).size;
    const activationRate = profiles.length > 0 ? (uniqueUsersWithJobs / profiles.length) * 100 : 0;
    const errorRate = jobs.length > 0 ? (failedJobs.length / jobs.length) * 100 : 0;
    const uniqueUsersTotal = new Set(jobs.map(j => j.userEmail || j.userName)).size;
    const avgGenerationsPerUser = uniqueUsersTotal > 0 ? completedJobs.length / uniqueUsersTotal : 0;

    // ── Combined chart data ─────────────────────────────────────────────────
    const combinedChartData = useMemo(() => {
        const buckets: Record<string, any> = {};

        const makeKey = (d: Date): string => {
            if (timeRange === 'tag') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (timeRange === 'woche') return isoWeekKey(d);
            if (timeRange === 'monat') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return String(d.getFullYear());
        };

        const makeLabel = (d: Date): string => {
            if (timeRange === 'tag') return d.toLocaleString('de-DE', { day: '2-digit', month: 'short' });
            if (timeRange === 'woche') return `KW${isoWeekNum(d)}`;
            if (timeRange === 'monat') return d.toLocaleString('de-DE', { month: 'short' });
            return String(d.getFullYear());
        };

        // Seed buckets
        if (timeRange === 'tag') {
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now); d.setDate(d.getDate() - i);
                buckets[makeKey(d)] = { _label: makeLabel(d), _newUsers: 0, _failedJobs: 0, _aiCost: 0, _revenue: 0 };
            }
        } else if (timeRange === 'woche') {
            for (let i = 9; i >= 0; i--) {
                const d = new Date(now); d.setDate(d.getDate() - i * 7);
                buckets[makeKey(d)] = { _label: makeLabel(d), _newUsers: 0, _failedJobs: 0, _aiCost: 0, _revenue: 0 };
            }
        } else if (timeRange === 'monat') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                buckets[makeKey(d)] = { _label: makeLabel(d), _newUsers: 0, _failedJobs: 0, _aiCost: 0, _revenue: 0 };
            }
        } else {
            for (let i = 2; i >= 0; i--) {
                const d = new Date(now.getFullYear() - i, 0, 1);
                buckets[makeKey(d)] = { _label: makeLabel(d), _newUsers: 0, _failedJobs: 0, _aiCost: 0, _revenue: 0 };
            }
        }

        // Fill completed jobs (count per resolution bucket + aiCost)
        completedJobs.forEach(job => {
            const key = makeKey(new Date(job.createdAt));
            if (!buckets[key]) return;
            const res = getResolutionBucket(job);
            buckets[key][res] = (buckets[key][res] || 0) + 1;
            buckets[key]._aiCost = (buckets[key]._aiCost || 0) + calculateEstimatedGoogleCostEur(job);
        });

        // Fill failed jobs
        failedJobs.forEach(job => {
            const key = makeKey(new Date(job.createdAt));
            if (!buckets[key]) return;
            buckets[key]._failedJobs = (buckets[key]._failedJobs || 0) + 1;
        });

        // Fill new users
        profiles.forEach(p => {
            const key = makeKey(new Date(p.created_at));
            if (!buckets[key]) return;
            buckets[key]._newUsers = (buckets[key]._newUsers || 0) + 1;
        });

        // Fill stripe revenue
        if (timeRange === 'monat' || timeRange === 'jahr') {
            Object.entries(stripeMonthly).forEach(([monthKey, rev]) => {
                if (timeRange === 'monat') {
                    if (buckets[monthKey]) buckets[monthKey]._revenue = (buckets[monthKey]._revenue || 0) + rev;
                } else {
                    const year = monthKey.split('-')[0];
                    if (buckets[year]) buckets[year]._revenue = (buckets[year]._revenue || 0) + rev;
                }
            });
        }

        return Object.values(buckets);
    }, [completedJobs, failedJobs, profiles, stripeMonthly, timeRange]);

    // ── Breakdown table ─────────────────────────────────────────────────────
    const resolutionKeys = useMemo(() => {
        const found = new Set(completedJobs.map(getResolutionBucket));
        return RESOLUTION_ORDER.filter(key => found.has(key) && key !== 'Other');
    }, [completedJobs]);

    const breakdownRows = useMemo(() => {
        return RESOLUTION_ORDER.map((resolution) => {
            const resolutionJobs = completedJobs.filter(job => getResolutionBucket(job) === resolution);
            if (resolutionJobs.length === 0 || resolution === 'Other') return null;
            const total = resolutionJobs.reduce((sum, job) => sum + calculateEstimatedGoogleCostEur(job), 0);
            return {
                resolution,
                label: RESOLUTION_INFO[resolution].label,
                color: RESOLUTION_INFO[resolution].color,
                count: resolutionJobs.length,
                avg: total / resolutionJobs.length,
                total,
            };
        }).filter(Boolean) as Array<{ resolution: ResolutionBucket; label: string; color: string; count: number; avg: number; total: number }>;
    }, [completedJobs]);

    const maxResolutionTotal = useMemo(
        () => Math.max(...breakdownRows.map(row => row.total), 0),
        [breakdownRows]
    );

    // ── Top users ───────────────────────────────────────────────────────────
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

    const maxUserCount = useMemo(
        () => Math.max(...topUsers.map(u => u.count), 0),
        [topUsers]
    );

    // ── Chart series config ─────────────────────────────────────────────────
    const showRightAxis = visibleSeries.revenue || visibleSeries.aiCost;
    const toggleSeries = (key: keyof VisibleSeries) =>
        setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));

    const seriesConfig: { key: keyof VisibleSeries; label: string; color: string }[] = [
        { key: 'generierungen', label: 'Generierungen', color: '#f97316' },
        { key: 'newUsers', label: 'Neue Nutzer', color: '#3b82f6' },
        { key: 'failedJobs', label: 'Fehler', color: '#ef4444' },
        { key: 'revenue', label: 'Einnahmen', color: '#10b981' },
        { key: 'aiCost', label: 'Kosten', color: '#a855f7' },
    ];

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="flex flex-col">
            <AdminViewHeader title="Statistiken" />
            <div className="px-6 md:px-8 py-6 space-y-6">

                {/* ── Kennzahlen ── */}
                <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1">Finanzen</p>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <StatTile
                            label="Einnahmen"
                            value={stripeRevenue != null ? `${stripeRevenue.toFixed(2)} €` : '—'}
                            sub={`${stripePaymentCount} Zahlungen`}
                            valueColor="text-emerald-600 dark:text-emerald-400"
                            trend={stripeRevenue != null && stripeRevenue > 0 ? 'up' : 'neutral'}
                            trendColor="emerald"
                        />
                        <StatTile
                            label="Kosten Bilder"
                            value={`${googleAiCost.toFixed(2)} €`}
                            sub={`${completedJobs.length} Generierungen`}
                            valueColor="text-red-500"
                            trend="neutral"
                        />
                        <StatTile
                            label="Kosten Voice"
                            value={`${voiceStats.costEur.toFixed(2)} €`}
                            sub={`${voiceStats.sessionCount} Sessions · ${Math.round(voiceStats.totalMinutes)} Min.`}
                            valueColor="text-orange-500"
                            trend="neutral"
                        />
                        <StatTile
                            label="Gewinn"
                            value={profit != null ? `${profit.toFixed(2)} €` : '—'}
                            sub={margin != null ? `Marge ${margin.toFixed(0)} %` : '—'}
                            valueColor={profit != null && profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}
                            trend={profit != null ? (profit >= 0 ? 'up' : 'down') : 'neutral'}
                            trendColor={profit != null && profit >= 0 ? 'emerald' : 'red'}
                        />
                    </div>

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1 pt-2">Nutzer</p>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <StatTile
                            label="Nutzer gesamt"
                            value={String(profiles.length)}
                            sub={`${uniqueUsersWithJobs} aktiv`}
                            trend="neutral"
                        />
                        <StatTile
                            label="Aktivierungsrate"
                            value={`${activationRate.toFixed(1)} %`}
                            sub={`${uniqueUsersWithJobs} von ${profiles.length}`}
                            trend={activationRate >= 20 ? 'up' : 'down'}
                            trendColor={activationRate >= 20 ? 'emerald' : 'zinc'}
                        />
                        <StatTile
                            label="Neue Nutzer heute"
                            value={String(newSignupsToday)}
                            sub={`7 T: ${newSignups7d} · 30 T: ${newSignups30d}`}
                            trend={newSignupsToday >= Math.round(newSignups7d / 7) ? 'up' : 'down'}
                            trendColor={newSignupsToday >= Math.round(newSignups7d / 7) ? 'emerald' : 'zinc'}
                        />
                        <StatTile
                            label="Ø Gen. / Nutzer"
                            value={avgGenerationsPerUser.toFixed(1)}
                            sub={`${completedJobs.length} Jobs · ${uniqueUsersTotal} Nutzer`}
                            trend={avgGenerationsPerUser >= 3 ? 'up' : 'neutral'}
                            trendColor="emerald"
                        />
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <StatTile
                            label="Fehlerrate"
                            value={`${errorRate.toFixed(1)} %`}
                            sub={`${failedJobs.length} Fehler · ${jobs.length} Jobs`}
                            valueColor={errorRate > 10 ? 'text-red-500' : errorRate > 5 ? 'text-orange-500' : undefined}
                            trend={errorRate > 10 ? 'up' : errorRate < 3 ? 'down' : 'neutral'}
                            trendColor={errorRate > 10 ? 'red' : 'emerald'}
                            trendInvert
                        />
                    </div>
                </div>

                {/* ── Kombiniertes Diagramm ── */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold">Verlauf</h3>
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

                    {/* Series toggles */}
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                        {seriesConfig.map(({ key, label, color }) => (
                            <button
                                key={key}
                                onClick={() => toggleSeries(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                    visibleSeries[key]
                                        ? 'border-transparent text-white'
                                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 bg-transparent'
                                }`}
                                style={visibleSeries[key] ? { backgroundColor: color } : {}}
                            >
                                <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: visibleSeries[key] ? '#fff' : color }}
                                />
                                {label}
                                {(key === 'revenue' || key === 'aiCost') && ' (€)'}
                            </button>
                        ))}
                    </div>

                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={combinedChartData} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                                <XAxis dataKey="_label" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                    allowDecimals={false} />
                                {showRightAxis && (
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                        tickFormatter={v => `${Number(v).toFixed(2)}€`} />
                                )}
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f1f1', borderRadius: '10px', fontSize: '11px' }}
                                    formatter={(value: any, name: string) => {
                                        if (name === '_revenue') return [`${Number(value).toFixed(2)} €`, 'Einnahmen'];
                                        if (name === '_aiCost') return [`${Number(value).toFixed(3)} €`, 'AI-Kosten'];
                                        if (name === '_newUsers') return [value, 'Neue Nutzer'];
                                        if (name === '_failedJobs') return [value, 'Fehler'];
                                        const info = RESOLUTION_INFO[name as ResolutionBucket];
                                        return [value, info?.label ?? name];
                                    }}
                                />

                                {/* Stacked bars: generierungen by resolution */}
                                {visibleSeries.generierungen && resolutionKeys.map((res, i) => (
                                    <Bar
                                        key={res}
                                        yAxisId="left"
                                        dataKey={res}
                                        stackId="gen"
                                        fill={RESOLUTION_INFO[res].color}
                                        radius={i === resolutionKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}

                                {/* Lines: count */}
                                {visibleSeries.newUsers && (
                                    <Line yAxisId="left" type="monotone" dataKey="_newUsers"
                                        stroke="#3b82f6" strokeWidth={2.5} connectNulls
                                        dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                )}
                                {visibleSeries.failedJobs && (
                                    <Line yAxisId="left" type="monotone" dataKey="_failedJobs"
                                        stroke="#ef4444" strokeWidth={2.5} connectNulls
                                        dot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                                )}

                                {/* Lines: € right axis */}
                                {visibleSeries.revenue && (
                                    <Line yAxisId="right" type="monotone" dataKey="_revenue"
                                        stroke="#10b981" strokeWidth={2.5} connectNulls
                                        dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                                )}
                                {visibleSeries.aiCost && (
                                    <Line yAxisId="right" type="monotone" dataKey="_aiCost"
                                        stroke="#a855f7" strokeWidth={2.5} connectNulls
                                        dot={{ r: 4, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Aufschlüsselung nach Auflösung + Voice ── */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-sm font-bold">Aufschlüsselung</h3>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-medium text-zinc-500">
                                <th className="px-6 py-3">Art</th>
                                <th className="px-6 py-3 text-right">Anzahl</th>
                                <th className="px-6 py-3 text-right">Ø Kosten</th>
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
                                    <td className="px-6 py-3 text-right font-mono text-xs text-zinc-400">{row.avg.toFixed(3)} €</td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{row.total.toFixed(2)} €</span>
                                            <div className="w-24 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                <div className="h-full rounded-full"
                                                    style={{
                                                        width: maxResolutionTotal > 0 ? `${(row.total / maxResolutionTotal) * 100}%` : '0%',
                                                        backgroundColor: row.color,
                                                    }} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {/* Voice row */}
                            {voiceStats.sessionCount > 0 && (
                                <tr className="text-sm hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                    <td className="px-6 py-3">
                                        <span className="font-bold text-[11px] uppercase text-orange-500">Voice</span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium">{voiceStats.sessionCount} Sessions</td>
                                    <td className="px-6 py-3 text-right font-mono text-xs text-zinc-400">
                                        {voiceStats.sessionCount > 0 ? (voiceStats.costEur / voiceStats.sessionCount).toFixed(3) : '—'} €
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                        {voiceStats.costEur.toFixed(2)} €
                                    </td>
                                </tr>
                            )}

                            {/* Totals */}
                            <tr className="bg-zinc-50/30 dark:bg-zinc-800/20 font-bold text-sm">
                                <td className="px-6 py-3 text-[11px] font-medium text-zinc-500">Gesamt</td>
                                <td className="px-6 py-3 text-right">{completedJobs.length}</td>
                                <td className="px-6 py-3" />
                                <td className="px-6 py-3 text-right font-mono text-xs text-red-500">{totalAiCost.toFixed(2)} €</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── Häufigste Nutzer ── */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-sm font-bold">Häufigste Nutzer</h3>
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
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-mono text-sm text-zinc-500">{user.count}</span>
                                            <div className="w-24 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                <div className="h-full rounded-full bg-zinc-500 dark:bg-zinc-400"
                                                    style={{ width: maxUserCount > 0 ? `${(user.count / maxUserCount) * 100}%` : '0%' }} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {topUsers.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-zinc-400">
                                        Keine Daten
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

// ── Helper: ISO week ────────────────────────────────────────────────────────
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

// ── StatTile ─────────────────────────────────────────────────────────────────
type TrendDir = 'up' | 'down' | 'neutral';
type TrendColor = 'emerald' | 'red' | 'zinc' | undefined;

const TREND_COLORS: Record<NonNullable<TrendColor>, string> = {
    emerald: 'text-emerald-500',
    red: 'text-red-500',
    zinc: 'text-zinc-400',
};

const StatTile = ({ label, value, sub, valueColor, trend = 'neutral', trendColor, trendInvert }: {
    label: string; value: string; sub?: string;
    valueColor?: string; trend?: TrendDir; trendColor?: TrendColor; trendInvert?: boolean;
}) => {
    const effectiveTrend = trendInvert
        ? (trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'neutral')
        : trend;
    const colorClass = trendColor ? TREND_COLORS[trendColor] : 'text-zinc-400';
    const TrendIcon = effectiveTrend === 'up' ? TrendingUp : effectiveTrend === 'down' ? TrendingDown : Minus;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-400 leading-none">{label}</span>
                {trend !== 'neutral' && (
                    <TrendIcon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
                )}
            </div>
            <div className={`text-xl font-bold font-mono tracking-tight leading-none ${valueColor ?? 'text-zinc-900 dark:text-zinc-100'}`}>
                {value}
            </div>
            {sub && <div className="text-[10px] text-zinc-400 leading-tight">{sub}</div>}
        </div>
    );
};
