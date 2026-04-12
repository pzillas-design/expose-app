import React from 'react';

const PERSONAS = [
    {
        tag: 'Real Estate',
        headline: 'Von der leeren Wohnung zum Exposé — in Minuten.',
    },
    {
        tag: 'Product Photography',
        headline: 'More variants. Less effort. Consistent results.',
    },
    {
        tag: 'Design & Creative',
        headline: 'Von der Idee zum fertigen Asset — vor dem Mittagessen.',
    },
];

export const PersonasSection: React.FC = () => (
    <section className="w-full px-5 sm:px-8 py-20 sm:py-28 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-6xl mx-auto">

            <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-10 sm:mb-14">
                built for
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
                {PERSONAS.map((p, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <span className="text-sm text-orange-500 font-medium">
                            {p.tag}
                        </span>
                        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug">
                            {p.headline}
                        </h3>
                    </div>
                ))}
            </div>
        </div>
    </section>
);
