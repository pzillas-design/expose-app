import React from 'react';

const TESTIMONIALS = [
    {
        quote: "exposé hat unseren Staging-Workflow komplett verändert. Was früher Stunden dauerte, dauert jetzt Minuten — und die Qualität übertrifft alles, was wir bisher gesehen haben.",
        author: "Agentur Donnerkeil",
        role: "Creative Agency",
        initials: "AD",
    },
    {
        quote: "The annotation tools are unlike anything else. I can direct the AI exactly where I want changes — no more rewriting prompts hoping it understands.",
        author: "Sarah Chen",
        role: "Interior Photographer",
        initials: "SC",
    },
    {
        quote: "We use it for every product launch now. Variables alone save our team hours every week — and the results are consistent every time.",
        author: "Marc Dubois",
        role: "Creative Director, E-Commerce",
        initials: "MD",
    },
];

export const TestimonialsSection: React.FC = () => {
    return (
        <section className="w-full px-5 sm:px-8 py-24 sm:py-32 bg-white dark:bg-zinc-950">
            <div className="max-w-6xl mx-auto">

                {/* Label */}
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-10 sm:mb-14">
                    what people say
                </p>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                    {TESTIMONIALS.map((t, i) => (
                        <div
                            key={i}
                            className="flex flex-col justify-between rounded-2xl bg-zinc-50 dark:bg-zinc-900 px-7 py-8 gap-8"
                        >
                            {/* Quote mark + text */}
                            <div className="flex flex-col gap-4">
                                <span className="text-3xl leading-none text-zinc-200 dark:text-zinc-700 font-serif select-none">
                                    "
                                </span>
                                <p className="text-zinc-700 dark:text-zinc-300 text-[15px] leading-[1.75]">
                                    {t.quote}
                                </p>
                            </div>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide">
                                        {t.initials}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                                        {t.author}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5">
                                        {t.role}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
