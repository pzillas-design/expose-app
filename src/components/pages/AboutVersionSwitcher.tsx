import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Version {
    id: string;
    name: string;
    path: string;
}

const versions: Version[] = [
    { id: '0', name: 'About 0 (Original)', path: '/about' },
    { id: '1', name: 'About 1 (Blueprint)', path: '/about-1' },
    { id: '2', name: 'About 2 (The Dive)', path: '/about-2' },
    { id: '3', name: 'About 3 (Experience)', path: '/about-3' },
];

export const AboutVersionSwitcher: React.FC<{ activeId: string }> = ({ activeId }) => {
    const [isOpen, setIsOpen] = useState(false);

    const activeVersion = versions.find(v => v.id === activeId) || versions[0];

    return (
        <div className="fixed top-24 right-8 z-[200]">
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 bg-black/90 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-xs font-bold text-white shadow-2xl hover:bg-black transition-all group"
                >
                    <span className="opacity-50 group-hover:opacity-100 transition-opacity uppercase tracking-widest text-[10px]">Version</span>
                    <span className="text-orange-500">{activeVersion.name}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 space-y-1">
                            {versions.map(v => (
                                <a
                                    key={v.id}
                                    href={v.path}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-[11px] transition-all ${v.id === activeId ? 'bg-orange-500/10 text-orange-500 font-bold' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    {v.name}
                                    {v.id === activeId && <Check className="w-3 h-3" />}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
