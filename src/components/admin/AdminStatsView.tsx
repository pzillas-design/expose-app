import React, { useState, useEffect } from 'react';
import { Loader2, Coins, BarChart3, TrendingUp, DollarSign, Activity, Newspaper, ExternalLink, Eye, RefreshCw, DollarSign as PricingIcon } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { supabase } from '@/services/supabaseClient';

interface AdminStatsViewProps {
    t: TranslationFunction;
}

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ t }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pricing, setPricing] = useState<any[]>([]);
    const [syncingPricing, setSyncingPricing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
        fetchPricing();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const jobsData = await adminService.getJobs();
            setJobs(jobsData);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPricing = async () => {
        try {
            const { data, error } = await supabase
                .from('api_pricing')
                .select('*')
                .order('model_name');

            if (error) throw error;
            setPricing(data || []);
        } catch (error) {
            console.error('Failed to fetch pricing:', error);
        }
    };

    const handleSyncPricing = async () => {
        setSyncingPricing(true);
        setSyncError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await supabase.functions.invoke('sync-pricing', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (response.error) throw response.error;

            // Refresh pricing data
            await fetchPricing();

            console.log('Pricing synced successfully:', response.data);
        } catch (error: any) {
            console.error('Failed to sync pricing:', error);
            setSyncError(error.message || 'Sync failed');
        } finally {
            setSyncingPricing(false);
        }
    };

    const stats = React.useMemo(() => {
        const completedJobs = jobs.filter(j => j.status === 'completed');
        const totalTokens = completedJobs.reduce((acc, j) => acc + (j.tokensTotal || 0), 0);
        const totalApiCost = completedJobs.reduce((acc, j) => acc + (j.apiCost || 0), 0);
        const totalUserCredits = completedJobs.reduce((acc, j) => acc + (j.cost || 0), 0);

        return {
            totalJobs: jobs.length,
            completedJobs: completedJobs.length,
            totalTokens,
            totalApiCost,
            totalUserCredits,
            averageCostPerJob: completedJobs.length > 0 ? totalApiCost / completedJobs.length : 0
        };
    }, [jobs]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="p-8 flex-1 min-h-0 space-y-8 overflow-y-auto no-scrollbar">
            <h2 className={Typo.H1}>Token & Kosten Analyse</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Gesamtverbrauch"
                    value={`${stats.totalTokens.toLocaleString()} tokens`}
                    icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
                />
                <StatCard
                    title="Google API Kosten"
                    value={`$${stats.totalApiCost.toFixed(4)}`}
                    icon={<DollarSign className="w-5 h-5 text-red-500" />}
                    desc="Echtzeit Schätzung"
                />
                <StatCard
                    title="User Einnahmen"
                    value={`${stats.totalUserCredits.toFixed(2)} €`}
                    icon={<Coins className="w-5 h-5 text-emerald-500" />}
                    desc="Abgebuchte Credits"
                />
                <StatCard
                    title="Marge"
                    value={`${stats.totalUserCredits > 0 ? (((stats.totalUserCredits * 1.05 - stats.totalApiCost) / (stats.totalUserCredits * 1.05)) * 100).toFixed(1) : 0}%`}
                    icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
                    desc="Geschätzte Profitabilität"
                />
            </div>

            {/* Model Health & News */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                    <h3 className={`${Typo.H2} mb-4 flex items-center gap-2`}>
                        <Activity className="w-4 h-4 text-emerald-500" />
                        Model-Health (API Status)
                    </h3>
                    <div className="space-y-4">
                        <HealthItem
                            name="Nano Banana"
                            modelId="gemini-2.5-flash-image"
                            status="stable"
                            desc="Optimiert für Speed/Cost. Aktuellste Version Jan 2026."
                        />
                        <HealthItem
                            name="Nano Banana Pro"
                            modelId="gemini-3-pro-image-preview"
                            status="preview"
                            desc="High-Fidelity mit Reasoning. Frontier-Modell."
                        />
                        <div className="pt-2">
                            <a
                                href="https://ai.google.dev/gemini-api/docs/models"
                                target="_blank"
                                className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-bold uppercase tracking-wider"
                            >
                                <Eye className="w-3 h-3" />
                                Google Modell-Liste prüfen
                            </a>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                    <h3 className={`${Typo.H2} mb-4 flex items-center gap-2`}>
                        <Newspaper className="w-4 h-4 text-blue-500" />
                        Gemini API News
                    </h3>
                    <div className="space-y-3">
                        <NewsItem
                            date="Jan 2026"
                            tag="NEW"
                            title="Gemini 3 Pro Image Preview"
                            desc="Native Image Generation jetzt mit Text-Rendering Support."
                        />
                        <NewsItem
                            date="Dec 2025"
                            tag="UPDATE"
                            title="Gemini 2.5 Flash Image"
                            desc="Standard-Version für Nano Banana released. 40% günstiger."
                        />
                        <div className="pt-2">
                            <a
                                href="https://ai.google.dev/gemini-api/docs/release-notes"
                                target="_blank"
                                className="text-[10px] text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 font-bold uppercase tracking-wider transition-colors"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Offizielle Release Notes
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Pricing Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`${Typo.H2} flex items-center gap-2`}>
                        <PricingIcon className="w-4 h-4 text-amber-500" />
                        API Pricing (Live Sync)
                    </h3>
                    <button
                        onClick={handleSyncPricing}
                        disabled={syncingPricing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all
                            ${syncingPricing
                                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md active:scale-95'
                            }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingPricing ? 'animate-spin' : ''}`} />
                        {syncingPricing ? 'Syncing...' : 'Preise Aktualisieren'}
                    </button>
                </div>

                {syncError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                        <strong>Sync Error:</strong> {syncError}
                    </div>
                )}

                <div className="space-y-3">
                    {(() => {
                        // Get unique models from jobs
                        const modelsInUse = new Set(jobs.map(j => j.model).filter(Boolean));

                        // Filter pricing to only models in use
                        const relevantPricing = pricing.filter(p => modelsInUse.has(p.model_name));

                        if (relevantPricing.length === 0) {
                            return (
                                <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-center text-sm text-zinc-500">
                                    Keine Pricing-Daten verfügbar. Klicke "Preise Aktualisieren" zum Laden.
                                </div>
                            );
                        }

                        return relevantPricing.map(p => {
                            const displayName = p.model_name === 'gemini-2.5-flash-image' ? 'Nano Banana' :
                                p.model_name === 'gemini-3-pro-image-preview' ? 'Nano Banana Pro' :
                                    p.model_name;

                            const inputCost = parseFloat(p.input_price_per_token);
                            const outputCost = parseFloat(p.output_price_per_token);

                            return (
                                <div key={p.model_name} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                    <div>
                                        <div className="font-bold text-sm uppercase tracking-tight">{displayName}</div>
                                        <div className="text-[10px] text-zinc-500 font-medium font-mono">{p.model_name}</div>
                                        {p.last_updated_at && (
                                            <div className="text-[9px] text-zinc-400 mt-1">
                                                Last Update: {new Date(p.last_updated_at).toLocaleString('de-DE')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-6 text-right">
                                        <div>
                                            <div className="text-[10px] text-zinc-400 uppercase">Input</div>
                                            <div className="font-mono text-xs text-blue-500">
                                                ${(inputCost * 1000000).toFixed(2)}/1M
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-400 uppercase">Output</div>
                                            <div className="font-mono text-xs text-amber-500">
                                                ${(outputCost * 1000000).toFixed(2)}/1M
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-400 uppercase">Source</div>
                                            <div className="font-mono text-[9px] text-zinc-500">
                                                {p.source === 'google_cloud_billing_api' ? '🔗 API' :
                                                    p.source === 'public_docs_manual' ? '📄 Docs' :
                                                        '💾 Manual'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                    <strong>💡 Hinweis:</strong> Preise werden manuell von <a href="https://ai.google.dev/pricing" target="_blank" className="underline hover:text-amber-700">ai.google.dev/pricing</a> synchronisiert.
                    Klicke "Preise Aktualisieren" um die neuesten Preise zu laden. Nur Modelle die du nutzt werden angezeigt.
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <h3 className={`${Typo.H2} mb-4`}>Verbrauch nach Modell</h3>
                <div className="space-y-3">
                    {['gemini-2.5-flash-image', 'gemini-3-pro-image-preview', 'fast', 'pro-1k', 'pro-2k', 'pro-4k'].map(modelId => {
                        const modelJobs = jobs.filter(j => j.model === modelId);
                        if (modelJobs.length === 0) return null;

                        const tokens = modelJobs.reduce((acc, j) => acc + (j.tokensTotal || 0), 0);
                        const apiCost = modelJobs.reduce((acc, j) => acc + (j.apiCost || 0), 0);
                        const userCost = modelJobs.reduce((acc, j) => acc + (j.cost || 0), 0);

                        let displayName = modelId;
                        if (modelId === 'gemini-2.5-flash-image' || modelId === 'fast') displayName = 'Nano Banana';
                        if (modelId === 'gemini-3-pro-image-preview' || modelId === 'pro-1k') displayName = 'Nano Banana Pro';

                        return (
                            <div key={modelId} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                <div>
                                    <div className="font-bold text-sm uppercase tracking-tight">{displayName}</div>
                                    <div className="text-[10px] text-zinc-500 font-medium">{modelJobs.length} Generations</div>
                                </div>
                                <div className="flex gap-8 text-right">
                                    <div>
                                        <div className="text-[10px] text-zinc-400 uppercase">Tokens</div>
                                        <div className="font-mono text-xs">{tokens.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-400 uppercase">Echtkosten</div>
                                        <div className="font-mono text-xs text-red-500">${apiCost.toFixed(4)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-400 uppercase">Credits</div>
                                        <div className="font-mono text-xs text-emerald-500">{userCost.toFixed(2)} €</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hint */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                <strong>Hintergrund:</strong> Die API-Kosten werden live auf Basis der von Google zurückgegebenen Tokens berechnet.
                Die Schätzung nutzt die aktuellen Raten für Gemini 2.5 Flash Image ($0.10/1M input) und Gemini 3 Pro Image Preview ($1.25/1M input).
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, desc }: { title: string, value: string, icon: React.ReactNode, desc?: string }) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{title}</span>
            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                {icon}
            </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        {desc && <div className="text-[10px] text-zinc-500 italic">{desc}</div>}
    </div>
);

const HealthItem = ({ name, modelId, status, desc }: { name: string, modelId: string, status: 'stable' | 'preview' | 'deprecated', desc: string }) => (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-tight">{name}</span>
                <span className="text-[9px] font-mono p-0.5 px-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500">{modelId}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'stable' ? 'bg-emerald-500' : status === 'preview' ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-[9px] font-bold uppercase text-zinc-400">{status}</span>
            </div>
        </div>
        <div className="text-[10px] text-zinc-500 leading-tight">{desc}</div>
    </div>
);

const NewsItem = ({ date, tag, title, desc }: { date: string, tag: string, title: string, desc: string }) => (
    <div className="flex gap-3">
        <div className="shrink-0 text-[10px] font-mono text-zinc-400 pt-0.5">{date}</div>
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold px-1 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase">{tag}</span>
                <span className="text-xs font-bold tracking-tight">{title}</span>
            </div>
            <div className="text-[10px] text-zinc-500 leading-tight">{desc}</div>
        </div>
    </div>
);
