import React from 'react';
import { Mail, Globe, Info } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { TranslationFunction } from '@/types';

interface GlobalFooterProps {
    t: TranslationFunction;
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({ t }) => {
    return (
        <footer className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-12 px-6 mt-auto">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Brand & Mission */}
                <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="flex items-center gap-3">
                        <Logo className="w-10 h-10" />
                        <Wordmark className="h-6 text-zinc-900 dark:text-white" />
                    </div>
                    <p className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                        Exposé ist die Plattform für professionelle Bildgenerierung und kreative Workflows.
                        Entwickelt für Designer, Developer und Visionäre.
                    </p>
                </div>

                {/* Footer Links & Navigation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
                    <a
                        href="/about"
                        className="group flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                <Info className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Über Exposé</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 transition-all group-hover:bg-zinc-900 dark:group-hover:bg-white" />
                    </a>

                    <a
                        href="https://pzillas.com"
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                <Globe className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Unsere Website</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 transition-all group-hover:bg-zinc-900 dark:group-hover:bg-white" />
                    </a>

                    <a
                        href="mailto:hello@expose.ae"
                        className="group flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                <Mail className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Direkter Support</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 transition-all group-hover:bg-zinc-900 dark:group-hover:bg-white" />
                    </a>
                </div>

                {/* Bottom Legal & Copyright */}
                <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs font-medium text-zinc-400 dark:text-zinc-600 tracking-wide">
                        &copy; 2026 Exposé. All rights reserved. Made by pzillas.
                    </p>
                    <div className="flex gap-6">
                        <a href="/legal" className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Impressum</a>
                        <a href="/privacy" className="text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Datenschutz</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
