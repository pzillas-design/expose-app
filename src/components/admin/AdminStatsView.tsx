import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Bar, Line, ComposedChart, PieChart, Pie, Cell,
} from 'recharts';
import { TranslationFunction } from '@/types';
import { adminService } from '@/services/adminService';
import { supabase } from '@/services/supabaseClient';
import { AdminViewHeader } from './AdminViewHeader';

interface AdminStatsViewProps { t: TranslationFunction; }

type TimeRange = '7d' | '14d' | '30d' | '60d' | 'all';
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
const RES_TO_SERIES: Partial<Record<ResolutionBucket, SeriesKey>> = {
    '0.5K': 'res05K', '1K': 'res1K', '2K': 'res2K', '4K': 'res4K',
};

type SeriesConfig = { key: SeriesKey; label: string; color: string; axis: 'left' | 'right'; note?: string };
const SERIES_CONFIG: SeriesConfig[] = [
    { key: 'totalUsers',     label: 'Nutzer gesamt',    color: '#3b82f6', axis: 'left'  },
    { key: 'activationRate', label: 'Aktivierungsrate', color: '#8b5cf6', axis: 'right', note: '%' },
    { key: 'generierungen',  label: 'Generierungen',    color: '#f97316', axis: 'left'  },
    { key: 'res4K',          label: '4K',               color: '#ef4444', axis: 'left'  },
    { key: 'res2K',          label: '2K',               color: '#f97316', axis: 'left'  },
    { key: 'res1K',          label: '1K',               color: '#eab308', axis: 'left'  },
    { key: 'res05K',         label: '0.5K',             color: '#a3a3a3', axis: 'left'  },
    { key: 'voiceSessions',  label: 'Voice Sessions',   color: '#06b6d4', axis: 'left'  },
    { key: 'failedJobs',     label: 'Fehler',           color: '#dc2626', axis: 'left'  },
    { key: 'revenue',        label: 'Einnahmen',        color: '#10b981', axis: 'right', note: 'Gesamt' },
    { key: 'aiCost',         label: 'AI-Kosten',        color: '#a855f7', axis: 'right' },
    { key: 'profit',         label: 'Gewinn',           color: '#059669', axis: 'right', note: 'Gesamt' },
];

