import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Bookmark, Trash2, Plus, ArrowLeft, Clock, LayoutGrid } from 'lucide-react';
import { PromptTemplate } from '../types';
import { CATEGORIES } from '../data/constants';

interface PresetLibraryProps {
    templates: PromptTemplate[];
    onSelect: (template: PromptTemplate) => void;
    onTogglePin: (id: string) => void;
    onDelete: (id: string) => void;
    onCreate: (template: Omit<PromptTemplate, 'id' | 'isPinned' | 'usageCount' | 'isCustom' | 'lastUsed'>) => void;
}

export const PresetLibrary: React.FC<PresetLibraryProps> = ({
    templates,
    onSelect,
    onTogglePin,
    onDelete,
    onCreate
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Alle');
    const [view, setView] = useState<'list' | 'create'>('list');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Create Form State
    const [newTitle, setNewTitle] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [newTags, setNewTags] = useState<string[]>([]);

    // Derived Lists
    const pinnedTemplates = useMemo(() => templates.filter(t => t.isPinned), [templates]);

    const recentTemplates = useMemo(() => {
        return templates
            .filter(t => t.lastUsed && !t.isPinned) // Don't show if already pinned
            .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
            .slice(0, 5);
    }, [templates]);

    const allFilteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.prompt.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = selectedCategory === 'Alle' || t.tags.includes(selectedCategory);
            return matchesSearch && matchesCategory;
        });
    }, [templates, search, selectedCategory]);

    const handleCreateSubmit = () => {
        if (!newTitle.trim() || !newPrompt.trim()) return;
        onCreate({
            title: newTitle,
            prompt: newPrompt,
            tags: newTags,
        });
        setNewTitle('');
        setNewPrompt('');
        setNewTags([]);
        setView('list');
        setSearch(''); // Clear search to show new item
    };

    const toggleTag = (tag: string) => {
        setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    // Auto-expand when searching
    useEffect(() => {
        if (search.trim().length > 0 && !isExpanded) {
            setIsExpanded(true);
        }
    }, [search, isExpanded]);

    return (
        <div className={`flex flex-col bg-[#161616] border-t border-zinc-800 transition-all duration-500 ease-in-out ${isExpanded ? 'h-[500px]' : 'h-auto'}`}>

            {/* Header / Search Bar */}
            <div className="px-6 py-5 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <LayoutGrid className="w-3 h-3" />
                        Presets
                    </label>
                    {isExpanded && (
                        <button
                            onClick={() => { setIsExpanded(false); setView('list'); setSearch(''); }}
                            className="text-[10px] text-zinc-500 hover:text-white transition-colors uppercase tracking-wider"
                        >
                            Close
                        </button>
                    )}
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                    <input
                        ref={searchInputRef}
                        value={search}
                        onFocus={() => setIsExpanded(true)}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">

                {/* COMPACT VIEW (Pinned & Recent) - Only visible if NOT searching/filtering or specifically collapsed */}
                {!isExpanded && (
                    <div className="px-4 space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Pinned */}
                        {pinnedTemplates.length > 0 && (
                            <div className="space-y-1">
                                {pinnedTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => onSelect(t)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/50 transition-colors group text-left"
                                    >
                                        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 truncate flex-1">
                                            {t.title}
                                        </span>
                                        <Bookmark className="w-3 h-3 text-zinc-700 fill-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Recent */}
                        {recentTemplates.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 pl-3">Recent</div>
                                <div className="space-y-1">
                                    {recentTemplates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => onSelect(t)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/50 transition-colors group text-left"
                                        >
                                            <Clock className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 shrink-0" />
                                            <span className="text-xs text-zinc-500 group-hover:text-zinc-300 truncate flex-1">
                                                {t.title}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {pinnedTemplates.length === 0 && recentTemplates.length === 0 && (
                            <div className="text-center py-4">
                                <span className="text-[10px] text-zinc-600">No pinned or recent presets.</span>
                            </div>
                        )}
                    </div>
                )}


                {/* EXPANDED VIEW - Library Browser */}
                {isExpanded && view === 'list' && (
                    <div className="space-y-4 px-4 h-full flex flex-col">
                        {/* Categories */}
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 pb-2 mask-gradient-right">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${selectedCategory === cat
                                            ? 'bg-zinc-200 text-black border-zinc-200'
                                            : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        <div className="space-y-2 min-h-0 flex-1">
                            {/* Create New Button */}
                            <button
                                onClick={() => setView('create')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/30 transition-all group text-left mb-4"
                            >
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                    <Plus className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200">Create New Preset</div>
                                    <div className="text-[10px] text-zinc-600">Save your current prompt for later</div>
                                </div>
                            </button>

                            {allFilteredTemplates.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => { onSelect(t); setIsExpanded(false); }}
                                    className="group relative flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-all cursor-pointer border border-transparent hover:border-zinc-800"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                                                {t.title}
                                            </span>
                                            {t.isCustom && <span className="text-[8px] px-1 py-px rounded bg-zinc-800 text-zinc-500 uppercase">User</span>}
                                        </div>
                                        <p className="text-[10px] text-zinc-600 line-clamp-2 group-hover:text-zinc-500">{t.prompt}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onTogglePin(t.id); }}
                                            className={`p-1.5 rounded hover:bg-zinc-700 ${t.isPinned ? 'text-zinc-200' : 'text-zinc-600'}`}
                                        >
                                            <Bookmark className={`w-3 h-3 ${t.isPinned ? 'fill-current' : ''}`} />
                                        </button>
                                        {t.isCustom && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                                                className="p-1.5 rounded hover:bg-red-900/30 text-zinc-600 hover:text-red-400"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CREATE VIEW */}
                {isExpanded && view === 'create' && (
                    <div className="px-4 space-y-6 animate-in slide-in-from-right duration-200">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setView('list')} className="p-1 -ml-1 text-zinc-500 hover:text-white">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">New Template</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 block mb-1.5">Title</label>
                                <input
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Modern Kitchen"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 block mb-1.5">Prompt</label>
                                <textarea
                                    value={newPrompt}
                                    onChange={(e) => setNewPrompt(e.target.value)}
                                    className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none leading-relaxed"
                                    placeholder="Detailed description..."
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 block mb-1.5">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.filter(c => c !== 'Alle').map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => toggleTag(cat)}
                                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${newTags.includes(cat)
                                                    ? 'bg-zinc-700 text-white border-zinc-600'
                                                    : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-700'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateSubmit}
                                disabled={!newTitle.trim() || !newPrompt.trim()}
                                className="w-full py-3 bg-white text-black rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed mt-4"
                            >
                                Save Preset
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
