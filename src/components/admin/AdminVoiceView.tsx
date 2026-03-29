import React from 'react';
import { AudioLines, Cpu, Lightbulb, Workflow, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { AdminViewHeader } from './AdminViewHeader';
import { TranslationFunction } from '@/types';

interface AdminVoiceViewProps {
    t: TranslationFunction;
}

const TOOLS = [
    { name: 'get_app_context', desc: 'Read current screen (Gallery, Stack, Detail) & possible actions.' },
    { name: 'open_gallery', desc: 'Go to level 1 (Gallery/Feed).' },
    { name: 'open_create', desc: 'Open create/generate view.' },
    { name: 'open_settings', desc: 'Open settings dialog.' },
    { name: 'enter_multi_select', desc: 'Enable multi-select in gallery.' },
    { name: 'show_detail_panel', desc: 'Show side editing panel.' },
    { name: 'hide_detail_panel', desc: 'Hide side editing panel.' },
    { name: 'set_prompt_text', desc: 'Update prompt input field.' },
    { name: 'trigger_generation', desc: 'Start image generation (User confirmation required).' },
    { name: 'next_image / prev_image', desc: 'Linear navigation.' },
    { name: 'go_back', desc: 'Upward navigation (Detail -> Stack -> Gallery).' },
    { name: 'create_variables', desc: 'Generate creative pill options (Style, Lighting, etc.).' },
    { name: 'select_variable_option', desc: 'Apply a specific variable choice.' },
];

const FLOWS = [
    { from: 'Gallery (L1)', to: 'Stack (L2)', action: 'Select image' },
    { from: 'Stack (L2)', to: 'Detail (L3)', action: 'Expand' },
    { from: 'Detail (L3)', to: 'Stack (L2)', action: 'Go back' },
    { from: 'Any', to: 'Create', action: 'Open Create' },
];

export const AdminVoiceView: React.FC<AdminVoiceViewProps> = ({ t }) => {
    return (
        <div className="flex flex-col">
            <AdminViewHeader 
                title="Voice Assistant Management" 
                description="Skills, Logic and Configuration for Exposé Voice" 
            />
            
            <div className="px-6 md:px-8 py-6 space-y-8">
                
                {/* ── Agent Config ───────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                        label="Model" 
                        value="Gemini 3.1 Flash" 
                        sub="Live Preview" 
                        icon={<Cpu className="w-4 h-4 text-blue-500" />}
                        iconBg="bg-blue-50 dark:bg-blue-900/20"
                    />
                    <StatCard 
                        label="Voice" 
                        value="Charon" 
                        sub="Natural Speech" 
                        icon={<AudioLines className="w-4 h-4 text-purple-500" />}
                        iconBg="bg-purple-50 dark:bg-purple-900/20"
                    />
                    <StatCard 
                        label="Interaktivität" 
                        value="Barge-In" 
                        sub="User can interrupt" 
                        icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
                        iconBg="bg-amber-50 dark:bg-amber-900/20"
                    />
                </div>

                {/* ── Skills / Tools ───────────────────────────────────── */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                        <Workflow className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-sm font-bold">Verfügbare Skills (Tools)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
                        {TOOLS.slice(0, 3).map(tool => (
                            <ToolItem key={tool.name} name={tool.name} desc={tool.desc} />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800">
                        {TOOLS.slice(3, 6).map(tool => (
                            <ToolItem key={tool.name} name={tool.name} desc={tool.desc} />
                        ))}
                    </div>
                    <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/20 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-medium">{TOOLS.length} Tools insgesamt registriert</span>
                        <button className="text-[10px] font-bold text-blue-500 hover:underline">Alle anzeigen</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* ── System Instruction Logik ────────────────────────── */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                            <Info className="w-4 h-4 text-zinc-400" />
                            <h3 className="text-sm font-bold">System-Logik (Persona)</h3>
                        </div>
                        <div className="p-6 flex-1 text-[11px] leading-relaxed text-zinc-500 space-y-4 font-mono">
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <span className="block font-bold text-zinc-400 mb-1 text-[9px] uppercase tracking-wider">Kern-Instruktion (System Prompt)</span>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-300 italic mb-2">"Du bist Exposé, Sprachassistent einer KI-Bildgenerator-App..."</p>
                                <div className="space-y-1">
                                    <div className="flex gap-2"><span className="text-blue-500">•</span> <span>Navigation: Galerie (L1) -&gt; Stapel (L2) -&gt; Detail (L3)</span></div>
                                    <div className="flex gap-2"><span className="text-blue-500">•</span> <span>Sprich knapp &amp; prägnant</span></div>
                                    <div className="flex gap-2"><span className="text-blue-500">•</span> <span>Nutze Funktionen still (keine Tool-Kommentare)</span></div>
                                    <div className="flex gap-2"><span className="text-blue-500">•</span> <span>VARIABLEN: Erst auf Nachfrage ("Optionen") anbieten</span></div>
                                </div>
                            </div>
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <span className="block font-bold text-zinc-400 mb-1 text-[9px] uppercase tracking-wider">Begrüßung</span>
                                <span className="text-emerald-500 font-bold">Trigger:</span> Session Start<br/>
                                <span className="text-[10px]">"Willkommen bei Exposé. Möchtest du ein Bild hochladen, bearbeiten oder etwas Neues erstellen?"</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Navigations-Flow ───────────────────────────────── */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                            <Workflow className="w-4 h-4 text-zinc-400" />
                            <h3 className="text-sm font-bold">Navigations-Hierarchie</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {FLOWS.map((flow, idx) => (
                                <div key={idx} className="flex items-center gap-4 group">
                                    <div className="flex-1 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 text-center">
                                        <span className="text-[10px] font-bold text-zinc-400 block mb-0.5">Von</span>
                                        <span className="text-xs font-semibold">{flow.from}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                                    <div className="flex-1 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 text-center">
                                        <span className="text-[10px] font-bold text-zinc-400 block mb-0.5">Zu</span>
                                        <span className="text-xs font-semibold">{flow.to}</span>
                                    </div>
                                    <div className="w-24 text-[10px] font-medium text-zinc-400 italic">
                                        trigger: {flow.action}
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

interface ToolItemProps {
    name: string;
    desc: string;
}

const ToolItem: React.FC<ToolItemProps> = ({ name, desc }) => (
    <div className="p-5 space-y-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
        <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <code className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">{name}</code>
        </div>
        <p className="text-[10px] leading-normal text-zinc-400 line-clamp-2">{desc}</p>
    </div>
);

const StatCard = ({ label, value, sub, icon, iconBg }: {
    label: string; value: string; sub: string;
    icon: React.ReactNode; iconBg: string;
}) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-zinc-400">{label}</span>
            <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
        </div>
        <div>
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{value}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">{sub}</div>
        </div>
    </div>
);
