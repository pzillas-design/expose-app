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
type ResolutionBucket = '0.5K' | '1K' | '2K' | '4K' | 'Other';
type SeriesKey =
    | 'totalUsers' | 'activationRate'
    | 'generierungen'
    | 'res05K' | 'res1K' | 'res2K' | 'res4K'
    | 'voiceSessions' | 'failedJobs'
    | 'revenue' | 'aiCost' | 'profit';

const USD_TO_EUR = 0.92;
const GOOGLE_INPUT_TEXT_IMAGE_USD_PER_M = 0.5;
const GOOGLE_OUTPUT_IMAGE_USD_PER_M = 60;
const EXCLUDED_EMAILS = ['pzillas@gmail.com'];

const RESOLUTION_INFO: Record<ResolutionBucket, { label: string; color: string; fallbackUsd: number }> = {
    '0.5K': { label: '0.5K', color: '#a3a3a3', fallbackUsd: 0.04 },
    '1K':   { label: '1K',   color: '#eab308', fallbackUsd: 0.067 },
    '2K':   { label: '2K',   color: '#f97316', fallbackUsd: 0.101 },
    '4K':   { label: '4K',   color: '#ef4444', fallbackUsd: 0.151 },
    'Other':{ label: 'Other',color: '#71717a', fallbackUsd: 0 },
};
const RESOLUTION_ORDER: ResolutionBucket[] = ['0.5K', '1K', '2K', '4K', 'Other'];

// Resolution → SeriesKey mapping
const RES_TO_SERIES: Partial<Record<ResolutionBucket, SeriesKey>> = {
    '0.5K': 'res05K', '1K': 'res1K', '2K': 'res2K', '4K': 'res4K',
};
// SeriesKey → dataKey in chart
const SERIES_DATAKEY: Partial<Record<SeriesKey, string>> = {
    res05K: '0.5K', res1K: '1K', res2K: '2K', res4K: '4K',
    totalUsers: '_totalUsers', activationRate: '_activationRate',
    voiceSessions: '_voiceSessions', failedJobs: '_failedJobs',
    revenue: '_revenue', aiCost: '_aiCost', profit: '_profit',
};

type SeriesConfig = { key: SeriesKey; label: string; color: string; axis: 'left' | 'right'; note?: string; type: 'bar' | 'line' };
const SERIES_CONFIG: SeriesConfig[] = [
    { key: 'totalUsers',     label: 'Nutzer gesamt',    color: '#3b82f6', axis: 'left',  type: 'line' },
    { key: 'activationRate', label: 'Aktivierungsrate', color: '#8b5cf6', axis: 'right', type: 'line', note: '%' },
    { key: 'generierungen',  label: 'Generierungen',    color: '#f97316', axis: 'left',  type: 'bar' },
    { key: 'res4K',          label: '4K',               color: '#ef4444', axis: 'left',  type: 'bar' },
    { key: 'res2K',          label: '2K',               color: '#f97316', axis: 'left',  type: 'bar' },
    { key: 'res1K',          label: '1K',               color: '#eab308', axis: 'left',  type: 'bar' },
    { key: 'res05K',         label: '0.5K',             color: '#a3a3a3', axis: 'left',  type: 'bar' },
    { key: 'voiceSessions',  label: 'Voice Sessions',   color: '#06b6d4', axis: 'left',  type: 'bar' },
    { key: 'failedJobs',     label: 'Fehler',           color: '#dc2626', axis: 'left',  type: 'line' },
    { key: 'revenue',        label: 'Einnahmen',        color: '#10b981', axis: 'right', type: 'line', note: 'Monat/Jahr' },
    { key: 'aiCost',         label: 'AI-Kosten',        color: '#a855f7', axis: 'right', type: 'line' },
    { key: 'profit',         label: 'Gewinn',           color: '#059669', axis: 'right', type: 'line', note: 'Monat/Jahr' },
];

