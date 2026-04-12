import React from 'react';

const STATS = [
    { value: '50,000+', label: 'images generated' },
    { value: '< 15 s', label: 'per generation' },
    { value: '0.5 K – 4 K', label: 'resolution range' },
    { value: '3-in-1', label: 'voice · annotations · presets' },
];

export const StatsSection: React.FC = () => (
    <section className="w-full border-y border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-100 dark:divide-zinc-800/60">
            {STATS.map((s, i) => (
                <div key={i} className="flex flex-col items-center justify-center text-center px-4 py-10 sm:py-14 gap-2">
                    <span className="text-2xl sm:text-3xl font-kumbh font-semibold tracking-tight text-zinc-900 dark:text-white">
                        {s.value}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.14em]">
                        {s.label}
                    </span>
                </div>
            ))}
        </div>
    </section>
);
