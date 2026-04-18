import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Line, ComposedChart,
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
    // Pre-seed numeric fields with 0 so Recharts Line draws continuously
    // even through buckets without activity (otherwise undefined = gap).
    const emptyBucket = (label: string) => ({
        _label: label,
        _totalJobs: 0,
        _failedJobs: 0,
        _voiceSessions: 0,
        _newInPeriod: 0,
        _aiCost: 0,
    });
    if (range === '7d') {
        for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); b[makeBucketKey(d,range)] = emptyBucket(makeBucketLabel(d,range)); }
    } else if (range === '14d') {
        for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); b[makeBucketKey(d,range)] = emptyBucket(makeBucketLabel(d,range)); }
    } else if (range === '30d') {
        for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); b[makeBucketKey(d,range)] = emptyBucket(makeBucketLabel(d,range)); }
    } else if (range === '60d') {
        for (let i = 8; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i*7); b[makeBucketKey(d,range)] = emptyBucket(makeBucketLabel(d,range)); }
    } else {
        for (let i = 17; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth()-i, 1); b[makeBucketKey(d,range)] = emptyBucket(makeBucketLabel(d,range)); }
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
export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs,          setJobs]          = useState<any[]>([]);
    const [profiles,      setProfiles]      = useState<any[]>([]);
    const [rawVoice,      setRawVoice]      = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePayCnt,  setStripePayCnt]  = useState(0);
    const [stripeMonthly, setStripeMonthly] = useState<Record<string, number>>({});
    const [voiceTotals,   setVoiceTotals]   = useState<{ sessionCount: number; totalMinutes: number; costEur: number }>({ sessionCount: 0, totalMinutes: 0, costEur: 0 });
    const [loading,       setLoading]       = useState(true);
    const [refreshing,    setRefreshing]    = useState(false);
    const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
    const [timeRange,     setTimeRange]     = useState<TimeRange>('7d');
    const [visible,       setVisible]       = useState({
        totalUsers:    true,
        generierungen: true,
        res05k:        true,
        res1k:         false,
        res2k:         false,
        res4k:         false,
        voice:         false,
        revenue:       true,
        profit:        true,
        aiCost:        false,
    });
    const toggle = (k: keyof typeof visible) => setVisible(p => ({ ...p, [k]: !p[k] }));

    const fetchAll = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const [jobsData, voiceSessions, profilesResult, { data: { session } }] = await Promise.all([
                adminService.getJobs(1, 1000),
                adminService.getVoiceSessions(200),
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
            setLastFetchedAt(new Date());
        } catch (e) { console.error('AdminStatsView fetch error:', e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => {
        fetchAll(false);
    }, [fetchAll]);

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
    const maxUserCount        = Math.max(...jobs.reduce((acc, j) => {
        const u = j.userEmail || j.userName || 'Unknown';
        acc.set(u, (acc.get(u) || 0) + 1);
        return acc;
    }, new Map<string, number>()).values(), 0);

    const topUsers = Array.from(jobs.reduce((acc, j) => {
        const u = j.userEmail || j.userName || 'Unknown';
        acc.set(u, (acc.get(u) || 0) + 1);
        return acc;
    }, new Map<string, number>())).map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

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
            // Collect first-chunk latencies (Google streaming only; null on Kie jobs).
            if (typeof job.firstChunkLatencyMs === 'number') {
                if (!buckets[key]._firstChunkSamples) buckets[key]._firstChunkSamples = [];
                buckets[key]._firstChunkSamples.push(job.firstChunkLatencyMs);
            }
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
            // _failedJobs is already set as raw count by the failedJobs loop above — keep it as-is
            if (buckets[key]._revenue != null && buckets[key]._aiCost != null)
                buckets[key]._profit = buckets[key]._revenue - buckets[key]._aiCost;
            // Reduce first-chunk samples to p50 + p95 (seconds) for plotting.
            const samples: number[] | undefined = buckets[key]._firstChunkSamples;
            if (samples && samples.length > 0) {
                const sorted = [...samples].sort((a, b) => a - b);
                const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
                buckets[key]._firstChunkP50 = +(pick(0.5) / 1000).toFixed(2);
                buckets[key]._firstChunkP95 = +(pick(0.95) / 1000).toFixed(2);
                buckets[key]._firstChunkSampleCount = sorted.length;
            }
            delete buckets[key]._firstChunkSamples;
        });

        return Object.values(buckets);
    }, [completedJobs, failedJobs, profiles, rawVoice, stripeMonthly, timeRange]);

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/20 overflow-y-auto">
            <AdminViewHeader
                title="Statistiken"
                description={lastFetchedAt ? `Aktualisiert ${lastFetchedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : undefined}
                actions={
                    <button
                        onClick={() => fetchAll(true)}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors disabled:opacity-50"
                        title="Aktualisieren"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                }
            />

            <div className="flex-1 p-4 md:p-8 flex flex-col gap-8 max-w-[1700px] mx-auto w-full">

                {/* ── 1. 6-BOX GRID ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">

                    {/* Box 1: Überblick */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                        <SectionLabel>Überblick</SectionLabel>
                        <div className="mt-6 space-y-4">
                            <EfficiencyRow dot="#3b82f6" label="Nutzer gesamt"       value={String(profiles.length)}                                        sub={`Heute +${newSignupsToday} · 7 Tage +${newSignups7d}`} />
                            <EfficiencyRow dot="#f97316" label="Generierungen"       value={String(completedJobs.length)}                                   sub={`${uniqueUsersTotal} aktive Nutzer · Ø ${avgGen.toFixed(1)}/User`} />
                            <EfficiencyRow dot="#10b981" label="Einnahmen (90 Tage)" value={stripeRevenue != null ? `${stripeRevenue.toFixed(0)} €` : '—'}  sub={`${stripePayCnt} Zahlungen`} color="#10b981" />
                            <EfficiencyRow dot="#059669" label="Gewinn"              value={profit != null ? `${profit.toFixed(0)} €` : '—'}                sub={margin != null ? `Marge ${margin.toFixed(0)} %` : '—'} color="#059669" />
                        </div>
                    </div>

                    {/* Box 2: Conversion — Wie viele Nutzer haben tatsächlich generiert? */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Conversion</SectionLabel>
                            <MiniLegend items={[{ color: '#8b5cf6', label: '% Nutzer mit mind. 1 Bild' }]} />
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-5">Anteil registrierter Nutzer, die mindestens einmal generiert haben</p>
                        <div className="h-[200px] w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" opacity={0.4} />
                                    <XAxis dataKey="_label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} interval="preserveStartEnd" tickCount={2} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickCount={2} width={30} tickFormatter={v => `${v}%`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                        formatter={(v: any) => [`${v}%`, 'Aktivierungsrate']} />
                                    <Line type="monotone" dataKey="_activationRate" stroke="#8b5cf6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Box 3: Fehlerrate — Wie stabil läuft die Generierung? */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Fehlerrate</SectionLabel>
                            <MiniLegend items={[{ color: '#ef4444', label: 'Fehlgeschlagene Jobs' }]} />
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-5">Anzahl Generierungen die mit Fehler abgebrochen sind (Timeout, API-Fehler etc.)</p>
                        <div className="h-[200px] w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" opacity={0.4} />
                                    <XAxis dataKey="_label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} interval="preserveStartEnd" tickCount={2} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickCount={2} width={26} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                        formatter={(v: any) => [v, 'Fehler']} />
                                    <Line type="monotone" dataKey="_failedJobs" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Box: Google First-Chunk Latency — erkennt Hangs vs. gesunde Generierung */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Google Stream-Start</SectionLabel>
                            <MiniLegend items={[{ color: '#10b981', label: 'P50 (s)' }, { color: '#f59e0b', label: 'P95 (s)' }]} />
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-5">Zeit bis erster Stream-Chunk. Steigt = Google wird langsam oder hängt. 20s Timeout → Kie-Fallback</p>
                        <div className="h-[200px] w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" opacity={0.4} />
                                    <XAxis dataKey="_label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} interval="preserveStartEnd" tickCount={2} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickCount={3} width={32} tickFormatter={v => `${v}s`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                        formatter={(v: any, n: string) => [`${v}s`, n === '_firstChunkP50' ? 'P50' : 'P95']} />
                                    <Line type="monotone" dataKey="_firstChunkP50" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls />
                                    <Line type="monotone" dataKey="_firstChunkP95" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} connectNulls />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Box 4: Nutzer-Wachstum */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Nutzer-Wachstum</SectionLabel>
                            <MiniLegend items={[{ color: '#3b82f6', label: 'Neu registriert' }, { color: '#10b981', label: 'Aktiv (%)' }]} />
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-5">Neue Registrierungen pro Periode (links) vs. Anteil aller Nutzer der mind. 1× generiert hat (rechts, %)</p>
                        <div className="h-[200px] w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" opacity={0.4} />
                                    <XAxis dataKey="_label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} interval="preserveStartEnd" tickCount={2} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickCount={2} width={26} allowDecimals={false} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickCount={2} width={30} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                        formatter={(v: any, n: string) => n === '_activationRate' ? [`${v}%`, 'Aktiv'] : [v, 'Neu registriert']} />
                                    <Line yAxisId="left" type="monotone" dataKey="_newInPeriod" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="_activationRate" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Box 5: Top Nutzer */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <SectionLabel>Aktivste Nutzer</SectionLabel>
                        <p className="text-[10px] text-zinc-400 mt-1 mb-5">Nutzer mit den meisten abgeschlossenen Generierungen</p>
                        <div className="space-y-3">
                            {topUsers.slice(0, 9).map(user => (
                                <div key={user.name} className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate">{user.name}</span>
                                        <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0">{user.count}×</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-zinc-400 to-zinc-600"
                                            style={{ width: maxUserCount > 0 ? `${(user.count / maxUserCount) * 100}%` : '0%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <SectionLabel>Dienste & Effizienz</SectionLabel>
                            <div className="mt-6 space-y-4">
                                <EfficiencyRow label="Voice Kosten" value={`${voiceTotals.costEur.toFixed(2)} €`} sub="ElevenLabs / Google Gemini Live" />
                                <EfficiencyRow label="Ø Bilder / Nutzer" value={avgGen.toFixed(1)} sub="Durchschnittliche Nutzungstiefe inkl. 4K" />
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── 2. MAIN CHART ────────────────────────────────────────── */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-sm mb-12">
                    <div className="flex flex-col gap-5 mb-8">
                        {/* Top row: title + time range */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Hauptmetriken</h3>
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
                        {/* Checkbox toggles */}
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {([
                                { k: 'totalUsers',    label: 'Nutzer',          color: '#3b82f6' },
                                { k: 'generierungen', label: 'Generierungen',   color: '#f97316' },
                                { k: 'res4k',         label: '4K',              color: '#ef4444' },
                                { k: 'res2k',         label: '2K',              color: '#fb923c' },
                                { k: 'res1k',         label: '1K',              color: '#eab308' },
                                { k: 'res05k',        label: '0.5K',            color: '#a3a3a3' },
                                { k: 'voice',         label: 'Voice',           color: '#06b6d4' },
                                { k: 'revenue',       label: 'Einnahmen',       color: '#10b981' },
                                { k: 'profit',        label: 'Gewinn',          color: '#059669' },
                                { k: 'aiCost',        label: 'Ausgaben',        color: '#a855f7' },
                            ] as { k: keyof typeof visible; label: string; color: string }[]).map(s => (
                                <button key={s.k} onClick={() => toggle(s.k)}
                                    className="flex items-center gap-1.5 group">
                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                        visible[s.k] ? 'border-transparent' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                                    }`} style={visible[s.k] ? { backgroundColor: s.color } : {}}>
                                        {visible[s.k] && <svg viewBox="0 0 10 8" className="w-2 h-2 fill-white"><path d="M1 4l2.5 2.5L9 1"/></svg>}
                                    </div>
                                    <span className={`text-[11px] font-medium transition-colors ${visible[s.k] ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400'}`}>
                                        {s.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[300px] md:h-[420px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" opacity={0.4} />
                                <XAxis dataKey="_label" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }} allowDecimals={false} tickCount={4} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }} tickCount={4}
                                    tickFormatter={v => `${Number(v).toFixed(0)}€`} />
                                <Tooltip
                                    cursor={{ stroke: '#f4f4f5', strokeWidth: 2 }}
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', padding: '12px' }}
                                    formatter={(value: any, name: string) => {
                                        const map: Record<string, string> = { _totalJobs: 'Generierungen', _totalUsers: 'Nutzer', '4K': '4K', '2K': '2K', '1K': '1K', '0.5K': '0.5K', _voiceSessions: 'Voice' };
                                        if (name === '_revenue')  return [`${Number(value).toFixed(2)} €`, 'Einnahmen'];
                                        if (name === '_profit')   return [`${Number(value).toFixed(2)} €`, 'Gewinn'];
                                        if (name === '_aiCost')   return [`${Number(value).toFixed(2)} €`, 'Ausgaben'];
                                        return [value, map[name] ?? name];
                                    }}
                                />
                                {visible.totalUsers    && <Line yAxisId="left"  type="monotone" dataKey="_totalUsers"    stroke="#3b82f6" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#3b82f6', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.generierungen && <Line yAxisId="left"  type="monotone" dataKey="_totalJobs"     stroke="#f97316" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#f97316', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.res4k         && <Line yAxisId="left"  type="monotone" dataKey="4K"             stroke="#ef4444" strokeWidth={2} connectNulls dot={false} activeDot={{ r:5, fill:'#ef4444', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.res2k         && <Line yAxisId="left"  type="monotone" dataKey="2K"             stroke="#fb923c" strokeWidth={2} connectNulls dot={false} activeDot={{ r:5, fill:'#fb923c', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.res1k         && <Line yAxisId="left"  type="monotone" dataKey="1K"             stroke="#eab308" strokeWidth={2} connectNulls dot={false} activeDot={{ r:5, fill:'#eab308', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.res05k        && <Line yAxisId="left"  type="monotone" dataKey="0.5K"           stroke="#a3a3a3" strokeWidth={2} connectNulls dot={false} activeDot={{ r:5, fill:'#a3a3a3', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.voice         && <Line yAxisId="left"  type="monotone" dataKey="_voiceSessions" stroke="#06b6d4" strokeWidth={2} connectNulls dot={false} activeDot={{ r:5, fill:'#06b6d4', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.revenue       && <Line yAxisId="right" type="monotone" dataKey="_revenue"       stroke="#10b981" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#10b981', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.profit        && <Line yAxisId="right" type="monotone" dataKey="_profit"        stroke="#059669" strokeWidth={3} connectNulls dot={false} activeDot={{ r:6, fill:'#059669', stroke:'#fff', strokeWidth:3 }} />}
                                {visible.aiCost        && <Line yAxisId="right" type="monotone" dataKey="_aiCost"        stroke="#a855f7" strokeWidth={2} strokeDasharray="4 3" connectNulls dot={false} activeDot={{ r:5, fill:'#a855f7', stroke:'#fff', strokeWidth:3 }} />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{children}</p>
);

const MiniLegend: React.FC<{ items: { color: string; label: string }[] }> = ({ items }) => (
    <div className="flex items-center gap-3 flex-wrap">
        {items.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-zinc-500 font-medium">{item.label}</span>
            </div>
        ))}
    </div>
);


const EfficiencyRow: React.FC<{ label: string; value: string; sub: string; color?: string; dot?: string }> = ({ label, value, sub, color, dot }) => (
    <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
            {dot && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />}
            <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
                <span className="text-[9px] text-zinc-400 uppercase tracking-wider truncate">{sub}</span>
            </div>
        </div>
        <span className="text-base font-bold font-mono tracking-tighter shrink-0" style={{ color: color || 'inherit' }}>{value}</span>
    </div>
);


