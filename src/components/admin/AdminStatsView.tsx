import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Check } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Bar, Line, ComposedChart, PieChart, Pie, Cell,
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
type SeriesKey = 'generierungen' | 'newUsers' | 'failedJobs' | 'revenue' | 'aiCost';

const USD_TO_EUR = 0.92;
const GOOGLE_INPUT_TEXT_IMAGE_USD_PER_M = 0.5;
const GOOGLE_OUTPUT_IMAGE_USD_PER_M = 60;
const EXCLUDED_EMAILS = ['pzillas@gmail.com'];

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

// Series that can appear in the chart
const SERIES_CONFIG: { key: SeriesKey; label: string; color: string; axis: 'left' | 'right'; note?: string }[] = [
    { key: 'generierungen', label: 'Generierungen', color: '#f97316', axis: 'left' },
    { key: 'newUsers',      label: 'Neue Nutzer',   color: '#3b82f6', axis: 'left' },
    { key: 'failedJobs',    label: 'Fehler',        color: '#ef4444', axis: 'left' },
    { key: 'revenue',       label: 'Einnahmen',     color: '#10b981', axis: 'right', note: 'Monat/Jahr' },
    { key: 'aiCost',        label: 'AI-Kosten',     color: '#a855f7', axis: 'right' },
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

// ── Bucket helpers ────────────────────────────────────────────────────────────
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
function makeBucketKey(d: Date, range: TimeRange): string {
    if (range === 'tag') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (range === 'woche') return isoWeekKey(d);
    if (range === 'monat') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return String(d.getFullYear());
}
function makeBucketLabel(d: Date, range: TimeRange): string {
    if (range === 'tag') return d.toLocaleString('de-DE', { day: '2-digit', month: 'short' });
    if (range === 'woche') return `KW${isoWeekNum(d)}`;
    if (range === 'monat') return d.toLocaleString('de-DE', { month: 'short' });
    return String(d.getFullYear());
}
function seedBuckets(range: TimeRange, now: Date): Record<string, any> {
    const b: Record<string, any> = {};
    if (range === 'tag') {
        for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); b[makeBucketKey(d, range)] = { _label: makeBucketLabel(d, range) }; }
    } else if (range === 'woche') {
        for (let i = 9; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i * 7); b[makeBucketKey(d, range)] = { _label: makeBucketLabel(d, range) }; }
    } else if (range === 'monat') {
        for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); b[makeBucketKey(d, range)] = { _label: makeBucketLabel(d, range) }; }
    } else {
        for (let i = 2; i >= 0; i--) { const d = new Date(now.getFullYear() - i, 0, 1); b[makeBucketKey(d, range)] = { _label: makeBucketLabel(d, range) }; }
    }
    return b;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePaymentCount, setStripePaymentCount] = useState(0);
    const [stripeMonthly, setStripeMonthly] = useState<Record<string, number>>({});
    const [voiceStats, setVoiceStats] = useState<{ sessionCount: number; totalMinutes: number; costEur: number }>({ sessionCount: 0, totalMinutes: 0, costEur: 0 });
    const [loading, setLoading] = useState(true);

    const [timeRange, setTimeRange] = useState<TimeRange>('tag');
    const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
        generierungen: true,
        newUsers: true,
        failedJobs: false,
        revenue: false,
        aiCost: false,
    });

    const toggle = (key: SeriesKey) => setVisible(prev => ({ ...prev, [key]: !prev[key] }));

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
                setJobs(jobsData.filter((j: any) => !EXCLUDED_EMAILS.includes(j.userEmail)));
                setProfiles((profilesResult.data || []).filter((p: any) => !EXCLUDED_EMAILS.includes(p.email)));

                const filteredVoice = voiceSessions.filter((s: any) => !EXCLUDED_EMAILS.includes(s.userEmail));
                const VOICE_USD_PER_MIN = 0.043;
                const mins = filteredVoice.reduce((s: number, v: any) => s + (v.durationMs || 0) / 60000, 0);
                setVoiceStats({ sessionCount: filteredVoice.length, totalMinutes: mins, costEur: mins * VOICE_USD_PER_MIN * USD_TO_EUR });

                if (session?.access_token) {
                    const start = new Date(); start.setDate(start.getDate() - 90);
                    const res = await supabase.functions.invoke('admin-stats', {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        body: { startDate: start.toISOString() },
                    });
                    if (!res.error && res.data) {
                        setStripeRevenue(res.data.totalRevenue ?? 0);
                        setStripePaymentCount(res.data.paymentCount ?? 0);
                        setStripeMonthly(res.data.monthlyRevenue ?? {});
                    } else { setStripeRevenue(0); setStripePaymentCount(0); setStripeMonthly({}); }
                } else { setStripeRevenue(0); setStripePaymentCount(0); setStripeMonthly({}); }
            } catch (e) {
                console.error('AdminStatsView fetch error:', e);
            } finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs    = jobs.filter(j => j.status === 'failed');
    const googleAiCost  = completedJobs.reduce((acc, j) => acc + calculateEstimatedGoogleCostEur(j), 0);
    const totalAiCost   = googleAiCost + voiceStats.costEur;
    const profit        = stripeRevenue != null ? stripeRevenue - totalAiCost : null;
    const margin        = stripeRevenue != null && stripeRevenue > 0 && profit != null ? (profit / stripeRevenue) * 100 : null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const newSignupsToday = profiles.filter(p => new Date(p.created_at).getTime() >= startOfToday).length;
    const newSignups7d    = profiles.filter(p => new Date(p.created_at).getTime() >= startOfToday - 6 * 86400000).length;
    const newSignups30d   = profiles.filter(p => new Date(p.created_at).getTime() >= startOfToday - 29 * 86400000).length;

    const uniqueUsersWithJobs = new Set(completedJobs.map(j => j.userEmail || j.userName)).size;
    const activationRate      = profiles.length > 0 ? (uniqueUsersWithJobs / profiles.length) * 100 : 0;
    const errorRate           = jobs.length > 0 ? (failedJobs.length / jobs.length) * 100 : 0;
    const uniqueUsersTotal    = new Set(jobs.map(j => j.userEmail || j.userName)).size;
    const avgGen              = uniqueUsersTotal > 0 ? completedJobs.length / uniqueUsersTotal : 0;

    const resolutionKeys = useMemo(() => {
        const found = new Set(completedJobs.map(getResolutionBucket));
        return RESOLUTION_ORDER.filter(k => found.has(k) && k !== 'Other');
    }, [completedJobs]);

    // ── Chart data ────────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        const buckets = seedBuckets(timeRange, now);
        completedJobs.forEach(job => {
            const key = makeBucketKey(new Date(job.createdAt), timeRange);
            if (!buckets[key]) return;
            const res = getResolutionBucket(job);
            buckets[key][res] = (buckets[key][res] || 0) + 1;
            buckets[key]._aiCost = (buckets[key]._aiCost || 0) + calculateEstimatedGoogleCostEur(job);
        });
        failedJobs.forEach(job => {
            const key = makeBucketKey(new Date(job.createdAt), timeRange);
            if (buckets[key]) buckets[key]._failedJobs = (buckets[key]._failedJobs || 0) + 1;
        });
        profiles.forEach(p => {
            const key = makeBucketKey(new Date(p.created_at), timeRange);
            if (buckets[key]) buckets[key]._newUsers = (buckets[key]._newUsers || 0) + 1;
        });
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

    // ── Top users ─────────────────────────────────────────────────────────────
    const topUsers = useMemo(() => {
        const byUser = new Map<string, { name: string; count: number }>();
        completedJobs.forEach(job => {
            const name = job.userName || 'Unknown';
            const cur = byUser.get(name) || { name, count: 0 };
            cur.count += 1; byUser.set(name, cur);
        });
        return Array.from(byUser.values()).sort((a, b) => b.count - a.count).slice(0, 8);
    }, [completedJobs]);
    const maxUserCount = Math.max(...topUsers.map(u => u.count), 0);

    const showRightAxis = visible.revenue || visible.aiCost;

    const activationDonut = [
        { name: 'Aktiviert',  value: uniqueUsersWithJobs,                               color: '#10b981' },
        { name: 'Noch nicht', value: Math.max(0, profiles.length - uniqueUsersWithJobs), color: '#e4e4e7' },
    ];

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <AdminViewHeader title="Statistiken" />

            {/* ── 1/3 + 2/3 layout ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ── LEFT: Metrics list ─────────────────────────────────── */}
                <aside className="w-72 shrink-0 border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto">
                    <div className="p-4 space-y-6">

                        {/* Chart-able series */}
                        <div>
                            <ListSectionLabel>Im Graphen</ListSectionLabel>
                            <div className="space-y-1 mt-2">
                                {SERIES_CONFIG.map(s => (
                                    <SeriesRow
                                        key={s.key}
                                        color={s.color}
                                        label={s.label}
                                        checked={visible[s.key]}
                                        onToggle={() => toggle(s.key)}
                                        note={s.note}
                                        value={
                                            s.key === 'generierungen' ? String(completedJobs.length) :
                                            s.key === 'newUsers'      ? `${newSignups30d} (30T)` :
                                            s.key === 'failedJobs'    ? String(failedJobs.length) :
                                            s.key === 'revenue'       ? (stripeRevenue != null ? `${stripeRevenue.toFixed(2)} €` : '—') :
                                            s.key === 'aiCost'        ? `${googleAiCost.toFixed(2)} €` : '—'
                                        }
                                        sub={
                                            s.key === 'generierungen' ? `${uniqueUsersTotal} aktive Nutzer` :
                                            s.key === 'newUsers'      ? `Heute ${newSignupsToday} · 7T ${newSignups7d}` :
                                            s.key === 'failedJobs'    ? `${errorRate.toFixed(1)} % Fehlerrate` :
                                            s.key === 'revenue'       ? `${stripePaymentCount} Zahlungen` :
                                            s.key === 'aiCost'        ? `${completedJobs.length} Generierungen` : ''
                                        }
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Display-only metrics */}
                        <div>
                            <ListSectionLabel>Kennzahlen</ListSectionLabel>
                            <div className="space-y-px mt-2">
                                <DisplayRow label="Gewinn"
                                    value={profit != null ? `${profit.toFixed(2)} €` : '—'}
                                    sub={margin != null ? `Marge ${margin.toFixed(0)} %` : undefined}
                                    trend={profit != null ? (profit >= 0 ? 'up' : 'down') : undefined}
                                    trendColor={profit != null ? (profit >= 0 ? '#10b981' : '#ef4444') : undefined} />
                                <DisplayRow label="Kosten Voice"
                                    value={`${voiceStats.costEur.toFixed(2)} €`}
                                    sub={`${voiceStats.sessionCount} Sessions · ${Math.round(voiceStats.totalMinutes)} Min.`} />
                                <DisplayRow label="Nutzer gesamt"
                                    value={String(profiles.length)}
                                    sub={`${uniqueUsersWithJobs} haben generiert`} />
                                <DisplayRow label="Aktivierungsrate"
                                    value={`${activationRate.toFixed(1)} %`}
                                    sub={`${uniqueUsersWithJobs} von ${profiles.length}`}
                                    trend={activationRate >= 20 ? 'up' : 'down'}
                                    trendColor={activationRate >= 20 ? '#10b981' : '#a1a1aa'} />
                                <DisplayRow label="Ø Gen. / Nutzer"
                                    value={avgGen.toFixed(1)} />
                            </div>
                        </div>

                        {/* Activation donut */}
                        <div>
                            <ListSectionLabel>Aktivierung</ListSectionLabel>
                            <div className="flex flex-col items-center pt-3 pb-1">
                                <div className="relative">
                                    <PieChart width={120} height={120}>
                                        <Pie data={activationDonut} cx={55} cy={55}
                                            innerRadius={38} outerRadius={54}
                                            dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                                            {activationDonut.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                    </PieChart>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-none">
                                            {activationRate.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                        Aktiviert ({uniqueUsersWithJobs})
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                        <span className="w-2 h-2 rounded-full bg-zinc-200 inline-block" />
                                        Noch nicht ({Math.max(0, profiles.length - uniqueUsersWithJobs)})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Top users */}
                        <div>
                            <ListSectionLabel>Top Nutzer</ListSectionLabel>
                            <div className="mt-2 space-y-1">
                                {topUsers.map(user => (
                                    <div key={user.name} className="flex items-center gap-2 py-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{user.name}</div>
                                            <div className="mt-0.5 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                <div className="h-full rounded-full bg-zinc-400"
                                                    style={{ width: maxUserCount > 0 ? `${(user.count / maxUserCount) * 100}%` : '0%' }} />
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-zinc-400 shrink-0">{user.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </aside>

                {/* ── RIGHT: Chart ───────────────────────────────────────── */}
                <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                    <div className="p-6 flex flex-col gap-4 h-full">

                        {/* Time range */}
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-zinc-400">
                                {SERIES_CONFIG.filter(s => visible[s.key]).map(s => s.label).join(' · ') || 'Nichts ausgewählt'}
                            </p>
                            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                                {TIME_RANGES.map(tr => (
                                    <button key={tr.id} onClick={() => setTimeRange(tr.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                            timeRange === tr.id
                                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                                        }`}>
                                        {tr.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="flex-1 min-h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} barSize={timeRange === 'tag' ? 14 : timeRange === 'woche' ? 22 : 32}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                                    <XAxis dataKey="_label" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }} allowDecimals={false} />
                                    {showRightAxis && (
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                            tickFormatter={v => `${Number(v).toFixed(0)}€`} />
                                    )}
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f1f1', borderRadius: '10px', fontSize: '11px' }}
                                        formatter={(value: any, name: string) => {
                                            if (name === '_newUsers')   return [value, 'Neue Nutzer'];
                                            if (name === '_failedJobs') return [value, 'Fehler'];
                                            if (name === '_revenue')    return [`${Number(value).toFixed(2)} €`, 'Einnahmen'];
                                            if (name === '_aiCost')     return [`${Number(value).toFixed(2)} €`, 'AI-Kosten'];
                                            return [value, RESOLUTION_INFO[name as ResolutionBucket]?.label ?? name];
                                        }}
                                    />
                                    {visible.generierungen && resolutionKeys.map((res, i) => (
                                        <Bar key={res} yAxisId="left" dataKey={res} stackId="gen"
                                            fill={RESOLUTION_INFO[res].color}
                                            radius={i === resolutionKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                    ))}
                                    {visible.newUsers && (
                                        <Line yAxisId="left" type="monotone" dataKey="_newUsers" stroke="#3b82f6" strokeWidth={2.5} connectNulls
                                            dot={{ r: 3, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                    )}
                                    {visible.failedJobs && (
                                        <Line yAxisId="left" type="monotone" dataKey="_failedJobs" stroke="#ef4444" strokeWidth={2.5} connectNulls
                                            dot={{ r: 3, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                                    )}
                                    {visible.revenue && (
                                        <Line yAxisId="right" type="monotone" dataKey="_revenue" stroke="#10b981" strokeWidth={2.5} connectNulls
                                            dot={{ r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                                    )}
                                    {visible.aiCost && (
                                        <Line yAxisId="right" type="monotone" dataKey="_aiCost" stroke="#a855f7" strokeWidth={2.5} connectNulls
                                            dot={{ r: 3, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                    </div>
                </main>

            </div>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ListSectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">{children}</p>
);

const SeriesRow: React.FC<{
    color: string; label: string; checked: boolean; onToggle: () => void;
    value: string; sub?: string; note?: string;
}> = ({ color, label, checked, onToggle, value, sub, note }) => (
    <button
        onClick={onToggle}
        className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
            checked ? 'bg-zinc-50 dark:bg-zinc-800/60' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
        }`}
    >
        {/* Checkbox */}
        <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
            style={checked
                ? { backgroundColor: color, borderColor: color }
                : { backgroundColor: 'transparent', borderColor: '#d4d4d8' }
            }>
            {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold leading-none ${checked ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>
                    {label}
                </span>
                {note && <span className="text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">{note}</span>}
            </div>
            <div className={`text-sm font-bold font-mono mt-0.5 leading-none`} style={{ color: checked ? color : '#a1a1aa' }}>
                {value}
            </div>
            {sub && <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{sub}</div>}
        </div>
    </button>
);

const DisplayRow: React.FC<{
    label: string; value: string; sub?: string;
    trend?: 'up' | 'down'; trendColor?: string;
}> = ({ label, value, sub, trend, trendColor }) => (
    <div className="flex items-center justify-between px-2 py-2">
        <div className="min-w-0">
            <div className="text-[10px] text-zinc-400">{label}</div>
            {sub && <div className="text-[10px] text-zinc-400 leading-tight">{sub}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
            {trend && (
                trend === 'up'
                    ? <TrendingUp className="w-3 h-3" style={{ color: trendColor }} />
                    : <TrendingDown className="w-3 h-3" style={{ color: trendColor }} />
            )}
            <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
    </div>
);
