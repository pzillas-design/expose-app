import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Loader2, Trash2, Search, X } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { AdminViewHeader } from './AdminViewHeader';
import { Button } from '@/components/ui/DesignSystem';

interface ErrorLog {
    id: string;
    user_id: string | null;
    user_email: string | null;
    message: string;
    context: string | null;
    url: string | null;
    source: string;
    created_at: string;
}

const SOURCE_COLORS: Record<string, string> = {
    toast: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    silent: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'edge-function': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'generate-image-fal': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'job-failed': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const PAGE_SIZE = 100;

export const AdminErrorsView: React.FC = () => {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [clearing, setClearing] = useState(false);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('error_logs')
                .select('id, user_id, user_email, message, context, url, source, created_at')
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);

            if (error) throw error;
            setLogs(data ?? []);
        } catch (e) {
            console.error('Failed to fetch error logs:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleClearAll = async () => {
        if (!window.confirm('Alle Error-Logs löschen?')) return;
        setClearing(true);
        try {
            await supabase.from('error_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            setLogs([]);
        } catch (e) {
            console.error('Failed to clear error logs:', e);
        } finally {
            setClearing(false);
        }
    };

    const filtered = logs.filter(log => {
        if (sourceFilter !== 'all' && log.source !== sourceFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            log.message.toLowerCase().includes(q) ||
            (log.user_email ?? '').toLowerCase().includes(q) ||
            (log.context ?? '').toLowerCase().includes(q) ||
            (log.url ?? '').toLowerCase().includes(q)
        );
    });

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
            + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    const sources = ['all', ...Array.from(new Set(logs.map(l => l.source)))];

    // Group errors by normalized reason to surface the most common causes.
    // Normalization: strip variable bits (timestamps, ms values, quoted strings,
    // long IDs) so "Gemini timeout after 55s" and "Gemini timeout after 110s"
    // collapse into the same bucket.
    const normalizeMessage = (msg: string): string => {
        return msg
            .replace(/\d+(\.\d+)?\s?(ms|s|min)\b/gi, 'Ns')       // "55s", "2.3s" -> "Ns"
            .replace(/\b\d{3,}\b/g, 'N')                          // long numbers -> N
            .replace(/"[^"]{0,40}"/g, '"…"')                      // quoted strings
            .replace(/\b[0-9a-f]{8,}\b/gi, 'ID')                  // hashes / ids
            .replace(/https?:\/\/\S+/g, 'URL')                    // urls
            .trim()
            .slice(0, 120);
    };

    const stats = (() => {
        const buckets = new Map<string, { count: number; sample: string; source: string }>();
        for (const log of logs) {
            const key = normalizeMessage(log.message);
            const existing = buckets.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                buckets.set(key, { count: 1, sample: log.message, source: log.source });
            }
        }
        return Array.from(buckets.entries())
            .map(([key, v]) => ({ key, ...v }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    })();

    return (
        <div className="flex flex-col h-full">
            <AdminViewHeader
                title="Error Logs"
                description={`${filtered.length} Einträge`}
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchLogs}
                            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleClearAll}
                            disabled={clearing || logs.length === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                        >
                            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Alle löschen
                        </button>
                    </div>
                }
            />

            {/* Stats: top reasons grouped by normalized message */}
            {!loading && stats.length > 0 && (
                <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">
                        Top Gründe (letzte {logs.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {stats.map(s => (
                            <button
                                key={s.key}
                                onClick={() => setSearch(s.sample.slice(0, 40))}
                                className="group flex items-center gap-2 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                                title={s.sample}
                            >
                                <span className="text-[11px] font-mono tabular-nums text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">
                                    {s.count}
                                </span>
                                <span className="text-xs text-zinc-700 dark:text-zinc-300 max-w-[28ch] truncate">
                                    {s.sample}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Suche nach Message, User, Context..."
                        className="w-full pl-8 pr-8 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Source filter */}
                <div className="flex items-center gap-1">
                    {sources.map(s => (
                        <button
                            key={s}
                            onClick={() => setSourceFilter(s)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                sourceFilter === s
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                        >
                            {s === 'all' ? 'Alle' : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-400">
                        <AlertTriangle className="w-6 h-6 opacity-30" />
                        <p className="text-sm">Keine Fehler gefunden</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-black">
                                <th className="text-left px-6 py-2 font-medium w-36">Zeit</th>
                                <th className="text-left px-4 py-2 font-medium w-20">Quelle</th>
                                <th className="text-left px-4 py-2 font-medium w-44">User</th>
                                <th className="text-left px-4 py-2 font-medium w-36">Context / URL</th>
                                <th className="text-left px-4 py-2 font-medium">Nachricht</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((log, i) => (
                                <tr
                                    key={log.id}
                                    className={`border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${
                                        i % 2 === 0 ? '' : 'bg-zinc-50/50 dark:bg-zinc-900/20'
                                    }`}
                                >
                                    <td className="px-6 py-3 text-xs text-zinc-400 whitespace-nowrap font-mono">
                                        {formatDate(log.created_at)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${SOURCE_COLORS[log.source] ?? 'bg-zinc-100 text-zinc-500'}`}>
                                            {log.source}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 max-w-[13rem] truncate">
                                        <span className="text-xs font-medium text-zinc-900 dark:text-white">
                                            {log.user_email ?? (log.user_id ? log.user_id.slice(0, 8) + '…' : '—')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-zinc-400 max-w-[9rem]">
                                        {log.context && <div className="font-mono truncate">{log.context}</div>}
                                        {log.url && <div className="truncate opacity-60">{log.url}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300 max-w-sm">
                                        <span className="line-clamp-2 break-words">{log.message}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
