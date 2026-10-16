import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Download, Repeat, AudioLines, MicOff, MoreHorizontal } from 'lucide-react';
import { RoundIconButton } from '@/components/ui/DesignSystem';
import { DropdownMenu, type DropdownItem } from '@/components/ui/DropdownMenu';
import { buildDetailMenuItems } from '@/components/layout/detailMenu';

/**
 * Der Kopf der Detailansicht — im Blatt, nicht ueber dem Bild.
 *
 * Vorher trug eine Leiste ueber dem ganzen Fenster den Namen des Bildes und
 * seine Knoepfe, waehrend daneben das Panel stand: zwei Flaechen fuer eine
 * Sache. Jetzt gibt es eine. Das Bild bekommt dafuer das ganze Fenster, und
 * alles, was zu ihm gehoert, steht beieinander.
 *
 * Die Eintraege des Menues kommen aus detailMenu.tsx — dieselbe Liste, die
 * die Navigationsleiste auf dem Handy zeigt.
 */
export interface DetailSheetHeaderProps {
    t: (key: string) => string;
    title: string;
    version?: string;
    onBack: () => void;
    onDownload?: () => void;
    onRegenerate?: () => void;
    onInfo?: () => void;
    onDelete?: () => void;
    hasPrompt: boolean;
    /**
     * Der Sprachassistent. Der Eintrag entsteht hier, nicht beim Aufrufer —
     * sonst muesste jeder Ort, der diesen Kopf zeigt, dieselben zwei Zeilen
     * JSX mitbringen.
     */
    voice?: { enabled: boolean; active: boolean; lang: string; onStart?: () => void; onStop?: () => void };
    /** Steht links neben den Knoepfen: laufende Generierungen. */
    statusSlot?: React.ReactNode;
}

export const DetailSheetHeader: React.FC<DetailSheetHeaderProps> = ({
    t, title, version, onBack, onDownload, onRegenerate, onInfo, onDelete,
    hasPrompt,
    voice, statusSlot,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const voiceItems: DropdownItem[] = voice?.enabled
        ? [{
            label: voice.active
                ? (voice.lang === 'de' ? 'Sprachassistent beenden' : 'Stop assistant')
                : (voice.lang === 'de' ? 'Sprachassistent' : 'Voice assistant'),
            icon: voice.active ? <MicOff className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />,
            onClick: () => { if (voice.active) voice.onStop?.(); else voice.onStart?.(); },
        }]
        : [];

    useEffect(() => {
        if (!isMenuOpen) return;
        const onDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [isMenuOpen]);

    return (
        <div className="flex items-start gap-1.5 pb-5">
            <RoundIconButton
                icon={<ChevronLeft className="w-5 h-5" />}
                onClick={onBack}
                variant="soft"
                tooltip={t('back')}
            />

            {/*
                Name, Fassung und die drei Punkte sind EIN Knopf.

                Vorher standen sie nebeneinander, und nur die Punkte waren
                anzutippen — ein Ziel von 40 Pixeln neben einem Namen, der
                aussah, als gehoerte er dazu, aber nichts tat. Jetzt ist der
                ganze Zug der Knopf; beim Darueberfahren faerbt er sich ein und
                zeigt das. Die Fassung steht dicht am Namen, ohne Luecke:
                "5 v6" ist eine Angabe, nicht zwei.
            */}
            <div className="flex-1 min-w-0 flex items-center pl-2.5" ref={menuRef}>
                <div className="relative min-w-0">
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(p => !p)}
                        aria-label={t('nav_menu')}
                        className={`group inline-flex items-center gap-1.5 max-w-full h-10 pl-3.5 pr-2 rounded-full
                            transition-colors duration-150
                            ${isMenuOpen ? 'bg-black/[0.07] dark:bg-white/[0.10]' : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'}`}
                    >
                        <span className="min-w-0 flex items-baseline gap-1">
                            <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                                {title}
                            </span>
                            {version && (
                                <span className="text-[15px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                                    {version}
                                </span>
                            )}
                        </span>
                        <MoreHorizontal className={`w-[18px] h-[18px] shrink-0 transition-colors
                            ${isMenuOpen
                                ? 'text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'}`} />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute top-full mt-2 left-0 z-50">
                            <DropdownMenu
                                items={buildDetailMenuItems({
                                    t,
                                    hasPrompt,
                                    onRegenerate,
                                    onDownload,
                                    onInfo,
                                    onDelete,
                                    voiceItems,
                                    close: () => setIsMenuOpen(false),
                                })}
                            />
                        </div>
                    )}
                </div>
            </div>

            {statusSlot}

            <RoundIconButton
                icon={<Download className="w-[18px] h-[18px]" />}
                onClick={onDownload}
                variant="ghost"
                tooltip={t('nav_download')}
                tooltipShortcut="D"
            />
            {hasPrompt && (
                <RoundIconButton
                    icon={<Repeat className="w-[18px] h-[18px]" />}
                    onClick={onRegenerate}
                    variant="ghost"
                    tooltip={t('generate_more')}
                    tooltipShortcut="M"
                />
            )}

        </div>
    );
};
