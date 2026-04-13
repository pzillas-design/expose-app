import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, ChevronDown as Chevron } from 'lucide-react';
import { PromptBlock } from '@/types';
import { generateId } from '@/utils/ids';
import { assembleSystemPrompt } from '@/services/voiceAdminService';

interface PromptBlocksTableProps {
    blocks: PromptBlock[];
    onChange: (blocks: PromptBlock[]) => void;
}

// ─── Auto-growing textarea ───────────────────────────────────────────────────

const AutoText: React.FC<{
    value: string;
    onChange: (v: string) => void;
    active: boolean;
    placeholder?: string;
}> = ({ value, onChange, active, placeholder }) => {
    const ref = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [value]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={e => {
                onChange(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            rows={1}
            placeholder={placeholder ?? 'Text…'}
            className={[
                'w-full bg-transparent border-none outline-none resize-none',
                'text-[13px] leading-relaxed',
                'placeholder:text-zinc-300 dark:placeholder:text-zinc-600',
                active ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500',
            ].join(' ')}
        />
    );
};

// ─── Main table ──────────────────────────────────────────────────────────────

export const PromptBlocksTable: React.FC<PromptBlocksTableProps> = ({ blocks, onChange }) => {
    const [previewOpen, setPreviewOpen] = React.useState(false);

    // Max number of alternatives across all blocks → determines column count
    const colCount = Math.max(1, ...blocks.map(b => b.alternatives.length));

    const updateBlock = (id: string, updated: PromptBlock) =>
        onChange(blocks.map(b => b.id === id ? updated : b));

    const deleteBlock = (id: string) =>
        onChange(blocks.filter(b => b.id !== id));

    const moveBlock = (index: number, dir: 'up' | 'down') => {
        const next = [...blocks];
        const to = dir === 'up' ? index - 1 : index + 1;
        if (to < 0 || to >= next.length) return;
        [next[index], next[to]] = [next[to], next[index]];
        onChange(next);
    };

    const addBlock = () => {
        const altId = generateId();
        onChange([...blocks, {
            id: generateId(),
            label: 'NEU',
            activeId: null,
            alternatives: [{ id: altId, label: 'Standard', text: '' }],
        }]);
    };

    // Add a new alternative column slot to a specific block
    const addAltToBlock = (blockId: string) => {
        const labels = ['Variante A', 'Variante B', 'Variante C', 'Variante D', 'Variante E', 'Variante F', 'Variante G', 'Variante H'];
        onChange(blocks.map(b => {
            if (b.id !== blockId) return b;
            const label = labels[b.alternatives.length] ?? String(b.alternatives.length + 1);
            return { ...b, alternatives: [...b.alternatives, { id: generateId(), label, text: '' }] };
        }));
    };

    // Add a new column to ALL blocks at once
    const addColumnToAll = () => {
        const labels = ['Variante A', 'Variante B', 'Variante C', 'Variante D', 'Variante E', 'Variante F', 'Variante G', 'Variante H'];
        onChange(blocks.map(b => {
            const label = labels[b.alternatives.length] ?? String(b.alternatives.length + 1);
            return { ...b, alternatives: [...b.alternatives, { id: generateId(), label, text: '' }] };
        }));
    };

    const enabledCount = blocks.filter(b => b.activeId !== null).length;
    const assembled = assembleSystemPrompt(blocks);

    // Column headers
    const colLabels = ['Variante A', 'Variante B', 'Variante C', 'Variante D', 'Variante E', 'Variante F', 'Variante G', 'Variante H'];

    return (
        <div className="flex flex-col min-w-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse" style={{ minWidth: 560 }}>

                    {/* ── Header ── */}
                    <thead className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/60">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium text-zinc-400 w-[140px]">Block</th>
                            {Array.from({ length: colCount }, (_, ci) => (
                                <th key={ci} className="px-5 py-3 text-xs font-medium text-zinc-400 min-w-[220px]">
                                    {colLabels[ci] ?? `Col ${ci + 1}`}
                                </th>
                            ))}
                            {/* Global add-column button */}
                            <th className="px-3 py-3 w-[44px]">
                                <button
                                    type="button"
                                    onClick={addColumnToAll}
                                    title="Spalte für alle Blöcke hinzufügen"
                                    className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 dark:text-zinc-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </th>
                            <th className="px-5 py-3 text-xs font-medium text-zinc-400 text-right w-[60px]">
                                <span className="tabular-nums">{enabledCount}/{blocks.length}</span>
                            </th>
                        </tr>
                    </thead>

                    {/* ── Body ── */}
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                        {blocks.length === 0 && (
                            <tr>
                                <td colSpan={colCount + 3} className="px-5 py-10 text-center text-sm text-zinc-400">
                                    Keine Blöcke — füge einen hinzu.
                                </td>
                            </tr>
                        )}

                        {blocks.map((block, bi) => {
                            const isEnabled = block.activeId !== null;

                            return (
                                <tr key={block.id} className="group align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">

                                    {/* ── Block label + controls ── */}
                                    <td className="px-5 py-3.5 border-r border-zinc-100 dark:border-zinc-800/60">
                                        <div className="flex items-start gap-2 pt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={() => updateBlock(block.id, {
                                                    ...block,
                                                    activeId: isEnabled ? null : (block.alternatives[0]?.id ?? null),
                                                })}
                                                className="mt-0.5 w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer shrink-0"
                                            />
                                            <input
                                                type="text"
                                                value={block.label}
                                                onChange={e => updateBlock(block.id, { ...block, label: e.target.value.toUpperCase() })}
                                                className={[
                                                    'min-w-0 w-full text-[11px] font-bold uppercase tracking-wider',
                                                    'bg-transparent border-none outline-none font-mono',
                                                    isEnabled ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-300 dark:text-zinc-600',
                                                ].join(' ')}
                                                placeholder="LABEL"
                                            />
                                        </div>
                                        {/* Row controls — show on row hover */}
                                        <div className="flex items-center gap-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => moveBlock(bi, 'up')}
                                                disabled={bi === 0}
                                                className="p-1 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-20 transition-colors rounded"
                                            >
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveBlock(bi, 'down')}
                                                disabled={bi === blocks.length - 1}
                                                className="p-1 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-20 transition-colors rounded"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteBlock(block.id)}
                                                className="p-1 text-zinc-300 hover:text-red-400 transition-colors rounded"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>

                                    {/* ── Alternative cells ── */}
                                    {Array.from({ length: colCount }, (_, ci) => {
                                        const alt = block.alternatives[ci];
                                        const isAltActive = !!alt && block.activeId === alt.id;

                                        if (!alt) {
                                            // Empty cell — button to add alt at this position
                                            return (
                                                <td key={ci} className="px-5 py-3.5 border-r border-zinc-100 dark:border-zinc-800/60">
                                                    <button
                                                        type="button"
                                                        onClick={() => addAltToBlock(block.id)}
                                                        className="flex items-center gap-1 text-[11px] text-zinc-200 dark:text-zinc-700 hover:text-blue-400 dark:hover:text-blue-500 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        hinzufügen
                                                    </button>
                                                </td>
                                            );
                                        }

                                        return (
                                            <td
                                                key={ci}
                                                className={[
                                                    'px-4 py-3 border-r border-zinc-100 dark:border-zinc-800/60 transition-colors',
                                                    isAltActive && isEnabled
                                                        ? 'bg-blue-50/50 dark:bg-blue-950/10'
                                                        : '',
                                                    !isEnabled ? 'opacity-40' : '',
                                                ].join(' ')}
                                            >
                                                <div className="flex flex-col gap-1.5">
                                                    {/* Checkbox */}
                                                    <input
                                                        type="checkbox"
                                                        checked={isAltActive}
                                                        disabled={!isEnabled}
                                                        onChange={() => updateBlock(block.id, {
                                                            ...block,
                                                            activeId: isAltActive ? null : alt.id,
                                                        })}
                                                        className="w-3.5 h-3.5 shrink-0 rounded accent-blue-500 cursor-pointer disabled:cursor-default"
                                                    />
                                                    {/* Editable text */}
                                                    <AutoText
                                                        value={alt.text}
                                                        onChange={text => updateBlock(block.id, {
                                                            ...block,
                                                            alternatives: block.alternatives.map(a =>
                                                                a.id === alt.id ? { ...a, text } : a
                                                            ),
                                                        })}
                                                        active={isAltActive && isEnabled}
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}

                                    {/* Empty cell under the + header */}
                                    <td />
                                    {/* Empty cell — controls column removed */}
                                    <td />
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* ── Add block ── */}
                <div className="border-t border-zinc-50 dark:border-zinc-800 px-5 py-3">
                    <button
                        type="button"
                        onClick={addBlock}
                        className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Block hinzufügen
                    </button>
                </div>
            </div>

            {/* ── Preview ── */}
            <div className="border-t border-zinc-100 dark:border-zinc-800">
                <button
                    type="button"
                    onClick={() => setPreviewOpen(v => !v)}
                    className="w-full flex items-center justify-between gap-2 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left"
                >
                    <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                        <Eye className="w-3 h-3" />
                        Vorschau assemblierten Prompt
                    </div>
                    <Chevron className={`w-3.5 h-3.5 text-zinc-300 transition-transform ${previewOpen ? 'rotate-180' : ''}`} />
                </button>
                {previewOpen && (
                    <div className="px-5 py-4 border-t border-zinc-50 dark:border-zinc-800">
                        <pre className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono">
                            {assembled || <span className="italic text-zinc-300 dark:text-zinc-600">Keine aktiven Blöcke.</span>}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
