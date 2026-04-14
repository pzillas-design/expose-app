import React from 'react';

const TESTIMONIALS = [
    {
        en: { quote: "What used to take hours takes minutes." },
        de: { quote: "Was früher Stunden dauerte, dauert jetzt Minuten." },
        author: "Agentur Donnerkeil",
        role: "Creative Agency",
    },
    {
        en: { quote: "I direct the AI exactly where I want it." },
        de: { quote: "Ich dirigiere die KI genau dorthin, wo ich sie haben will." },
        author: "Sarah Chen",
        role: "Interior Photographer",
    },
    {
        en: { quote: "Variables alone saves our team hours every week." },
        de: { quote: "Variables spart unserem Team täglich Stunden." },
        author: "Marc Dubois",
        role: "Creative Director",
    },
];

interface Props {
    lang?: string;
}

export const TestimonialsSection: React.FC<Props> = ({ lang }) => {
    const isDe = lang === 'de';

    return (
        <section className="w-full px-5 sm:px-8 py-20 sm:py-28 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/60">
            <div className="max-w-6xl mx-auto">

                <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-10 sm:mb-14">
                    {isDe ? 'das sagen andere' : 'what people say'}
                </p>

                <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {TESTIMONIALS.map((t, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 py-7 sm:py-8">
                            <p className="text-2xl sm:text-3xl font-kumbh font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug max-w-xl">
                                "{isDe ? t.de.quote : t.en.quote}"
                            </p>
                            <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0 sm:pl-12">
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {t.author}
                                </span>
                                <span className="text-sm text-zinc-400 dark:text-zinc-500">
                                    {t.role}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