const getResolutionBucket = (job: any): ResolutionBucket => {
    const value = String(job.imageSize || job.qualityMode || job.model || '').toLowerCase();
    if (value.includes('4k'))  return '4K';
    if (value.includes('2k'))  return '2K';
    if (value.includes('1k'))  return '1K';
    if (value.includes('0.5') || value.includes('05k') || value.includes('sd') || value.includes('512')) return '0.5K';
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
    if (range === 'tag')   return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (range === 'woche') return isoWeekKey(d);
    if (range === 'monat') return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return String(d.getFullYear());
}
function makeBucketLabel(d: Date, range: TimeRange): string {
    if (range === 'tag')   return d.toLocaleString('de-DE', { day: '2-digit', month: 'short' });
    if (range === 'woche') return `KW${isoWeekNum(d)}`;
    if (range === 'monat') return d.toLocaleString('de-DE', { month: 'short' });
    return String(d.getFullYear());
}
function seedBuckets(range: TimeRange, now: Date): Record<string, any> {
    const b: Record<string, any> = {};
    if (range === 'tag') {
        for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    } else if (range === 'woche') {
        for (let i = 9; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i*7); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    } else if (range === 'monat') {
        for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth()-i, 1); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    } else {
        for (let i = 2; i >= 0; i--) { const d = new Date(now.getFullYear()-i, 0, 1); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    }
    return b;
}