const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: '7d',  label: '7 Tage'  },
    { id: '14d', label: '14 Tage' },
    { id: '30d', label: '30 Tage' },
    { id: '60d', label: '60 Tage' },
    { id: 'all', label: 'Gesamt'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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
    const wn = Math.ceil((((date.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
    return `${year}-W${String(wn).padStart(2, '0')}`;
}

function getBucketGrouping(range: TimeRange): 'day' | 'week' | 'month' {
    if (range === '7d' || range === '14d' || range === '30d') return 'day';
    if (range === '60d') return 'week';
    return 'month';
}

function makeBucketKey(d: Date, range: TimeRange): string {
    const g = getBucketGrouping(range);
    if (g === 'day')   return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (g === 'week')  return isoWeekKey(d);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function makeBucketLabel(d: Date, range: TimeRange): string {
    const g = getBucketGrouping(range);
    if (g === 'day')   return d.toLocaleString('de-DE', { day: '2-digit', month: 'short' });
    if (g === 'week')  return `KW${isoWeekNum(d)}`;
    return d.toLocaleString('de-DE', { month: 'short', year: '2-digit' });
}

function seedBuckets(range: TimeRange, now: Date): Record<string, any> {
    const b: Record<string, any> = {};
    if (range === '7d') {
        for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    } else if (range === '14d') {
        for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    } else if (range === '30d') {
        for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    } else if (range === '60d') {
        for (let i = 8; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i*7); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    } else {
        for (let i = 17; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth()-i, 1); b[makeBucketKey(d,range)] = { _label: makeBucketLabel(d,range) }; }
    }
    return b;
}

function getBucketStartTs(key: string, range: TimeRange): number {
    const g = getBucketGrouping(range);
    if (g === 'day')   return new Date(key).getTime();
    if (g === 'week')  { const [yr, wk] = key.split('-W').map(Number); const jan1 = new Date(Date.UTC(yr,0,1)); return jan1.getTime() + (wk-1)*7*86400000; }
    return new Date(key+'-01').getTime();
}
function getBucketEndTs(key: string, range: TimeRange): number {
    const g = getBucketGrouping(range);
    if (g === 'day')   return getBucketStartTs(key,range) + 86400000;
    if (g === 'week')  return getBucketStartTs(key,range) + 7*86400000;
    const [y,m] = key.split('-').map(Number);
    return new Date(y, m, 1).getTime();
}

const getResolutionBucket = (job: any): ResolutionBucket => {
    const v = String(job.imageSize || job.qualityMode || job.model || '').toLowerCase();
    if (v.includes('4k'))  return '4K';
    if (v.includes('2k'))  return '2K';
    if (v.includes('1k'))  return '1K';
    if (v.includes('0.5') || v.includes('05k') || v.includes('sd') || v.includes('512')) return '0.5K';
    return 'Other';
};
const calculateEstimatedGoogleCostEur = (job: any): number => {
    const inputTokens = Number(job.tokensPrompt || 0);
    const outputTokens = Number(job.tokensCompletion || 0);
    const res = getResolutionBucket(job);
    const inputUsd = (inputTokens / 1_000_000) * GOOGLE_INPUT_TEXT_IMAGE_USD_PER_M;
    const outputUsd = outputTokens > 0 ? (outputTokens / 1_000_000) * GOOGLE_OUTPUT_IMAGE_USD_PER_M : RESOLUTION_INFO[res].fallbackUsd;
    return (inputUsd + outputUsd) * USD_TO_EUR;
};

// ── Component ─────────────────────────────────────────────────────────────────
// ── Component ─────────────────────────────────────────────────────────────────
export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs,          setJobs]          = useState<any[]>([]);
    const [profiles,      setProfiles]      = useState<any[]>([]);
    const [rawVoice,      setRawVoice]      = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePayCnt,  setStripePayCnt]  = useState(0);
    const [stripeMonthly, setStripeMonthly] = useState<Record<string, number>>({});
    const [voiceTotals,   setVoiceTotals]   = useState<{ sessionCount: number; totalMinutes: number; costEur: number }>({ sessionCount: 0, totalMinutes: 0, costEur: 0 });
    const [loading,       setLoading]       = useState(true);
    const [timeRange,     setTimeRange]     = useState<TimeRange>('7d');
    const [visible,       setVisible]       = useState<Record<SeriesKey, boolean>>({
        totalUsers: true, activationRate: false,
        generierungen: true,
        res4K: false, res2K: false, res1K: false, res05K: false,
        voiceSessions: false, failedJobs: false,
        revenue: true, aiCost: false, profit: true,
    });
    const toggle = (key: SeriesKey) => setVisible(p => ({ ...p, [key]: !p[key] }));

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
                const fj = jobsData.filter((j: any) => !EXCLUDED_EMAILS.includes(j.userEmail));
                const fv = voiceSessions.filter((s: any) => !EXCLUDED_EMAILS.includes(s.userEmail));
                const fp = (profilesResult.data || []).filter((p: any) => !EXCLUDED_EMAILS.includes(p.email));
                setJobs(fj); setProfiles(fp); setRawVoice(fv);
                const mins = fv.reduce((s: number, v: any) => s + (v.durationMs || 0) / 60000, 0);
                setVoiceTotals({ sessionCount: fv.length, totalMinutes: mins, costEur: mins * 0.043 * USD_TO_EUR });
                if (session?.access_token) {
                    const start = new Date(); start.setDate(start.getDate() - 90);
                    const res = await supabase.functions.invoke('admin-stats', {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        body: { startDate: start.toISOString() },
                    });
                    if (!res.error && res.data) {
                        setStripeRevenue(res.data.totalRevenue ?? 0);
                        setStripePayCnt(res.data.paymentCount ?? 0);
                        setStripeMonthly(res.data.monthlyRevenue ?? {});
                    } else { setStripeRevenue(0); setStripePayCnt(0); setStripeMonthly({}); }
                } else { setStripeRevenue(0); setStripePayCnt(0); setStripeMonthly({}); }
            } catch (e) { console.error('AdminStatsView fetch error:', e); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────
    const completedJobs       = jobs.filter(j => j.status === 'completed');
    const failedJobs          = jobs.filter(j => j.status === 'failed');
    const googleAiCost        = completedJobs.reduce((a, j) => a + calculateEstimatedGoogleCostEur(j), 0);
    const totalAiCost         = googleAiCost + voiceTotals.costEur;
    const profit              = stripeRevenue != null ? stripeRevenue - totalAiCost : null;
    const margin              = stripeRevenue != null && stripeRevenue > 0 && profit != null ? (profit / stripeRevenue) * 100 : null;
    const now                 = new Date();
    const startOfToday        = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const newSignupsToday     = profiles.filter(p => new Date(p.created_at).getTime() >= startOfToday).length;
    const newSignups7d        = profiles.filter(p => new Date(p.created_at).getTime() >= startOfToday - 6*86400000).length;
    const uniqueUsersWithJobs = new Set(completedJobs.map(j => j.userEmail || j.userName)).size;
    const activationRate      = profiles.length > 0 ? (uniqueUsersWithJobs / profiles.length) * 100 : 0;
    const errorRate           = jobs.length > 0 ? (failedJobs.length / jobs.length) * 100 : 0;
    const uniqueUsersTotal    = new Set(jobs.map(j => j.userEmail || j.userName)).size;
    const avgGen              = uniqueUsersTotal > 0 ? completedJobs.length / uniqueUsersTotal : 0;

    const resCounts = useMemo(() => {
        const c: Partial<Record<ResolutionBucket, number>> = {};
        completedJobs.forEach(j => { const r = getResolutionBucket(j); c[r] = (c[r]||0)+1; });
        return c;
    }, [completedJobs]);

    // ── Chart data ────────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        const buckets = seedBuckets(timeRange, now);
        const keys = Object.keys(buckets);

        const firstJobTs = new Map<string, number>();
        completedJobs.forEach(job => {
            const uid = job.userEmail || job.userName;
            const ts  = new Date(job.createdAt).getTime();
            if (!firstJobTs.has(uid) || firstJobTs.get(uid)! > ts) firstJobTs.set(uid, ts);
        });

        completedJobs.forEach(job => {
            const key = makeBucketKey(new Date(job.createdAt), timeRange);
            if (!buckets[key]) return;
            const res = getResolutionBucket(job);
            buckets[key][res]        = (buckets[key][res]||0) + 1;
            buckets[key]._totalJobs  = (buckets[key]._totalJobs||0) + 1;
            buckets[key]._aiCost     = (buckets[key]._aiCost||0) + calculateEstimatedGoogleCostEur(job);
        });
        failedJobs.forEach(job => {
            const key = makeBucketKey(new Date(job.createdAt), timeRange);
            if (buckets[key]) buckets[key]._failedJobs = (buckets[key]._failedJobs||0) + 1;
        });
        profiles.forEach(p => {
            const key = makeBucketKey(new Date(p.created_at), timeRange);
            if (buckets[key]) buckets[key]._newInPeriod = (buckets[key]._newInPeriod||0) + 1;
        });
        rawVoice.forEach(s => {
            const ts = s.startedAt || s.createdAt || s.started_at;
            if (!ts) return;
            const key = makeBucketKey(new Date(ts), timeRange);
            if (buckets[key]) buckets[key]._voiceSessions = (buckets[key]._voiceSessions||0) + 1;
        });
        if (timeRange === 'all') {
            Object.entries(stripeMonthly).forEach(([monthKey, rev]) => {
                if (buckets[monthKey]) buckets[monthKey]._revenue = (buckets[monthKey]._revenue||0) + rev;
            });
        }

        const firstBucketStart = keys.length > 0 ? getBucketStartTs(keys[0], timeRange) : 0;
        let cumUsers = 0, cumActivated = 0;
        profiles.forEach(p => { if (new Date(p.created_at).getTime() < firstBucketStart) cumUsers++; });
        firstJobTs.forEach(ts => { if (ts < firstBucketStart) cumActivated++; });

        keys.forEach(key => {
            cumUsers += buckets[key]._newInPeriod || 0;
            const bStart = getBucketStartTs(key, timeRange);
            const bEnd   = getBucketEndTs(key, timeRange);
            firstJobTs.forEach(ts => { if (ts >= bStart && ts < bEnd) cumActivated++; });
            buckets[key]._totalUsers     = cumUsers;
            buckets[key]._activationRate = cumUsers > 0 ? Math.round((cumActivated / cumUsers) * 100) : 0;
            if (buckets[key]._revenue != null && buckets[key]._aiCost != null)
                buckets[key]._profit = buckets[key]._revenue - buckets[key]._aiCost;
        });

        return Object.values(buckets);
    }, [completedJobs, failedJobs, profiles, rawVoice, stripeMonthly, timeRange]);

    // ── Top users ─────────────────────────────────────────────────────────────
    const topUsers = useMemo(() => {
        const m = new Map<string, { name: string; count: number }>();
        completedJobs.forEach(j => { const n = j.userName||'Unknown'; const c = m.get(n)||{name:n,count:0}; c.count++; m.set(n,c); });
        return Array.from(m.values()).sort((a,b) => b.count-a.count).slice(0,8);
    }, [completedJobs]);
    const maxUserCount = Math.max(...topUsers.map(u => u.count), 0);

    const showRightAxis = visible.revenue || visible.aiCost || visible.activationRate || visible.profit;

    const existingResKeys: ResolutionBucket[] = (['4K','2K','1K','0.5K'] as ResolutionBucket[]).filter(
        r => completedJobs.some(j => getResolutionBucket(j) === r)
    );

    const activationDonut = [
        { value: uniqueUsersWithJobs,                                color: '#10b981' },
        { value: Math.max(0, profiles.length - uniqueUsersWithJobs), color: '#3f3f46' }, // Zinc-700 for dark mode feel
    ];

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/20 overflow-y-auto">
            <AdminViewHeader title="Statistiken" />

            {/* ── Main Content Container ──────────────────────────── */}
            <div className="flex-1 p-4 md:p-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">

                {/* ── KPI Grid ───────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <MetricCard
                        label="Nutzer gesamt"
                        value={String(profiles.length)}
                        subValue={`Heute +${newSignupsToday} · 7T +${newSignups7d}`}
                        color="#3b82f6"
                        checked={visible.totalUsers}
                        onToggle={() => toggle('totalUsers')}
                    />
                    <MetricCard
                        label="Generierungen"
                        value={String(completedJobs.length)}
                        subValue={`${uniqueUsersTotal} aktive Nutzer`}
                        color="#f97316"
                        checked={visible.generierungen}
                        onToggle={() => toggle('generierungen')}
                    />
                    <MetricCard
                        label="Einnahmen (90 Tage)"
                        value={stripeRevenue != null ? `${stripeRevenue.toFixed(0)}€` : '—'}
                        subValue={`${stripePayCnt} Zahlungen`}
                        color="#10b981"
                        checked={visible.revenue}
                        onToggle={() => toggle('revenue')}
                    />
                    <MetricCard
                        label="Gewinn"
                        value={profit != null ? `${profit.toFixed(0)}€` : '—'}
                        subValue={margin != null ? `Marge ${margin.toFixed(0)}%` : '—'}
                        color="#059669"
                        checked={visible.profit}
                        onToggle={() => toggle('profit')}
                    />
                </div>

                {/* ── Chart Section ───────────────────────────────────── */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Trend Analyse</h3>
                            <p className="text-xs text-zinc-400 mt-1">
                                {SERIES_CONFIG.filter(s => visible[s.key]).map(s => s.label).join(' · ') || 'Wähle Metriken oben aus'}
                            </p>
                        </div>

                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl self-start">
                            {TIME_RANGES.map(tr => (
                                <button key={tr.id} onClick={() => setTimeRange(tr.id)}
                                    className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${
                                        timeRange === tr.id
                                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                                    }`}>
                                    {tr.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[350px] md:h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} barSize={timeRange === '7d' ? 32 : timeRange === '14d' ? 20 : 12}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" opacity={0.4} />
                                <XAxis dataKey="_label" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }} allowDecimals={false} />
                                {showRightAxis && (
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                        tickFormatter={v => (visible.activationRate && !visible.revenue && !visible.aiCost && !visible.profit) ? `${v}%` : `${Number(v).toFixed(0)}€`} />
                                )}
                                <Tooltip
                                    cursor={{ stroke: '#f4f4f5', strokeWidth: 2 }}
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', padding: '12px' }}
                                    formatter={(value: any, name: string) => {
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
                                {visible.generierungen && <Bar yAxisId="left" dataKey="_totalJobs" stackId="total" fill="#f97316" radius={[6,6,0,0]} opacity={0.8} />}
                                {existingResKeys.map((res) => {
                                    const sk = RES_TO_SERIES[res];
                                    if (!sk || !visible[sk]) return null;
                                    const visibleResKeys = existingResKeys.filter(r => { const s = RES_TO_SERIES[r]; return s && visible[s]; });
                                    const isTop = visibleResKeys[visibleResKeys.length-1] === res;
                                    return <Bar key={res} yAxisId="left" dataKey={res} stackId="res" fill={RESOLUTION_INFO[res].color} radius={isTop ? [6,6,0,0] : [0,0,0,0]} />;
                                })}
                                {visible.voiceSessions && <Bar yAxisId="left" dataKey="_voiceSessions" stackId="voice" fill="#06b6d4" radius={[6,6,0,0]} />}
                                {visible.totalUsers && <Line yAxisId="left" type="monotone" dataKey="_totalUsers" stroke="#3b82f6" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#3b82f6', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.failedJobs && <Line yAxisId="left" type="monotone" dataKey="_failedJobs" stroke="#dc2626" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#dc2626', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.activationRate && <Line yAxisId="right" type="monotone" dataKey="_activationRate" stroke="#8b5cf6" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#8b5cf6', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.revenue  && <Line yAxisId="right" type="monotone" dataKey="_revenue"  stroke="#10b981" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#10b981', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.aiCost   && <Line yAxisId="right" type="monotone" dataKey="_aiCost"   stroke="#a855f7" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#a855f7', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.profit   && <Line yAxisId="right" type="monotone" dataKey="_profit"   stroke="#059669" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#059669', stroke:'#fff', strokeWidth:3 }} />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Toggle Grid for secondary metrics ───────────────── */}
                <div className="flex flex-wrap gap-2">
                    {SERIES_CONFIG.filter(s => !['totalUsers', 'generierungen', 'revenue', 'profit'].includes(s.key)).map(s => (
                        <button key={s.key} onClick={() => toggle(s.key)}
                            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all border flex items-center gap-2 ${
                                visible[s.key]
                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-transparent shadow-md'
                                    : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-100 dark:border-zinc-700 hover:border-zinc-300'
                            }`}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* ── Secondary Stats Grid ───────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">

                    {/* Activation Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col items-center">
                        <SectionLabel>Nutzer-Aktivierung</SectionLabel>
                        <div className="flex items-center gap-8 mt-6">
                            <div className="relative shrink-0">
                                <PieChart width={120} height={120}>
                                    <Pie data={activationDonut} cx={60} cy={60} innerRadius={42} outerRadius={58}
                                        dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                                        {activationDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                </PieChart>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                        {activationRate.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Aktiviert</span>
                                    <span className="text-lg font-bold font-mono text-emerald-500">{uniqueUsersWithJobs}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Noch nicht</span>
                                    <span className="text-lg font-bold font-mono text-zinc-400">
                                        {Math.max(0, profiles.length - uniqueUsersWithJobs)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Users Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <SectionLabel>Top Nutzer</SectionLabel>
                        <div className="mt-6 space-y-4">
                            {topUsers.map(user => (
                                <div key={user.name} className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{user.name}</span>
                                        <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">{user.count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-zinc-400 to-zinc-600"
                                            style={{ width: maxUserCount > 0 ? `${(user.count/maxUserCount)*100}%` : '0%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Efficiency Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <SectionLabel>Effizienz & Fehler</SectionLabel>
                            <div className="mt-8 space-y-6">
                                <EfficiencyRow label="Ø Gen. / Nutzer" value={avgGen.toFixed(1)} sub="Credits Nutzung" />
                                <EfficiencyRow label="Fehlerrate" value={`${errorRate.toFixed(1)}%`}
                                    color={errorRate > 10 ? '#ef4444' : '#10b981'}
                                    sub={`${failedJobs.length} gescheitert`} />
                                <EfficiencyRow label="KI Kosten (Ges.)" value={`${totalAiCost.toFixed(2)}€`} sub="Google & Voice" />
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-zinc-50 dark:border-zinc-800 text-[10px] text-zinc-400 italic">
                            Alle Kosten basieren auf geschätzten API-Token Verbrauchen.
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">{children}</p>
);

const MetricCard: React.FC<{
    label: string; value: string; subValue: string; color: string; checked: boolean; onToggle: () => void;
}> = ({ label, value, subValue, color, checked, onToggle }) => (
    <button
        onClick={onToggle}
        className={`relative flex flex-col text-left p-6 md:p-8 rounded-[2rem] transition-all duration-300 active:scale-[0.98] border shadow-sm ${
            checked
                ? 'bg-white dark:bg-zinc-900 border-transparent'
                : 'bg-zinc-100/50 dark:bg-zinc-900/30 border-transparent opacity-80'
        }`}
    >
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-4">{label}</span>
        <span className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2 font-mono tracking-tighter">
            {value}
        </span>
        <span className="text-xs text-zinc-500 font-medium">
            {subValue}
        </span>

        {/* Selected Indicator */}
        <div className={`absolute top-6 right-6 w-3 h-3 rounded-full transition-all duration-300 ${
            checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`} style={{ backgroundColor: color }} />

        {/* Backdrop Glow */}
        {checked && (
            <div className="absolute inset-0 rounded-[2rem] pointer-events-none transition-opacity opacity-[0.03]"
                 style={{ backgroundColor: color }} />
        )}
    </button>
);

const EfficiencyRow: React.FC<{ label: string; value: string; sub: string; color?: string }> = ({ label, value, sub, color }) => (
    <div className="flex items-center justify-between">
        <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
            <span className="text-[10px] text-zinc-400">{sub}</span>
        </div>
        <span className="text-lg font-bold font-mono tracking-tighter" style={{ color: color || 'inherit' }}>{value}</span>
    </div>
);

