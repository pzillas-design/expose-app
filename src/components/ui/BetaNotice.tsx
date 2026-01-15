import React from 'react';
import { Lightbulb } from 'lucide-react';
import { TranslationFunction } from '@/types';

interface BetaNoticeProps {
    t: TranslationFunction;
}

export const BetaNotice: React.FC<BetaNoticeProps> = ({ t }) => {
    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                        {t('beta_notice_text')}{' '}
                        <a
                            href="https://beta.expose.ae"
                            className="font-semibold underline hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            beta.expose.ae
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};
