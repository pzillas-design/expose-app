import React from 'react';
import { Upload } from 'lucide-react';
import { Theme } from './DesignSystem';

/**
 * Die Flaeche, auf der Dateien landen.
 *
 * Eine Definition fuer alle Stellen: in der Galerie eine in der Mitte, in der
 * Detailansicht zwei (Bild und Blatt). Vorher waren es zwei verschiedene
 * Entwuerfe mit eigenen Massen, eigener Rundung und eigener Umrandung — und in
 * der Galerie liefen sogar beide gleichzeitig: die lange Zeile wuchs auf, und
 * mitten darueber stand noch ein Kasten.
 *
 * Jetzt gilt: Die Zeile im Seitenkopf bleibt, wie sie ist, und faerbt sich nur
 * ein. Die Groesse und die Bewegung tragen diese Flaechen hier.
 *
 * Keine Linien. Was gemeint ist, sagt die Flaeche selbst: Die angepeilte wird
 * heller, waechst eine Spur und ihr Pfeil hebt sich — die andere bleibt
 * zurueck.
 */
interface DropPanelProps {
    /** Der Zeiger steht ueber genau dieser Flaeche. */
    hot?: boolean;
    label: string;
    icon?: React.ReactNode;
    className?: string;
}

export const DropPanel: React.FC<DropPanelProps> = ({ hot = false, label, icon, className = '' }) => (
    <div
        className={`flex flex-col items-center justify-center gap-5 px-16 py-14 ${Theme.Geometry.RadiusXl}
            ${Theme.Colors.PanelBg}
            animate-[drop-panel-in_260ms_cubic-bezier(0.16,1,0.3,1)_backwards]
            transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${hot
                ? 'scale-[1.04] shadow-xl shadow-black/25'
                : 'scale-100 shadow-lg shadow-black/10'}
            ${className}`}
    >
        {/* Der Pfeil atmet: eine ruhige Bewegung nach oben und zurueck, so
            lange die Datei in der Luft ist. Sie sagt "hier hinein", ohne dass
            ein Wort dafuer noetig waere — und sie hoert auf, sobald losgelassen
            ist. */}
        <span className={`animate-[drop-arrow_1600ms_ease-in-out_infinite] ${hot ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'} transition-colors duration-200`}>
            {icon ?? <Upload className="w-8 h-8" strokeWidth={1.5} />}
        </span>
        <p className={`text-[15px] font-medium text-center ${hot ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'} transition-colors duration-200`}>
            {label}
        </p>
    </div>
);
