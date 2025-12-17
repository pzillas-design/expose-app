
import React from 'react';
import { Users, Activity, Layers, Box, ArrowLeft } from 'lucide-react';
import { TranslationFunction } from '../../types';
import { Typo } from '../ui/DesignSystem';

export type AdminTab = 'users' | 'jobs' | 'presets' | 'objects';

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
                className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-black dark:hover:text-white transition-colors mb-6 pl-1"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('back_to_app')}
            </button>
            <span className={`${Typo.H1} block pl-1`}>Admin</span>
        </div>
        <div className="p-3 space-y-1">
            {renderItem('users', t('admin_users'), <Users className="w-4 h-4" />)}
            {renderItem('jobs', t('admin_jobs'), <Activity className="w-4 h-4" />)}
            {renderItem('presets', t('admin_presets'), <Layers className="w-4 h-4" />)}
            {renderItem('objects', t('admin_objects'), <Box className="w-4 h-4" />)}
        </div>
    </div>
  );
};
