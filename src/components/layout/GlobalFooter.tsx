import React from 'react';
import { Mail, Globe, Info, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { TranslationFunction } from '@/types';

interface GlobalFooterProps {
    t: TranslationFunction;
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({ t }) => {
    return (
        <footer className="w-full bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900/50 py-16 px-8 mt-auto">
            <div className="max-w-[1700px] mx-auto flex flex-col items-center gap-12">

                {/* Brand Section - More minimal */}
                <div className="flex flex-col items-center justify-center gap-4 group opacity-80 hover:opacity-100 transition-opacity duration-500">
                    <div className="flex items-center gap-2.5">
                        <Logo className="w-6 h-6 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                        <Wordmark className="h-4 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors duration-500" />
                    </div>
                </div>

                {/* Navigation - No thick buttons, just clean rows */}
                <nav className="flex flex-wrap justify-center gap-x-12 gap-y-6">
                    <a
                        href="/about"
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        <span>Über Exposé</span>
                    </a>
                    <a
                        href="https://pzillas.com"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        <span>Unsere Website</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                    <a
                        href="mailto:hello@expose.ae"
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                    >
                        <span>Direkter Support</span>
                    </a>
                </nav>

                {/* Legal & Copyright - Even more subtle */}
                <div className="w-full max-w-2xl pt-12 border-t border-zinc-100 dark:border-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col items-center sm:items-start gap-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-800">
                            &copy; 2026 Exposé
                        </p>
                        <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-800">
                            PART OF PZILLAS DESIGN
                        </p>
                    </div>

                    <div className="flex gap-8">
                        <a href="/legal" className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors">Impressum</a>
                        <a href="/privacy" className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors">Datenschutz</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
