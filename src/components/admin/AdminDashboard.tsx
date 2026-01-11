import React, { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TranslationFunction } from '@/types';
import { Theme, Typo } from '@/components/ui/DesignSystem';
import { Users, Activity, Layers, Box, BarChart3, Home } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

// Modular Views
import { AdminUsersView } from './AdminUsersView';
import { AdminJobsView } from './AdminJobsView';
import { AdminStatsView } from './AdminStatsView';
import { AdminPresetsView } from './AdminPresetsView';
import { AdminObjectsView } from './AdminObjectsView';

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

  // Route Protection: Redirect non-admins
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/projects');
    }
  }, [userProfile, navigate]);

  // Don't render anything for non-admins
  if (!userProfile || userProfile.role !== 'admin') {
    return null;
  }

  const activeTab = useMemo(() => {
    const t = tab || 'users';
    return (t === 'stamps' ? 'objects' : t) as AdminTab;
  }, [tab]);

  const navItems = [
    { id: 'users', label: t('admin_users'), icon: <Users /> },
    { id: 'jobs', label: t('admin_jobs'), icon: <Activity /> },
    { id: 'stats', label: 'Kosten', icon: <BarChart3 /> },
    { id: 'presets', label: t('admin_presets'), icon: <Layers /> },
    { id: 'stamps', label: t('admin_objects'), icon: <Box /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Admin Navbar - Single Row Design matching Home */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70">
        <div className="max-w-[1700px] mx-auto w-full px-8 lg:px-12 2xl:px-16 h-20 flex items-center justify-between">

          {/* Left: Branding */}
          <div className="flex items-center gap-4">
            <Logo className="w-10 h-10" />
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              Admin
            </span>
          </div>

          {/* Center: Navigation Tabs (Pill Design) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-zinc-100/50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-white/5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id || (item.id === 'stamps' && activeTab as string === 'objects');
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/admin/${item.id}`)}
                  className={`
                    flex items-center gap-2.5 px-5 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 whitespace-nowrap
                    ${isActive
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50'}
                  `}
                >
                  {React.cloneElement(item.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Home Button */}
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-white/5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>App</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        <div className="max-w-[1700px] mx-auto w-full px-8 lg:px-12 2xl:px-16 py-10 h-[calc(100vh-80px)]">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 h-full flex flex-col rounded-3xl overflow-hidden shadow-sm">
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
