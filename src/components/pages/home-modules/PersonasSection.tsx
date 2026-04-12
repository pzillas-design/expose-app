import React from 'react';

const PERSONAS = [
    {
        tag: 'Real Estate',
        headline: 'Von der leeren Wohnung zum Exposé — in Minuten.',
        body: 'Professionelles Home Staging ohne Möbellieferung. Zeig Käufern das Potenzial jeder Immobilie.',
    },
    {
        tag: 'Product Photography',
        headline: 'More variants. Less effort. Perfect product shots.',
        body: 'Generate consistent product imagery across different backgrounds, moods, and audiences — without a new shoot.',
    },
    {
        tag: 'Design & Creative',
        headline: 'Von der Idee zum fertigen Asset — vor dem Mittagessen.',
        body: 'Visualisiere Konzepte schneller als je zuvor. Variables und Presets machen dein Team reproduzierbar kreativ.',
    },
];

export const PersonasSection: React.FC = () => (
    <section className="w-full px-5 sm:px-8 py-24 sm:py-32 bg-zinc-50 dark:bg-zinc-900/40">
        <div className="max-w-6xl mx-auto">

            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-10 sm:mb-14">
                built for
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden">
                {PERSONAS.map((p, i) => (
                    <div
                        key={i}
                        className="flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-900 px-8 py-10"
                    >
                        <span className="text-[11px] uppercase tracking-[0.14em] text-orange-500 font-medium">
                            {p.tag}
                        </span>
                        <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug">
                            {p.headline}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {p.body}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);
