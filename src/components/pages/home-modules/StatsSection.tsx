import React from 'react';

const STATS = [
    { value: '1,600+', label: 'images created' },
    { value: '100+', label: 'designers & creatives' },
    { value: '0.5 K – 4 K', label: 'resolution range' },
];

export const StatsSection: React.FC = () => (
    <section className="w-full px-5 sm:px-8 py-20 sm:py-28 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-12 sm:gap-0 sm:divide-x sm:divide-zinc-200 dark:sm:divide-zinc-800">
            {STATS.map((s, i) => (
                <div key={i} className="flex flex-col gap-1.5 sm:px-16 first:pl-0 last:pr-0">
                    <span className="text-4xl sm:text-5xl font-kumbh font-semibold tracking-tight text-zinc-900 dark:text-white">
                        {s.value}
                    </span>
                    <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        {s.label}
                    </span>
                </div>
            ))}
        </div>
    </section>
);
