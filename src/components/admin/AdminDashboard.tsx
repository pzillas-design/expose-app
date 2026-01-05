
import React, { useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { TranslationFunction } from '@/types';
import { Theme } from '@/components/ui/DesignSystem';

// Modular Views - Each one is in its own file
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
  const { tab } = useParams<{ tab: string }>();

  // Map URL tabs to internal state, fallback to users
  const activeTab = useMemo(() => {
    if (!tab) return 'users';
    if (tab === 'stamps') return 'objects'; // Internal ID is still 'objects' in some places
    return tab as AdminTab;
  }, [tab]);

  return (
    <div className={`min-h-screen flex flex-col ${Theme.Colors.CanvasBg} text-zinc-900 dark:text-zinc-100`}>
      <AppNavbar
        user={user}
        userProfile={userProfile}
        credits={credits}
        onCreateBoard={onCreateBoard}
        t={t}
      />

      <main className="flex-1 min-h-0">
        {/* Centered Premium Container */}
        <div className="max-w-[1700px] mx-auto w-full px-8 lg:px-12 2xl:px-16 py-8 lg:py-12">

          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* Sidebar - Stuck to top when scrolling content */}
            <div className="w-full lg:w-72 lg:sticky lg:top-8">
              <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-2">
                <AdminSidebar activeTab={activeTab as AdminTab} t={t} />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full min-w-0">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm h-[calc(100vh-180px)] flex flex-col">
                {activeTab === 'users' && <AdminUsersView t={t} />}
                {activeTab === 'jobs' && <AdminJobsView t={t} />}
                {activeTab === 'stats' && <AdminStatsView t={t} />}
                {activeTab === 'presets' && <AdminPresetsView t={t} />}
                {(activeTab === 'objects' || activeTab === 'stamps') && <AdminObjectsView t={t} />}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
