import React from 'react';
import { Typo } from '@/components/ui/DesignSystem';

export interface DropdownItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    separator?: boolean; // renders a separator above this item
}

interface DropdownMenuProps {
    items: DropdownItem[];
    className?: string;
}

const itemBase = `flex items-center justify-between w-full pl-3 pr-3 py-2 rounded-md text-left transition-colors group cursor-pointer`;
const itemClass = `${itemBase} hover:bg-zinc-100 dark:hover:bg-zinc-800/70`;
const dangerClass = `${itemBase} hover:bg-red-50 dark:hover:bg-red-900/20`;
const iconClass = `w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0 ml-3`;
const dangerIconClass = `w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors shrink-0 ml-3`;
const textClass = `${Typo.Body} text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white font-medium`;
const dangerTextClass = `${Typo.Body} text-red-500 group-hover:text-red-600 dark:text-red-400 font-medium`;

const Separator = () => <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />;

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, className = '' }) => (
    <div className={`
        min-w-[220px]
        bg-white dark:bg-zinc-950
        border border-zinc-200 dark:border-zinc-800
        rounded-xl ring-1 ring-black/5
        p-1.5
        shadow-lg
        animate-in fade-in slide-in-from-top-2 duration-150
        ${className}
    `}>
        {items.map((item, i) => (
            <React.Fragment key={i}>
                {item.separator && <Separator />}
                <button
                    onClick={item.onClick}
                    className={item.danger ? dangerClass : itemClass}
                >
                    <span className={item.danger ? dangerTextClass : textClass}>{item.label}</span>
                    {item.icon && (
                        <span className={item.danger ? dangerIconClass : iconClass}>
                            {item.icon}
                        </span>
                    )}
                </button>
            </React.Fragment>
        ))}
    </div>
);
