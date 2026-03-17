import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/DesignSystem';

interface AdminViewHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    search?: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
    };
}

/**
 * Shared header component for all admin views.
 * Renders title, optional subtitle, optional search bar and action buttons.
 */
export const AdminViewHeader: React.FC<AdminViewHeaderProps> = ({
    title,
    description,
    actions,
    search,
}) => (
    <div className="px-6 md:px-8 pt-4 md:pt-5 pb-3 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h2>
            {description && (
                <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{description}</p>
            )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            {search && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                    <Input
                        className="pl-9 h-8 w-44 md:w-52 text-xs bg-zinc-50 dark:bg-zinc-800/60 border-transparent focus:border-zinc-200 dark:focus:border-zinc-700 rounded-lg"
                        placeholder={search.placeholder ?? 'Suchen…'}
                        value={search.value}
                        onChange={(e) => search.onChange(e.target.value)}
                    />
                </div>
            )}
            {actions}
        </div>
    </div>
);
