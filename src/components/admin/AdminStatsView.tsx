import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

// ── Helpers ─────────────────────────────────────────────────────────────────
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
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            b[makeBucketKey(d, range)] = { _label: makeBucketLabel(d, range) };
        }
    } else if (range === 'woche') {
        for (let i = 9; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i * 7);
            b[makeBucketKey(d, range)] = { _label: makeBucketLabel(d, range) };
        }
    } else if (range === 'monat') {
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            b[makeBucketKey(d, range)] = { _label: makeBucketLabel(d, range) };
        }
    } else {
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now.getFullYear() - i, 0, 1);
            b[makeBucketKey(d, range)] = { _label: makeBucketLabel(d, range) };
        }
    }
    return b;
}

// ── Component ────────────────────────────────────────────────────────────────
export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [stripeRevenue, setStripeRevenue] = useState<number | null>(null);
    const [stripePaymentCount, setStripePaymentCount] = useState(0);
    const [stripeMonthly, setStripeMonthly] = useState<Record<string, number>>({});
    const [voiceStats, setVoiceStats] = useState<{ sessionCount: number; totalMinutes: number; costEur: number }>({ sessionCount: 0, totalMinutes: 0, costEur: 0 });
    const [loading, setLoading] = useState(true);

    const [activityRange, setActivityRange] = useState<TimeRange>('tag');
    const [visibleActivity, setVisibleActivity] = useState({ generierungen: true, newUsers: true, failedJobs: false, revenue: false, aiCost: false });

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
                const totalVoiceMinutes = filteredVoice.reduce((sum: number, s: any) => sum + (s.durationMs || 0) / 60000, 0);
                setVoiceStats({ sessionCount: filteredVoice.length, totalMinutes: totalVoiceMinutes, costEur: totalVoiceMinutes * VOICE_USD_PER_MIN * USD_TO_EUR });

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
                    } else { setStripeRevenue(0); setStripePaymentCount(0); setStripeMonthly({}); }
                } else { setStripeRevenue(0); setStripePaymentCount(0); setStripeMonthly({}); }
            } catch (e) {
                console.error('AdminStatsView fetch error:', e);
            } finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    // ── Derived ──────────────────────────────────────────────────────────────
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

    // ── Activity chart data ───────────────────────────────────────────────────
    const activityData = useMemo(() => {
        const buckets = seedBuckets(activityRange, now);
        completedJobs.forEach(job => {
            const key = makeBucketKey(new Date(job.createdAt), activityRange);
            if (!buckets[key]) return;
            const res = getResolutionBucket(job);
            buckets[key][res] = (buckets[key][res] || 0) + 1;
            buckets[key]._aiCost = (buckets[key]._aiCost || 0) + calculateEstimatedGoogleCostEur(job);
        });
        failedJobs.forEach(job => {
            const key = makeBucketKey(new Date(job.createdAt), activityRange);
            if (buckets[key]) buckets[key]._failedJobs = (buckets[key]._failedJobs || 0) + 1;
        });
        profiles.forEach(p => {
            const key = makeBucketKey(new Date(p.created_at), activityRange);
            if (buckets[key]) buckets[key]._newUsers = (buckets[key]._newUsers || 0) + 1;
        });
        // Revenue only available on monat/jahr
        if (activityRange === 'monat' || activityRange === 'jahr') {
            Object.entries(stripeMonthly).forEach(([monthKey, rev]) => {
                if (activityRange === 'monat') {
                    if (buckets[monthKey]) buckets[monthKey]._revenue = (buckets[monthKey]._revenue || 0) + rev;
                } else {
                    const year = monthKey.split('-')[0];
                    if (buckets[year]) buckets[year]._revenue = (buckets[year]._revenue || 0) + rev;
                }
            });
        }
        return Object.values(buckets);
    }, [completedJobs, failedJobs, profiles, stripeMonthly, activityRange]);

    // ── Top users ─────────────────────────────────────────────────────────────
    const topUsers = useMemo(() => {
        const byUser = new Map<string, { name: string; count: number }>();
        completedJobs.forEach(job => {
            const name = job.userName || 'Unknown';
            const cur = byUser.get(name) || { name, count: 0 };
            cur.count += 1;
            byUser.set(name, cur);
        });
        return Array.from(byUser.values()).sort((a, b) => b.count - a.count).slice(0, 10);
    }, [completedJobs]);
    const maxUserCount = Math.max(...topUsers.map(u => u.count), 0);

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
    );

    // ── Activation donut data ────────────────────────────────────────────────
    const activationDonut = [
        { name: 'Aktiviert', value: uniqueUsersWithJobs, color: '#10b981' },
        { name: 'Noch nicht', value: Math.max(0, profiles.length - uniqueUsersWithJobs), color: '#e4e4e7' },
    ];

    return (
        <div className="flex flex-col">
            <AdminViewHeader title="Statistiken" />
            <div className="px-6 md:px-8 py-6 space-y-8">

                {/* ══ FINANZEN ══════════════════════════════════════════════ */}
                <section className="space-y-3">
                    <SectionLabel>Finanzen</SectionLabel>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <StatTile label="Einnahmen"
                            value={stripeRevenue != null ? `${stripeRevenue.toFixed(2)} €` : '—'}
                            sub={`${stripePaymentCount} Zahlungen`}
                            valueColor="text-emerald-600 dark:text-emerald-400"
                            trend={stripeRevenue != null && stripeRevenue > 0 ? 'up' : 'neutral'} trendColor="emerald" />
                        <StatTile label="Kosten Bilder"
                            value={`${googleAiCost.toFixed(2)} €`}
                            sub={`${completedJobs.length} Generierungen`}
                            valueColor="text-red-500" />
                        <StatTile label="Kosten Voice"
                            value={`${voiceStats.costEur.toFixed(2)} €`}
                            sub={`${voiceStats.sessionCount} Sessions · ${Math.round(voiceStats.totalMinutes)} Min.`}
                            valueColor="text-orange-500" />
                        <StatTile label="Gewinn"
                            value={profit != null ? `${profit.toFixed(2)} €` : '—'}
                            sub={margin != null ? `Marge ${margin.toFixed(0)} %` : '—'}
                            valueColor={profit != null && profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}
                            trend={profit != null ? (profit >= 0 ? 'up' : 'down') : 'neutral'}
                            trendColor={profit != null && profit >= 0 ? 'emerald' : 'red'} />
                    </div>

                </section>

                {/* ══ AKTIVITÄT ════════════════════════════════════════════ */}
                <section className="space-y-3">
                    <SectionLabel>Aktivität</SectionLabel>

                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                        <StatTile label="Generierungen"
                            value={String(completedJobs.length)}
                            sub={`${uniqueUsersTotal} aktive Nutzer`} />
                        <StatTile label="Fehler"
                            value={String(failedJobs.length)}
                            sub={`${jobs.length} Jobs gesamt`}
                            valueColor={failedJobs.length > 0 ? 'text-red-500' : undefined} />
                        <StatTile label="Fehlerrate"
                            value={`${errorRate.toFixed(1)} %`}
                            sub={errorRate < 3 ? 'Gut' : errorRate > 10 ? 'Kritisch' : 'Erhöht'}
                            valueColor={errorRate > 10 ? 'text-red-500' : errorRate > 5 ? 'text-orange-500' : undefined}
                            trend={errorRate > 10 ? 'up' : errorRate < 3 ? 'down' : 'neutral'}
                            trendColor={errorRate > 10 ? 'red' : 'emerald'} trendInvert />
                    </div>

                    {/* Activity chart */}
                    <ChartCard
                        title="Verlauf"
                        timeRange={activityRange}
                        onTimeRange={setActivityRange}
                        timeRanges={TIME_RANGES}
                        toggles={[
                            { key: 'generierungen', label: 'Generierungen', color: '#f97316' },
                            { key: 'newUsers',      label: 'Neue Nutzer',   color: '#3b82f6' },
                            { key: 'failedJobs',    label: 'Fehler',        color: '#ef4444' },
                            { key: 'revenue',       label: 'Einnahmen',     color: '#10b981' },
                            { key: 'aiCost',        label: 'Kosten',        color: '#a855f7' },
                        ]}
                        visibleToggles={visibleActivity}
                        onToggle={key => setVisibleActivity(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={activityData} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                                <XAxis dataKey="_label" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }} allowDecimals={false} />
                                {(visibleActivity.revenue || visibleActivity.aiCost) && (
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }}
                                        tickFormatter={v => `${Number(v).toFixed(0)}€`} />
                                )}
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f1f1', borderRadius: '10px', fontSize: '11px' }}
                                    formatter={(value: any, name: string) => {
                                        if (name === '_newUsers') return [value, 'Neue Nutzer'];
                                        if (name === '_failedJobs') return [value, 'Fehler'];
                                        if (name === '_revenue') return [`${Number(value).toFixed(2)} €`, 'Einnahmen'];
                                        if (name === '_aiCost') return [`${Number(value).toFixed(2)} €`, 'Kosten'];
                                        return [value, RESOLUTION_INFO[name as ResolutionBucket]?.label ?? name];
                                    }}
                                />
                                {visibleActivity.generierungen && resolutionKeys.map((res, i) => (
                                    <Bar key={res} yAxisId="left" dataKey={res} stackId="gen"
                                        fill={RESOLUTION_INFO[res].color}
                                        radius={i === resolutionKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                ))}
                                {visibleActivity.newUsers && (
                                    <Line yAxisId="left" type="monotone" dataKey="_newUsers" stroke="#3b82f6" strokeWidth={2.5} connectNulls
                                        dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                )}
                                {visibleActivity.failedJobs && (
                                    <Line yAxisId="left" type="monotone" dataKey="_failedJobs" stroke="#ef4444" strokeWidth={2.5} connectNulls
                                        dot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                                )}
                                {visibleActivity.revenue && (
                                    <Line yAxisId="right" type="monotone" dataKey="_revenue" stroke="#10b981" strokeWidth={2.5} connectNulls
                                        dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                                )}
                                {visibleActivity.aiCost && (
                                    <Line yAxisId="right" type="monotone" dataKey="_aiCost" stroke="#a855f7" strokeWidth={2.5} connectNulls
                                        dot={{ r: 4, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </section>

                {/* ══ NUTZER ═══════════════════════════════════════════════ */}
                <section className="space-y-3">
                    <SectionLabel>Nutzer</SectionLabel>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Left: tiles */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatTile label="Nutzer gesamt"
                                value={String(profiles.length)}
                                sub={`${uniqueUsersWithJobs} haben generiert`} />
                            <StatTile label="Aktivierungsrate"
                                value={`${activationRate.toFixed(1)} %`}
                                sub={`${uniqueUsersWithJobs} von ${profiles.length}`}
                                trend={activationRate >= 20 ? 'up' : 'down'}
                                trendColor={activationRate >= 20 ? 'emerald' : 'zinc'} />
                            <StatTile label="Neue Nutzer heute"
                                value={String(newSignupsToday)}
                                sub={`7 T: ${newSignups7d} · 30 T: ${newSignups30d}`}
                                trend={newSignupsToday >= Math.max(1, Math.round(newSignups7d / 7)) ? 'up' : 'down'}
                                trendColor={newSignupsToday >= Math.max(1, Math.round(newSignups7d / 7)) ? 'emerald' : 'zinc'} />
                            <StatTile label="Ø Gen. / Nutzer"
                                value={avgGen.toFixed(1)}
                                sub={`${completedJobs.length} Jobs · ${uniqueUsersTotal} Nutzer`}
                                trend={avgGen >= 3 ? 'up' : 'neutral'} trendColor="emerald" />
                        </div>

                        {/* Right: activation donut */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center gap-4">
                            <div className="relative">
                                <PieChart width={160} height={160}>
                                    <Pie data={activationDonut} cx={75} cy={75}
                                        innerRadius={52} outerRadius={72}
                                        dataKey="value" startAngle={90} endAngle={-270}
                                        strokeWidth={0}>
                                        {activationDonut.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-none">
                                        {activationRate.toFixed(0)}%
                                    </span>
                                    <span className="text-[10px] text-zinc-400 mt-1">aktiviert</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <DonutLegendItem color="#10b981" label="Aktiviert" value={uniqueUsersWithJobs} />
                                <DonutLegendItem color="#e4e4e7" label="Noch nicht" value={Math.max(0, profiles.length - uniqueUsersWithJobs)} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ TOP NUTZER ═══════════════════════════════════════════ */}
                <section className="space-y-3">
                    <SectionLabel>Top Nutzer</SectionLabel>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-medium text-zinc-500">
                                    <th className="px-5 py-3">Benutzer</th>
                                    <th className="px-5 py-3 text-right">Generierungen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {topUsers.map((user) => (
                                    <tr key={user.name} className="text-sm hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                        <td className="px-5 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">{user.name}</td>
                                        <td className="px-5 py-2.5">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="w-24 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                    <div className="h-full rounded-full bg-zinc-400"
                                                        style={{ width: maxUserCount > 0 ? `${(user.count / maxUserCount) * 100}%` : '0%' }} />
                                                </div>
                                                <span className="font-mono text-sm text-zinc-500 w-6 text-right">{user.count}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {topUsers.length === 0 && (
                                    <tr><td colSpan={2} className="px-5 py-8 text-center text-sm text-zinc-400">Keine Daten</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1">{children}</p>
);

type TrendDir = 'up' | 'down' | 'neutral';
type TrendColor = 'emerald' | 'red' | 'zinc';
const TREND_COLORS: Record<TrendColor, string> = { emerald: 'text-emerald-500', red: 'text-red-500', zinc: 'text-zinc-400' };

const StatTile = ({ label, value, sub, valueColor, trend = 'neutral', trendColor, trendInvert }: {
    label: string; value: string; sub?: string;
    valueColor?: string; trend?: TrendDir; trendColor?: TrendColor; trendInvert?: boolean;
}) => {
    const effectiveTrend = trendInvert ? (trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'neutral') : trend;
    const colorClass = trendColor ? TREND_COLORS[trendColor] : 'text-zinc-400';
    const TrendIcon = effectiveTrend === 'up' ? TrendingUp : effectiveTrend === 'down' ? TrendingDown : Minus;
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-400 leading-none">{label}</span>
                {trend !== 'neutral' && <TrendIcon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />}
            </div>
            <div className={`text-xl font-bold font-mono tracking-tight leading-none ${valueColor ?? 'text-zinc-900 dark:text-zinc-100'}`}>
                {value}
            </div>
            {sub && <div className="text-[10px] text-zinc-400 leading-tight">{sub}</div>}
        </div>
    );
};

const ChartCard: React.FC<{
    title: string;
    timeRange: TimeRange;
    onTimeRange: (r: TimeRange) => void;
    timeRanges: { id: TimeRange; label: string }[];
    toggles?: { key: string; label: string; color: string }[];
    visibleToggles?: Record<string, boolean>;
    onToggle?: (key: string) => void;
    children: React.ReactNode;
}> = ({ title, timeRange, onTimeRange, timeRanges, toggles, visibleToggles, onToggle, children }) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">{title}</h3>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                {timeRanges.map(tr => (
                    <button key={tr.id} onClick={() => onTimeRange(tr.id)}
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
        {toggles && visibleToggles && onToggle && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
                {toggles.map(({ key, label, color }) => (
                    <button key={key} onClick={() => onToggle(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            visibleToggles[key]
                                ? 'border-transparent text-white'
                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 bg-transparent'
                        }`}
                        style={visibleToggles[key] ? { backgroundColor: color } : {}}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: visibleToggles[key] ? '#fff' : color }} />
                        {label}
                    </button>
                ))}
            </div>
        )}
        <div className="h-[240px]">{children}</div>
    </div>
);

const DonutLegendItem = ({ color, label, value }: { color: string; label: string; value: number }) => (
    <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] text-zinc-500">{label}</span>
        <span className="text-[11px] font-bold font-mono text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
);
