import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TranslationFunction } from '@/types';
import { Theme, Typo } from '@/components/ui/DesignSystem';
import { Users, Activity, Layers, Box, BarChart3 } from 'lucide-react';

// Modular Views
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

export type AdminTab = 'users' | 'jobs' | 'stats' | 'presets' | 'stamps';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    if (!tab) return 'users';
    if (tab === 'stamps') return 'objects';
    return tab as AdminTab;
  }, [tab]);

  const navItems = [
    { id: 'users', label: t('admin_users'), icon: <Users /> },
    { id: 'jobs', label: t('admin_jobs'), icon: <Activity /> },
    { id: 'stats', label: 'Token & Kosten', icon: <BarChart3 /> },
    { id: 'presets', label: t('admin_presets'), icon: <Layers /> },
    { id: 'stamps', label: t('admin_objects'), icon: <Box /> },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${Theme.Colors.CanvasBg} text-zinc-900 dark:text-zinc-100`}>
      <AppNavbar
        user={user}
        userProfile={userProfile}
        credits={credits}
        onCreateBoard={onCreateBoard}
        t={t}
      />

      {/* Sub Header Nav */}
      <div className="z-40 mt-8 mb-4">
        <div className="max-w-[1700px] mx-auto px-6 h-10 flex items-center justify-center gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'stamps' && activeTab as string === 'objects');
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/admin/${item.id}`)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${isActive
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white capitalize'}`}
              >
                {React.cloneElement(item.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 min-h-0">
        <div className="w-full h-[calc(100vh-180px)]">
          <div className="bg-white dark:bg-zinc-900 h-full flex flex-col">
            {activeTab === 'users' && <AdminUsersView t={t} />}
            {activeTab === 'jobs' && <AdminJobsView t={t} />}
            {activeTab === 'stats' && <AdminStatsView t={t} />}
            {activeTab === 'presets' && <AdminPresetsView t={t} />}
            {(activeTab === 'objects' || activeTab === 'stamps') && <AdminObjectsView t={t} />}
          </div>
        </div>
      </main>
    </div>
  );
};
