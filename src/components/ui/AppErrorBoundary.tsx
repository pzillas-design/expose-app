import React from 'react';
import { logError } from '@/services/errorLogger';

/**
 * Das Auffangnetz um die ganze Anwendung.
 *
 * Ohne eine solche Grenze beendet React bei einem Fehler im Rendern den
 * gesamten Baum: Die Seite ist weiss, in der Konsole steht etwas, das niemand
 * liest, und gemeldet wird "die Seite ist kaputt" — ohne Hinweis, woran.
 *
 * Hier steht stattdessen ein Satz, ein Knopf, und die Meldung geht in
 * error_logs. Beim naechsten Mal wissen wir, was passiert ist.
 */
interface State { error: Error | null }
interface Props { children: React.ReactNode }

export class AppErrorBoundary extends React.Component<Props, State> {
    // React 19 liefert keine .d.ts — props und state ausdruecklich erklaeren,
    // damit TypeScript sie findet (wie bei ModalErrorBoundary in App.tsx).
    declare props: Props;
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[App] render error:', error, info);
        // Erste Zeilen der Spur reichen: Der Rest ist gebuendelter Code und
        // sagt ohne Quellkarte ohnehin nichts.
        const trace = (error.stack || '').split('\n').slice(0, 4).join(' | ');
        void logError(`UI crash: ${error.message} ${trace}`, {
            source: 'silent',
            context: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-100 dark:bg-[#121214] px-6">
                <div className="max-w-sm w-full text-center">
                    <h1 className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100">
                        Da ist etwas schiefgelaufen
                    </h1>
                    <p className="mt-2 text-[14px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                        Die Ansicht konnte nicht aufgebaut werden. Ein Neuladen hilft
                        meistens — der Fehler ist bei uns vermerkt.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-6 h-10 px-5 rounded-full text-[15px] font-medium
                            bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900
                            hover:opacity-90 transition-opacity"
                    >
                        Neu laden
                    </button>
                    {/* Die Meldung im Klartext, klein: Wer sie abschreibt oder
                        weiterschickt, hilft uns mehr als jede Beschreibung. */}
                    <p className="mt-6 text-[11px] font-mono text-zinc-400 dark:text-zinc-600 break-words">
                        {this.state.error.message}
                    </p>
                </div>
            </div>
        );
    }
}
