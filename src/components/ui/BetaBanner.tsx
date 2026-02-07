import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TranslationFunction } from '@/types';

interface BetaBannerProps {
    t: TranslationFunction;
}

export function BetaBanner({ t }: BetaBannerProps) {
    const [isDismissed, setIsDismissed] = useState(() => {
        return sessionStorage.getItem('betaBannerDismissed') === 'true';
    });

    const handleDismiss = () => {
        sessionStorage.setItem('betaBannerDismissed', 'true');
        setIsDismissed(true);
    };

    if (isDismissed) return null;

    return (
        <div className="w-full bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <div className="max-w-[1700px] mx-auto px-8 lg:px-12 2xl:px-16 py-3 flex items-center justify-between gap-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Suchen Sie die alte Version? Besuchen Sie{' '}
                    <a
                        href="https://beta.expose.ae"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                        beta.expose.ae
                    </a>
                </p>
                <button
                    onClick={handleDismiss}
                    className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Banner schließen"
                >
                    <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                </button>
            </div>
        </div>
    );
}
