import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Line, ComposedChart,
} from 'recharts';
import { TranslationFunction } from '@/types';
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

// Preis-/Kostenformeln leben jetzt serverseitig in den admin_stats_* RPCs
// (Migration 20260702130000_admin_stats_aggregation.sql).
const USD_TO_EUR = 0.92;
const EXCLUDED_EMAILS = ['pzillas@gmail.com'];

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

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    // Alle Kennzahlen kommen serverseitig aggregiert aus Postgres-RPCs
    // (admin_stats_totals / admin_stats_buckets / admin_stats_baseline) —
    // es werden keine Rohzeilen mehr geladen, daher kein 1000-Job-Limit mehr.
    const [totals,        setTotals]        = useState<any | null>(null);
    const [bucketRows,    setBucketRows]    = useState<any[]>([]);
    const [baseline,      setBaseline]      = useState<{ profilesBefore: number; activatedBefore: number }>({ profilesBefore: 0, activatedBefore: 0 });
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePayCnt,  setStripePayCnt]  = useState(0);
    const [stripeMonthly, setStripeMonthly] = useState<Record<string, number>>({});
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

    // Startzeitpunkt des ersten gezeichneten Buckets — muss zu seedBuckets() passen.
    const rangeStart = (range: TimeRange): Date => {
        const d = new Date();
        if (range === '7d')  { d.setDate(d.getDate() - 6);  d.setHours(0,0,0,0); return d; }
        if (range === '14d') { d.setDate(d.getDate() - 13); d.setHours(0,0,0,0); return d; }
        if (range === '30d') { d.setDate(d.getDate() - 29); d.setHours(0,0,0,0); return d; }
        if (range === '60d') { d.setDate(d.getDate() - 8 * 7); d.setHours(0,0,0,0); return d; }
        return new Date(d.getFullYear(), d.getMonth() - 17, 1);
    };

    const fetchRange = useCallback(async (range: TimeRange) => {
        try {
            const start = rangeStart(range).toISOString();
            const bucket = getBucketGrouping(range);
            const [bucketsRes, baselineRes] = await Promise.all([
                supabase.rpc('admin_stats_buckets', { p_start: start, p_bucket: bucket, p_excluded_emails: EXCLUDED_EMAILS }),
                supabase.rpc('admin_stats_baseline', { p_start: start, p_excluded_emails: EXCLUDED_EMAILS }),
            ]);
            if (bucketsRes.error) throw bucketsRes.error;
            if (baselineRes.error) throw baselineRes.error;
            setBucketRows(bucketsRes.data || []);
            setBaseline({
                profilesBefore: Number(baselineRes.data?.profilesBefore ?? 0),
                activatedBefore: Number(baselineRes.data?.activatedBefore ?? 0),
            });
        } catch (e) { console.error('AdminStatsView range fetch error:', e); }
    }, []);

    const fetchAll = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const [totalsRes, { data: { session } }] = await Promise.all([
                supabase.rpc('admin_stats_totals', { p_excluded_emails: EXCLUDED_EMAILS }),
                supabase.auth.getSession()
            ]);
            if (totalsRes.error) throw totalsRes.error;
            setTotals(totalsRes.data);
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

    useEffect(() => {
        fetchRange(timeRange);
    }, [fetchRange, timeRange]);

    // ── Derived (aus admin_stats_totals) ─────────────────────────────────────
    const completedJobsCount  = Number(totals?.completedJobs ?? 0);
    const voiceMinutes        = Number(totals?.voiceTotalMinutes ?? 0);
    const voiceCostEur        = voiceMinutes * 0.043 * USD_TO_EUR;
    const googleAiCost        = Number(totals?.aiCostEur ?? 0);
    const totalAiCost         = googleAiCost + voiceCostEur;
    const profit              = stripeRevenue != null ? stripeRevenue - totalAiCost : null;
    const margin              = stripeRevenue != null && stripeRevenue > 0 && profit != null ? (profit / stripeRevenue) * 100 : null;
    const totalProfiles       = Number(totals?.totalProfiles ?? 0);
    const newSignupsToday     = Number(totals?.signupsToday ?? 0);
    const newSignups7d        = Number(totals?.signups7d ?? 0);
    const uniqueUsersTotal    = Number(totals?.uniqueUsersTotal ?? 0);
    const avgGen              = uniqueUsersTotal > 0 ? completedJobsCount / uniqueUsersTotal : 0;
    const topUsers            = ((totals?.topUsers ?? []) as { name: string; count: number }[]);
    const maxUserCount        = topUsers.reduce((m, u) => Math.max(m, Number(u.count)), 0);
    const providerStats       = ((totals?.providerStats ?? []) as any[]);

    // ── Chart data (aus admin_stats_buckets + Baseline) ──────────────────────
    const chartData = useMemo(() => {
        const buckets = seedBuckets(timeRange, new Date());
        const keys = Object.keys(buckets);
        const rowsByKey = new Map<string, any>(bucketRows.map((r: any) => [r.bucket_key, r]));

        let cumUsers = baseline.profilesBefore;
        let cumActivated = baseline.activatedBefore;
        // RPC-Zeilen vor dem ersten gezeichneten Bucket (z.B. angebrochene erste
        // ISO-Woche) fließen in die kumulativen Startwerte ein statt zu verfallen.
        const firstKey = keys[0];
        bucketRows.forEach((r: any) => {
            if (firstKey && r.bucket_key < firstKey) {
                cumUsers += Number(r.new_profiles || 0);
                cumActivated += Number(r.first_time_users || 0);
            }
        });

        keys.forEach(key => {
            const b = buckets[key];
            const r = rowsByKey.get(key);
            b._totalJobs     = Number(r?.completed_jobs || 0);
            b._failedJobs    = Number(r?.failed_jobs || 0);
            b._voiceSessions = Number(r?.voice_sessions || 0);
            b._newInPeriod   = Number(r?.new_profiles || 0);
            b._aiCost        = Number(r?.ai_cost_eur || 0);
            b['0.5K']        = Number(r?.res_05k || 0);
            b['1K']          = Number(r?.res_1k || 0);
            b['2K']          = Number(r?.res_2k || 0);
            b['4K']          = Number(r?.res_4k || 0);
            b['Other']       = Number(r?.res_other || 0);
            cumUsers     += b._newInPeriod;
            cumActivated += Number(r?.first_time_users || 0);
            b._totalUsers     = cumUsers;
            b._activationRate = cumUsers > 0 ? Math.round((cumActivated / cumUsers) * 100) : 0;
        });

        if (timeRange === 'all') {
            Object.entries(stripeMonthly).forEach(([monthKey, rev]) => {
                if (buckets[monthKey]) buckets[monthKey]._revenue = (buckets[monthKey]._revenue||0) + rev;
            });
            keys.forEach(key => {
                const b = buckets[key];
                if (b._revenue != null && b._aiCost != null) b._profit = b._revenue - b._aiCost;
            });
        }

        return Object.values(buckets);
    }, [bucketRows, baseline, stripeMonthly, timeRange]);

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
                        onClick={() => { fetchAll(true); fetchRange(timeRange); }}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors disabled:opacity-50"
                        title="Aktualisieren"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                }
            />

            <div className="flex-1 p-4 md:p-8 flex flex-col gap-8 max-w-[1700px] mx-auto w-full">

                {/* ── 1. MAIN CHART ────────────────────────────────────────── */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-sm">
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

                {/* ── 2. BOX GRID ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">

                    {/* Box 1: Überblick */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                        <SectionLabel>Überblick</SectionLabel>
                        <div className="mt-6 space-y-4">
                            <EfficiencyRow dot="#3b82f6" label="Nutzer gesamt"       value={String(totalProfiles)}                                          sub={`Heute +${newSignupsToday} · 7 Tage +${newSignups7d}`} />
                            <EfficiencyRow dot="#f97316" label="Generierungen"       value={String(completedJobsCount)}                                     sub={`${uniqueUsersTotal} aktive Nutzer · Ø ${avgGen.toFixed(1)}/User`} />
                            <EfficiencyRow dot="#10b981" label="Einnahmen (90 Tage)" value={stripeRevenue != null ? `${stripeRevenue.toFixed(0)} €` : '—'}  sub={`${stripePayCnt} Zahlungen`} color="#10b981" />
                            <EfficiencyRow dot="#059669" label="Gewinn"              value={profit != null ? `${profit.toFixed(0)} €` : '—'}                sub={margin != null ? `Marge ${margin.toFixed(0)} %` : '—'} color="#059669" />
                        </div>
                    </div>

                    {/* Box: Fehlerrate — Wie stabil läuft die Generierung? + fal Performance */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Fehlerrate</SectionLabel>
                            <MiniLegend items={[{ color: '#ef4444', label: 'Fehlgeschlagene Jobs' }]} />
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-3">Anzahl Generierungen die mit Fehler abgebrochen sind (Timeout, API-Fehler etc.)</p>
                        {/* Provider performance sub-stats — per-provider Ø-time, success-rate, jobs. */}
                        {(() => {
                            const providerRows = [
                                { key: 'nb2',    label: 'NB2'   },
                                { key: 'gpt2',   label: 'GPT-2' },
                            ];
                            const stats = providerRows.map(row => {
                                const s = providerStats.find((p: any) => p.key === row.key);
                                const total     = Number(s?.total || 0);
                                const completed = Number(s?.completed || 0);
                                const success   = total > 0 ? (completed / total) * 100 : null;
                                const avgDur    = s?.avg_duration_ms != null ? Number(s.avg_duration_ms) : null;
                                return { ...row, total, success, avgDur };
                            }).filter(s => s.total > 0);
                            if (stats.length === 0) return null;
                            return (
                                <div className="flex flex-col gap-2 mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                    {stats.map(s => (
                                        <div key={s.key} className="flex items-center gap-4 flex-wrap">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 min-w-[40px]">{s.label}</span>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-zinc-400 uppercase tracking-wider">Ø Zeit</span>
                                                <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">
                                                    {s.avgDur != null ? `${(s.avgDur / 1000).toFixed(1)}s` : '—'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-zinc-400 uppercase tracking-wider">Success</span>
                                                <span className="text-sm font-bold font-mono" style={{ color: s.success != null && s.success >= 95 ? '#10b981' : s.success != null && s.success >= 80 ? '#f59e0b' : '#ef4444' }}>
                                                    {s.success != null ? `${s.success.toFixed(1)}%` : '—'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-zinc-400 uppercase tracking-wider">Jobs</span>
                                                <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">
                                                    {s.total}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                        <div className="h-[160px] w-full mt-auto">
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

                    {/* Box: Beliebtheit — Download-Quote pro Modell. Hoch = User behält das Ergebnis,
                        niedrig = User wirft die meisten Generierungen weg. */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Beliebtheit pro Modell</SectionLabel>
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-4">Wie oft generierte Bilder tatsächlich heruntergeladen werden — Indikator für Output-Zufriedenheit.</p>
                        {(() => {
                            const providerRows = [
                                { key: 'nb2',  label: 'Nano Banana 2' },
                                { key: 'gpt2', label: 'GPT Image 2'   },
                            ];
                            const rows = providerRows.map(row => {
                                const s = providerStats.find((p: any) => p.key === row.key);
                                const completed = Number(s?.completed || 0);
                                const downloads = Number(s?.downloads || 0);
                                const dlRate    = completed > 0 ? (downloads / completed) * 100 : null;
                                return { ...row, completed, downloads, dlRate };
                            }).filter(r => r.completed > 0);

                            if (rows.length === 0) {
                                return <p className="text-xs text-zinc-400">Noch keine abgeschlossenen Generierungen.</p>;
                            }

                            // Find leader for the visual highlight
                            const max = Math.max(...rows.map(r => r.dlRate ?? 0));

                            return (
                                <div className="flex flex-col gap-3">
                                    {rows.map(r => {
                                        const isLeader = r.dlRate != null && r.dlRate === max && rows.length > 1;
                                        const barWidth = r.dlRate != null ? Math.max(2, r.dlRate) : 0;
                                        return (
                                            <div key={r.key}>
                                                <div className="flex items-baseline justify-between mb-1.5">
                                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                        {r.label}
                                                        {isLeader && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Top</span>}
                                                    </span>
                                                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                                                        {r.dlRate != null ? `${r.dlRate.toFixed(0)}%` : '—'}
                                                        <span className="text-zinc-400 ml-1">· {r.downloads}/{r.completed}</span>
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${barWidth}%`,
                                                            background: isLeader ? '#10b981' : '#3b82f6',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Box: Nutzer-Wachstum (inkl. Aktivierungsrate = Conversion) */}
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


