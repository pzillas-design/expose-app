import React from 'react';

const TIERS = [
    { res: '0.5 K', credits: 1, label: 'Quick draft' },
    { res: '1 K',   credits: 2, label: 'Standard' },
    { res: '2 K',   credits: 4, label: 'High quality' },
    { res: '4 K',   credits: 8, label: 'Full resolution' },
];

const BULLETS = [
    'No monthly subscription',
    'Credits never expire',
    'Pay only for what you generate',
    'Free starter credits on sign-up',
];

export const PricingSection: React.FC = () => (
    <section className="w-full px-5 sm:px-8 py-20 sm:py-28 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            {/* Left */}
            <div className="flex flex-col gap-5">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">pricing</p>
                <h2 className="text-4xl sm:text-5xl font-kumbh font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
                    Pay only for<br />what you use.
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed max-w-sm">
                    No subscription. No wasted credits. Choose your resolution, generate, done.
                </p>
                <ul className="flex flex-col gap-3 mt-2">
                    {BULLETS.map((b, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                            <span className="w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                            {b}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Right — tiers as plain rows */}
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {TIERS.map((tier, i) => (
                    <div key={i} className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <span className="font-kumbh font-semibold text-zinc-900 dark:text-white w-10">
                                {tier.res}
                            </span>
                            <span className="text-sm text-zinc-400 dark:text-zinc-500">
                                {tier.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                                {Array.from({ length: tier.credits }).map((_, j) => (
                                    <span key={j} className="w-1.5 h-1.5 rounded-full bg-orange-400 dark:bg-orange-500" />
                                ))}
                            </div>
                            <span className="text-sm text-zinc-400 dark:text-zinc-500 tabular-nums w-10 text-right">
                                {tier.credits} cr.
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);