const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: 'tag', label: 'Tag' }, { id: 'woche', label: 'Woche' },
    { id: 'monat', label: 'Monat' }, { id: 'jahr', label: 'Jahr' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs,           setJobs]           = useState<any[]>([]);
    const [profiles,       setProfiles]       = useState<any[]>([]);
    const [rawVoice,       setRawVoice]       = useState<any[]>([]);
    const [stripeRevenue,  setStripeRevenue]  = useState<number | null>(null);
    const [stripePayCount, setStripePayCount] = useState(0);
    const [stripeMonthly,  setStripeMonthly]  = useState<Record<string, number>>({});
    const [voiceTotals,    setVoiceTotals]    = useState<{ sessionCount: number; totalMinutes: number; costEur: number }>({ sessionCount: 0, totalMinutes: 0, costEur: 0 });
    const [loading,        setLoading]        = useState(true);
    const [timeRange,      setTimeRange]      = useState<TimeRange>('tag');
    const [visible,        setVisible]        = useState<Record<SeriesKey, boolean>>({
        totalUsers: true, activationRate: false,
        generierungen: true,
        res4K: false, res2K: false, res1K: false, res05K: false,
        voiceSessions: false, failedJobs: false,
        revenue: false, aiCost: false, profit: false,
    });

    const toggle = (key: SeriesKey) => setVisible(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [jobsData, voiceSessions, profilesResult, { data: { session } }] = await Promise.all([
                    adminService.getJobs(),
                    adminService.getVoiceSessions(500),
                    supabase.from('profiles').select('id, created_at, email'),
                    supabase.auth.getSession()
                ]);
                const filteredJobs  = jobsData.filter((j: any) => !EXCLUDED_EMAILS.includes(j.userEmail));
                const filteredVoice = voiceSessions.filter((s: any) => !EXCLUDED_EMAILS.includes(s.userEmail));
                const filteredProfs = (profilesResult.data || []).filter((p: any) => !EXCLUDED_EMAILS.includes(p.email));
                setJobs(filteredJobs);
                setProfiles(filteredProfs);
                setRawVoice(filteredVoice);

                const VOICE_USD_PER_MIN = 0.043;
                const mins = filteredVoice.reduce((s: number, v: any) => s + (v.durationMs || 0) / 60000, 0);
                setVoiceTotals({ sessionCount: filteredVoice.length, totalMinutes: mins, costEur: mins * VOICE_USD_PER_MIN * USD_TO_EUR });

                if (session?.access_token) {
                    const start = new Date(); start.setDate(start.getDate() - 90);
                    const res = await supabase.functions.invoke('admin-stats', {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        body: { startDate: start.toISOString() },
                    });
                    if (!res.error && res.data) {
                        setStripeRevenue(res.data.totalRevenue ?? 0);
                        setStripePayCount(res.data.paymentCount ?? 0);
                        setStripeMonthly(res.data.monthlyRevenue ?? {});
                    } else { setStripeRevenue(0); setStripePayCount(0); setStripeMonthly({}); }
                } else { setStripeRevenue(0); setStripePayCount(0); setStripeMonthly({}); }
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
    const totalAiCost   = googleAiCost + voiceTotals.costEur;
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

    // Resolution counts for sidebar display
    const resCounts = useMemo(() => {
        const counts: Partial<Record<ResolutionBucket, number>> = {};
        completedJobs.forEach(j => { const r = getResolutionBucket(j); counts[r] = (counts[r] || 0) + 1; });
        return counts;
    }, [completedJobs]);

    // ── Chart data ────────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        const buckets = seedBuckets(timeRange, now);
        const keys = Object.keys(buckets);

        // First job per user (for activation rate)
        const firstJobTs = new Map<string, number>();
        completedJobs.forEach(job => {
            const uid = job.userEmail || job.userName;
            const ts = new Date(job.createdAt).getTime();
            if (!firstJobTs.has(uid) || firstJobTs.get(uid)! > ts) firstJobTs.set(uid, ts);
        });

        // Resolution counts + AI cost + total jobs per bucket
        completedJobs.forEach(job => {
            const key = makeBucketKey(new Date(job.createdAt), timeRange);
            if (!buckets[key]) return;
            const res = getResolutionBucket(job);
            buckets[key][res] = (buckets[key][res] || 0) + 1;
            buckets[key]._totalJobs = (buckets[key]._totalJobs || 0) + 1;
            buckets[key]._aiCost = (buckets[key]._aiCost || 0) + calculateEstimatedGoogleCostEur(job);
        });

        // Failed jobs
        failedJobs.forEach(job => {
            const key = makeBucketKey(new Date(job.createdAt), timeRange);
            if (buckets[key]) buckets[key]._failedJobs = (buckets[key]._failedJobs || 0) + 1;
        });

        // New users per bucket (for cumulative sum)
        profiles.forEach(p => {
            const key = makeBucketKey(new Date(p.created_at), timeRange);
            if (buckets[key]) buckets[key]._newInPeriod = (buckets[key]._newInPeriod || 0) + 1;
        });

        // Voice sessions per bucket
        rawVoice.forEach(s => {
            const ts = s.startedAt || s.createdAt || s.started_at;
            if (!ts) return;
            const key = makeBucketKey(new Date(ts), timeRange);
            if (buckets[key]) buckets[key]._voiceSessions = (buckets[key]._voiceSessions || 0) + 1;
        });

        // Revenue (only for monat/jahr)
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

        // Post-process: cumulative totalUsers + activation rate
        // We need to count profiles and activated users UP TO each bucket's start date
        // For the displayed window, compute running sums over the bucket keys in order
        let cumulativeUsers = 0;
        let cumulativeActivated = 0;

        // Count profiles/activations BEFORE the window starts
        const firstBucketStart = keys.length > 0 ? getBucketStartTs(keys[0], timeRange) : 0;
        profiles.forEach(p => {
            if (new Date(p.created_at).getTime() < firstBucketStart) cumulativeUsers++;
        });
        firstJobTs.forEach((ts, uid) => {
            if (ts < firstBucketStart) cumulativeActivated++;
        });

        keys.forEach(key => {
            cumulativeUsers     += buckets[key]._newInPeriod || 0;
            // Count users whose first job falls in this bucket
            const bucketStart = getBucketStartTs(key, timeRange);
            const bucketEnd   = getBucketEndTs(key, timeRange);
            firstJobTs.forEach(ts => {
                if (ts >= bucketStart && ts < bucketEnd) cumulativeActivated++;
            });
            buckets[key]._totalUsers     = cumulativeUsers;
            buckets[key]._activationRate = cumulativeUsers > 0
                ? Math.round((cumulativeActivated / cumulativeUsers) * 100)
                : 0;
            // Profit
            if (buckets[key]._revenue != null && buckets[key]._aiCost != null) {
                buckets[key]._profit = buckets[key]._revenue - buckets[key]._aiCost;
            }
        });

        return Object.values(buckets);
    }, [completedJobs, failedJobs, profiles, rawVoice, stripeMonthly, timeRange]);

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

    const showRightAxis = visible.revenue || visible.aiCost || visible.activationRate || visible.profit;

    const activationDonut = [
        { name: 'Aktiviert',  value: uniqueUsersWithJobs,                                color: '#10b981' },
        { name: 'Noch nicht', value: Math.max(0, profiles.length - uniqueUsersWithJobs), color: '#e4e4e7' },
    ];

    // Which bars exist in data
    const existingResKeys: ResolutionBucket[] = ['4K', '2K', '1K', '0.5K'].filter(
        r => completedJobs.some(j => getResolutionBucket(j) === r)
    ) as ResolutionBucket[];

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <AdminViewHeader title="Statistiken" />

            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ── LEFT: Metrics list ────────────────────────────────── */}
                <aside className="w-72 shrink-0 border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto">
                    <div className="p-4 space-y-6">

                        {/* Chart series */}
                        <div>
                            <ListSectionLabel>Im Graphen</ListSectionLabel>
                            <div className="space-y-0.5 mt-2">
                                {SERIES_CONFIG.map(s => (
                                    <SeriesRow
                                        key={s.key}
                                        color={s.color}
                                        label={s.label}
                                        checked={visible[s.key]}
                                        onToggle={() => toggle(s.key)}
                                        note={s.note}
                                        value={seriesCurrentValue(s.key, {
                                            completedJobs, failedJobs, profiles, rawVoice,
                                            stripeRevenue, voiceTotals, googleAiCost, profit,
                                            activationRate, newSignups30d, resCounts,
                                        })}
                                        sub={seriesSubValue(s.key, {
                                            uniqueUsersTotal, stripePayCount, newSignupsToday, newSignups7d,
                                            errorRate, voiceTotals, newSignups30d,
                                        })}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Display-only */}
                        <div>
                            <ListSectionLabel>Kennzahlen</ListSectionLabel>
                            <div className="mt-2 space-y-px">
                                <DisplayRow label="Kosten Voice"
                                    value={`${voiceTotals.costEur.toFixed(2)} €`}
                                    sub={`${voiceTotals.sessionCount} Sessions · ${Math.round(voiceTotals.totalMinutes)} Min.`} />
                                <DisplayRow label="Ø Gen. / Nutzer" value={avgGen.toFixed(1)} />
                                <DisplayRow label="Fehlerrate"
                                    value={`${errorRate.toFixed(1)} %`}
                                    trend={errorRate > 10 ? 'up' : errorRate < 3 ? 'down' : undefined}
                                    trendColor={errorRate > 10 ? '#ef4444' : '#10b981'} />
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
                                        ({Math.max(0, profiles.length - uniqueUsersWithJobs)})
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

                {/* ── RIGHT: Chart ─────────────────────────────────────── */}
                <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                    <div className="p-6 flex flex-col gap-4 h-full">

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

                        <div className="flex-1 min-h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} barSize={timeRange === 'tag' ? 12 : timeRange === 'woche' ? 20 : 28}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                                    <XAxis dataKey="_label" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }} allowDecimals={false} />
                                    {showRightAxis && (
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                            tickFormatter={v => {
                                                if (visible.activationRate && !visible.revenue && !visible.aiCost && !visible.profit) return `${v}%`;
                                                return `${Number(v).toFixed(0)}€`;
                                            }} />
                                    )}
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f1f1', borderRadius: '10px', fontSize: '11px' }}
                                        formatter={(value: any, name: string) => {
                                            const s = SERIES_CONFIG.find(s => SERIES_DATAKEY[s.key] === name || s.key.replace('res', '').replace('0', '0.') === name);
                                            if (name === '_totalJobs')      return [value, 'Generierungen'];
                                            if (name === '_totalUsers')     return [value, 'Nutzer gesamt'];
                                            if (name === '_activationRate') return [`${value} %`, 'Aktivierungsrate'];
                                            if (name === '_voiceSessions')  return [value, 'Voice Sessions'];
                                            if (name === '_failedJobs')     return [value, 'Fehler'];
                                            if (name === '_revenue')        return [`${Number(value).toFixed(2)} €`, 'Einnahmen'];
                                            if (name === '_aiCost')         return [`${Number(value).toFixed(2)} €`, 'AI-Kosten'];
                                            if (name === '_profit')         return [`${Number(value).toFixed(2)} €`, 'Gewinn'];
                                            if (RESOLUTION_INFO[name as ResolutionBucket]) return [value, RESOLUTION_INFO[name as ResolutionBucket].label];
                                            return [value, name];
                                        }}
                                    />

                                    {/* Generierungen gesamt (single bar, no subdivision) */}
                                    {visible.generierungen && (
                                        <Bar yAxisId="left" dataKey="_totalJobs" stackId="total"
                                            fill="#f97316" radius={[4, 4, 0, 0]} />
                                    )}

                                    {/* Resolution bars — individual, separately toggleable */}
                                    {existingResKeys.map((res, i) => {
                                        const seriesKey = RES_TO_SERIES[res];
                                        if (!seriesKey || !visible[seriesKey]) return null;
                                        const isTop = existingResKeys.filter(r => {
                                            const sk = RES_TO_SERIES[r]; return sk && visible[sk];
                                        }).slice(-1)[0] === res;
                                        return (
                                            <Bar key={res} yAxisId="left" dataKey={res} stackId="gen"
                                                fill={RESOLUTION_INFO[res].color}
                                                radius={isTop ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                        );
                                    })}

                                    {/* Voice bars */}
                                    {visible.voiceSessions && (
                                        <Bar yAxisId="left" dataKey="_voiceSessions" stackId="voice"
                                            fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                    )}

                                    {/* Lines — left axis */}
                                    {visible.totalUsers && (
                                        <Line yAxisId="left" type="monotone" dataKey="_totalUsers" stroke="#3b82f6" strokeWidth={2.5} connectNulls
                                            dot={{ r: 3, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                    )}
                                    {visible.failedJobs && (
                                        <Line yAxisId="left" type="monotone" dataKey="_failedJobs" stroke="#dc2626" strokeWidth={2.5} connectNulls
                                            dot={{ r: 3, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }} />
                                    )}

                                    {/* Lines — right axis */}
                                    {visible.activationRate && (
                                        <Line yAxisId="right" type="monotone" dataKey="_activationRate" stroke="#8b5cf6" strokeWidth={2.5} connectNulls
                                            dot={{ r: 3, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
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
                                    {visible.profit && (
                                        <Line yAxisId="right" type="monotone" dataKey="_profit" stroke="#059669" strokeWidth={2.5} connectNulls
                                            dot={{ r: 3, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                                            activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
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

// ── Bucket timestamp helpers ───────────────────────────────────────────────────
function getBucketStartTs(key: string, range: TimeRange): number {
    if (range === 'tag') return new Date(key).getTime();
    if (range === 'woche') {
        const [year, week] = key.split('-W').map(Number);
        const jan1 = new Date(Date.UTC(year, 0, 1));
        return jan1.getTime() + (week - 1) * 7 * 86400000;
    }
    if (range === 'monat') return new Date(key + '-01').getTime();
    return new Date(key + '-01-01').getTime();
}
function getBucketEndTs(key: string, range: TimeRange): number {
    if (range === 'tag')   return getBucketStartTs(key, range) + 86400000;
    if (range === 'woche') return getBucketStartTs(key, range) + 7 * 86400000;
    if (range === 'monat') {
        const [y, m] = key.split('-').map(Number);
        return new Date(y, m, 1).getTime(); // first day of next month
    }
    return new Date(Number(key) + 1, 0, 1).getTime();
}

// ── Sidebar value helpers ─────────────────────────────────────────────────────
function seriesCurrentValue(key: SeriesKey, d: any): string {
    switch (key) {
        case 'totalUsers':     return String(d.profiles.length);
        case 'activationRate': return `${d.activationRate.toFixed(1)} %`;
        case 'generierungen':  return String(d.completedJobs.length);
        case 'res4K':          return String(d.resCounts['4K'] || 0);
        case 'res2K':          return String(d.resCounts['2K'] || 0);
        case 'res1K':          return String(d.resCounts['1K'] || 0);
        case 'res05K':         return String(d.resCounts['0.5K'] || 0);
        case 'voiceSessions':  return String(d.voiceTotals.sessionCount);
        case 'failedJobs':     return String(d.failedJobs.length);
        case 'revenue':        return d.stripeRevenue != null ? `${d.stripeRevenue.toFixed(2)} €` : '—';
        case 'aiCost':         return `${d.googleAiCost.toFixed(2)} €`;
        case 'profit':         return d.profit != null ? `${d.profit.toFixed(2)} €` : '—';
        default:               return '—';
    }
}
function seriesSubValue(key: SeriesKey, d: any): string | undefined {
    switch (key) {
        case 'generierungen':  return `${d.uniqueUsersTotal} aktive Nutzer`;
        case 'totalUsers':     return `Heute +${d.newSignupsToday} · 7T +${d.newSignups7d}`;
        case 'activationRate': return `haben mind. 1x generiert`;
        case 'res4K': case 'res2K': case 'res1K': case 'res05K': return 'Generierungen';
        case 'voiceSessions':  return `${Math.round(d.voiceTotals.totalMinutes)} Min.`;
        case 'failedJobs':     return `${d.errorRate.toFixed(1)} % Fehlerrate`;
        case 'revenue':        return `${d.stripePayCount} Zahlungen`;
        case 'aiCost':         return undefined;
        case 'profit':         return undefined;
        default: return undefined;
    }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const ListSectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">{children}</p>
);

const SeriesRow: React.FC<{
    color: string; label: string; checked: boolean; onToggle: () => void;
    value: string; sub?: string; note?: string;
}> = ({ color, label, checked, onToggle, value, sub, note }) => (
    <button onClick={onToggle}
        className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
            checked ? 'bg-zinc-50 dark:bg-zinc-800/60' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
        }`}>
        <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
            style={checked ? { backgroundColor: color, borderColor: color } : { borderColor: '#d4d4d8' }}>
            {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold leading-none ${checked ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>
                    {label}
                </span>
                {note && <span className="text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">{note}</span>}
            </div>
            <div className="text-sm font-bold font-mono mt-0.5 leading-none" style={{ color: checked ? color : '#a1a1aa' }}>
                {value}
            </div>
            {sub && <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{sub}</div>}
        </div>
    </button>
);

const DisplayRow: React.FC<{
    label: string; value: string; sub?: string; trend?: 'up' | 'down'; trendColor?: string;
}> = ({ label, value, sub, trend, trendColor }) => (
    <div className="flex items-center justify-between px-2 py-2">
        <div className="min-w-0">
            <div className="text-[10px] text-zinc-400">{label}</div>
            {sub && <div className="text-[10px] text-zinc-400 leading-tight">{sub}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
            {trend && (trend === 'up'
                ? <TrendingUp className="w-3 h-3" style={{ color: trendColor }} />
                : <TrendingDown className="w-3 h-3" style={{ color: trendColor }} />)}
            <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
    </div>
);
