import React from 'react';
import { ChevronDown, ChevronRight, MoreVertical, Plus } from 'lucide-react';
import { Theme, Typo, IconButton } from './DesignSystem';

interface SidebarAccordionProps {
    title: string;
    isExpanded: boolean;
    onToggle: () => void;
    onAdd?: () => void;
    children: React.ReactNode;
    isEmpty?: boolean;
    emptyText?: string;
    hasTopBorder?: boolean;
}

export const SidebarAccordion: React.FC<SidebarAccordionProps> = ({
    title,
    isExpanded,
    onToggle,
    onAdd,
    children,
    isEmpty,
    emptyText,
    hasTopBorder = true
}) => {
    return (
        <div className="flex flex-col">
            <div className={`flex items-center justify-between px-6 h-14 ${hasTopBorder ? `border-t ${Theme.Colors.Border}` : ''} hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors group`}>
                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 flex-1 h-full text-left"
                >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                    <span className={`${Typo.LabelSmall} uppercase tracking-widest text-zinc-400 dark:text-zinc-500`}>
                        {title}
                    </span>
                </button>

                {onAdd && (
                    <div className="flex items-center gap-1">
                        <IconButton
                            icon={<Plus className="w-3.5 h-3.5" />}
                            onClick={(e) => { e.stopPropagation(); onAdd(); }}
                        />
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="pt-0.5 pb-4 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {isEmpty ? (
                        <div className="px-6 py-10 text-center animate-in fade-in duration-500">
                            <p className={`${Typo.Body} font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed w-full`}>
                                {emptyText}
                            </p>
                        </div>
                    ) : children}
                </div>
            )}
        </div>
    );
};

interface SidebarAccordionItemProps {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    onMenuClick?: (e: React.MouseEvent) => void;
    actions?: React.ReactNode;
    rightLabel?: string;
}

export const SidebarAccordionItem: React.FC<SidebarAccordionItemProps> = ({
    label,
    icon,
    onClick,
    onMenuClick,
    actions,
    rightLabel
}) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-6 py-2 ${Theme.Geometry.Radius} ${Theme.Colors.SurfaceHover} transition-colors group text-left`}
        >
            <div className="flex-1 min-w-0 flex items-center gap-2">
                {/* Fixed width spacer to align with Chevron in Header (Chevron 3.5) */}
                <div className="w-3.5 shrink-0 flex items-center justify-center">
                    {icon}
                </div>
                <div className={`${Typo.Body} ${Theme.Colors.TextSecondary} group-hover:text-black dark:group-hover:text-white truncate font-normal`}>
                    {label}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {rightLabel && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium whitespace-nowrap">
                        {rightLabel}
                    </span>
                )}
                {onMenuClick && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMenuClick(e); }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity p-2 -mr-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                )}
                {actions}
            </div>
        </button>
    );
};
