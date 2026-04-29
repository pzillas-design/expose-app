import React from 'react';

const TIERS = [
    { res: '0.5 K', price: '0.05 €', label: 'up to 512 × 512 px' },
    { res: '1 K',   price: '0.10 €', label: 'up to 1024 × 1024 px' },
    { res: '2 K',   price: '0.20 €', label: 'up to 2048 × 2048 px' },
    { res: '4 K',   price: '0.40 €', label: 'up to 4096 × 4096 px' },
];

export const PricingSection: React.FC = () => (
    <section className="w-full px-5 sm:px-8 py-20 sm:py-28 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">

            {/* Left */}
            <div className="flex flex-col gap-3">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">pricing</p>
                <h2 className="text-4xl sm:text-5xl font-kumbh font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
                    Pay only for<br />what you use.
                </h2>
                <p className="text-zinc-400 dark:text-zinc-500 text-sm leading-relaxed mt-1">
                    No subscription. Free to try — starter credits on sign-up.
                </p>
            </div>

            {/* Right — tiers */}
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {TIERS.map((tier, i) => (
                    <div key={i} className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-5">
                            <span className="font-kumbh font-semibold text-zinc-900 dark:text-white w-10">
                                {tier.res}
                            </span>
                            <span className="text-sm text-zinc-400 dark:text-zinc-500">{tier.label}</span>
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{tier.price}</span>
                    </div>
                ))}
            </div>
        </div>
    </section>
);
