import React from 'react';

const TESTIMONIALS = [
    {
        quote: "exposé hat unseren Staging-Workflow komplett verändert. Was früher Stunden dauerte, dauert jetzt Minuten.",
        author: "Agentur Donnerkeil",
        role: "Creative Agency",
    },
    {
        quote: "The annotation tools are unlike anything else. I direct the AI exactly where I want — no more rewriting prompts.",
        author: "Sarah Chen",
        role: "Interior Photographer",
    },
    {
        quote: "We use it for every product launch. Variables alone save our team hours every week.",
        author: "Marc Dubois",
        role: "Creative Director",
    },
];

export const TestimonialsSection: React.FC = () => (
    <section className="w-full px-5 sm:px-8 py-24 sm:py-32 bg-zinc-50 dark:bg-zinc-900/40">
        <div className="max-w-6xl mx-auto">

            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-10 sm:mb-14">
                what people say
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
                {TESTIMONIALS.map((t, i) => (
                    <div key={i} className="flex flex-col gap-5">
                        <p className="text-xl sm:text-2xl font-kumbh font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug">
                            "{t.quote}"
                        </p>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {t.author}
                            </span>
                            <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
                                {t.role}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);
