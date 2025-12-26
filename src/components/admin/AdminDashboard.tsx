import React, { useState } from 'react';
import { TranslationFunction } from '@/types';
import { Theme } from '@/components/ui/DesignSystem';

// Modular Views
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminUsersView } from './AdminUsersView';
import { AdminJobsView } from './AdminJobsView';
import { AdminPresetsView } from './AdminPresetsView';
import { AdminObjectsView } from './AdminObjectsView';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationFunction;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, t }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[70] ${Theme.Colors.CanvasBg} flex text-zinc-900 dark:text-zinc-100 animate-in slide-in-from-bottom-4 duration-300`}>
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} onClose={onClose} t={t} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white/50 dark:bg-zinc-950/50">
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'users' && <AdminUsersView t={t} />}
          {activeTab === 'jobs' && <AdminJobsView t={t} />}
          {activeTab === 'presets' && <AdminPresetsView t={t} />}
          {activeTab === 'objects' && <AdminObjectsView t={t} />}
        </div>
      </div>
    </div>
  );
};
