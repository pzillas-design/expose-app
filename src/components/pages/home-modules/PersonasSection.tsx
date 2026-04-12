import React from 'react';

const PERSONAS = [
    {
        tag: 'Real Estate',
        headline: 'Von der leeren Wohnung zum Exposé — in Minuten.',
        body: 'Professionelles Home Staging ohne Möbellieferung. Zeig Käufern das Potenzial jeder Immobilie.',
    },
    {
        tag: 'Product Photography',
        headline: 'More variants. Less effort. Consistent product shots.',
        body: 'Generate product imagery across backgrounds, moods, and audiences — without a new shoot.',
    },
    {
        tag: 'Design & Creative',
        headline: 'Von der Idee zum fertigen Asset — vor dem Mittagessen.',
        body: 'Visualisiere Konzepte schneller als je zuvor. Variables und Presets machen dein Team reproduzierbar kreativ.',
    },
];

export const PersonasSection: React.FC = () => (
    <section className="w-full px-5 sm:px-8 py-20 sm:py-28 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-6xl mx-auto">

            <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-12 sm:mb-16">
                built for
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-14">
                {PERSONAS.map((p, i) => (
                    <div key={i} className="flex flex-col gap-3">
                        <span className="text-sm text-orange-500 font-medium">
                            {p.tag}
                        </span>
                        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug">
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
