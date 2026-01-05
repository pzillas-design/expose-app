
import React from 'react';
import { Users, Activity, Layers, Box, BarChart3 } from 'lucide-react';
import { TranslationFunction } from '@/types';
import { useNavigate } from 'react-router-dom';

export type AdminTab = 'users' | 'jobs' | 'stats' | 'presets' | 'stamps';

interface AdminSidebarProps {
    activeTab: AdminTab;
    t: TranslationFunction;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, t }) => {
    const navigate = useNavigate();

    const renderItem = (id: AdminTab, label: string, icon: React.ReactNode) => {
        const isActive = activeTab === id || (id === 'stamps' && activeTab as string === 'objects');
        return (
            <button
                onClick={() => navigate(`/admin/${id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/5 dark:shadow-white/5'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
            >
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/10 dark:bg-black/10' : 'bg-transparent'}`}>
                    {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
                </div>
                {label}
            </button>
        );
    };

    return (
        <div className="w-full lg:w-72 flex flex-col gap-1 p-2">
            <div className="px-4 py-4 mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Navigation</span>
            </div>
            {renderItem('users', t('admin_users'), <Users />)}
            {renderItem('jobs', t('admin_jobs'), <Activity />)}
            {renderItem('stats', 'Token & Kosten', <BarChart3 />)}
            {renderItem('presets', t('admin_presets'), <Layers />)}
            {renderItem('stamps', t('admin_objects'), <Box />)}
        </div>
    );
};
