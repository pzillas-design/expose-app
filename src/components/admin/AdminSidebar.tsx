import React from 'react';
import { Users, Activity, Layers, Box, ChevronLeft, BarChart3 } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { Typo } from '@/components/ui/DesignSystem';

export type AdminTab = 'users' | 'jobs' | 'stats' | 'presets' | 'objects';

interface AdminSidebarProps {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
    onClose: () => void;
    t: TranslationFunction;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange, onClose, t }) => {
    const renderItem = (id: AdminTab, label: string, icon: React.ReactNode) => (
        <button
            onClick={() => onTabChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === id ? 'bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col shrink-0">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={onClose}
                    className="group flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                >
                    <ChevronLeft className="w-5 h-5 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    <span className={`${Typo.H1}`}>Admin</span>
                </button>
            </div>
            <div className="p-3 space-y-1">
                {renderItem('users', t('admin_users'), <Users className="w-4 h-4" />)}
                {renderItem('jobs', t('admin_jobs'), <Activity className="w-4 h-4" />)}
                {renderItem('stats', 'Token & Kosten', <BarChart3 className="w-4 h-4" />)}
                {renderItem('presets', t('admin_presets'), <Layers className="w-4 h-4" />)}
                {renderItem('objects', t('admin_objects'), <Box className="w-4 h-4" />)}
            </div>
        </div>
    );
};
