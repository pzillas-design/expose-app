import React from 'react';
import { MenuSurface, Typo } from '@/components/ui/DesignSystem';

export interface DropdownItem {
    label: string;
    /**
     * Zeichen VOR der Beschriftung.
     *
     * Rechts steht, was ueber den Zustand des Eintrags spricht (Haken,
     * Lesezeichen); links steht, was zu der Sache selbst gehoert — bei einer
     * Vorlage ihr Emoji. Vorher landete auch das Emoji rechts im Zustandsfeld,
     * weit weg von seinem Namen und in einer Spalte mit den Haken.
     */
    leading?: React.ReactNode;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    /**
     * Setzt einen Abstand ueber diesen Eintrag und trennt damit Gruppen.
     *
     * Bewusst ein Abstand und keine Linie: Eine Linie behauptet eine Grenze,
     * ein Abstand zeigt eine Zusammengehoerigkeit. In einem Menue mit vier bis
     * sechs Eintraegen reicht das — und es passt zu den uebrigen Flaechen, aus
     * denen wir heute die Linien entfernt haben.
     */
    separator?: boolean;
    render?: React.ReactNode; // custom content, bypasses default button layout
}

interface DropdownMenuProps {
    items: DropdownItem[];
    className?: string;
}

const itemBase = `flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-left transition-colors group cursor-pointer`;
const itemClass = `${itemBase} hover:bg-black/[0.04] dark:hover:bg-white/[0.06]`;
const dangerClass = `${itemBase} hover:bg-red-50 dark:hover:bg-red-900/20`;
const iconClass = `w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0 ml-3`;
const dangerIconClass = `w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors shrink-0 ml-3`;
const textClass = `${Typo.Body} text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white font-medium`;
const dangerTextClass = `${Typo.Body} text-red-500 group-hover:text-red-600 dark:text-red-400 font-medium`;



export const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, className = '' }) => (
    <div className={`
        min-w-[220px]
        ${MenuSurface}
        animate-[panel-grow_200ms_cubic-bezier(0.16,1,0.3,1)_backwards]
        ${className}
    `}>
        {items.map((item, i) => (
            <React.Fragment key={i}>
                {item.separator && <div className="h-2" aria-hidden />}
                {item.render ? item.render : (
                    <button
                        onClick={item.onClick}
                        className={item.danger ? dangerClass : itemClass}
                    >
                        <span className="flex items-center gap-2.5 min-w-0">
                            {item.leading && (
                                <span className="w-5 shrink-0 text-center text-sm leading-none">{item.leading}</span>
                            )}
                            <span className={`${item.danger ? dangerTextClass : textClass} truncate`}>{item.label}</span>
                        </span>
                        {item.icon && (
                            <span className={item.danger ? dangerIconClass : iconClass}>
                                {item.icon}
                            </span>
                        )}
                    </button>
                )}
            </React.Fragment>
        ))}
    </div>
);
