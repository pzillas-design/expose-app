import React, { useState } from 'react';
import { TranslationFunction } from '@/types';
import { Theme } from '@/components/ui/DesignSystem';

// Modular Views
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminUsersView } from './AdminUsersView';
import { AdminJobsView } from './AdminJobsView';
import { AdminStatsView } from './AdminStatsView';
import { AdminPresetsView } from './AdminPresetsView';
import { AdminObjectsView } from './AdminObjectsView';

import { AppNavbar } from '../layout/AppNavbar';

interface AdminDashboardProps {
  user: any;
  userProfile: any;
  credits: number;
  onCreateBoard: () => void;
  t: TranslationFunction;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  return (
    <div className={`min-h-screen flex flex-col ${Theme.Colors.CanvasBg} text-zinc-900 dark:text-zinc-100`}>
      <AppNavbar
        user={user}
        userProfile={userProfile}
        credits={credits}
        onCreateBoard={onCreateBoard}
        t={t}
      />

      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} onClose={() => { }} t={t} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white/50 dark:bg-zinc-950/50">
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'users' && <AdminUsersView t={t} />}
            {activeTab === 'jobs' && <AdminJobsView t={t} />}
            {activeTab === 'stats' && <AdminStatsView t={t} />}
            {activeTab === 'presets' && <AdminPresetsView t={t} />}
            {activeTab === 'objects' && <AdminObjectsView t={t} />}
          </div>
        </div>
      </div>
    </div>
  );
};
