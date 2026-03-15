import React, { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TranslationFunction } from '@/types';
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

 useEffect(() => {
  if (userProfile && userProfile.role !== 'admin') navigate('/');
 }, [userProfile, navigate]);

 if (!userProfile || userProfile.role !== 'admin') return null;

 const activeTab = useMemo(() => {
  const tabName = tab || 'users';
  return (tabName === 'stamps' ? 'objects' : tabName) as AdminTab;
 }, [tab]);

 const navItems = [
  { id: 'users',   label: t('admin_users'),   icon: <Users   className="w-3.5 h-3.5" /> },
  { id: 'jobs',    label: t('admin_jobs'),    icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'stats',   label: 'Kosten',           icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: 'presets', label: t('admin_presets'), icon: <Layers   className="w-3.5 h-3.5" /> },
  { id: 'stamps',  label: t('admin_objects'), icon: <Box      className="w-3.5 h-3.5" /> },
 ];

 const isTabActive = (id: string) =>
  activeTab === id || (id === 'stamps' && (activeTab as string) === 'objects');

 return (
  <div className="h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">

   {/* ── Header ───────────────────────────────────────────── */}
   <header className="sticky top-0 z-50 shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">

    {/* Row 1: Branding + Home */}
    <div className="flex items-center justify-between px-4 md:px-6 h-11">
     <div className="flex items-center gap-2">
      <Logo className="w-6 h-6" />
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Admin</span>
     </div>
     <button
      onClick={() => navigate('/')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
     >
      <Home className="w-3.5 h-3.5" />
      <span>App</span>
     </button>
    </div>

    {/* Row 2: Scrollable nav strip */}
    <div className="overflow-x-auto no-scrollbar border-t border-zinc-100 dark:border-zinc-800/50">
     <div className="flex items-center px-3 md:px-5 gap-0.5 w-max md:w-auto">
      {navItems.map(item => {
       const active = isTabActive(item.id);
       return (
        <button
         key={item.id}
         onClick={() => navigate(`/admin/${item.id}`)}
         className={`
          relative flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium whitespace-nowrap
          transition-colors duration-150
          ${active
           ? 'text-zinc-900 dark:text-white'
           : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}
         `}
        >
         {item.icon}
         {item.label}
         {active && (
          <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-zinc-900 dark:bg-white rounded-full" />
         )}
        </button>
       );
      })}
     </div>
    </div>
   </header>

   {/* ── Content ──────────────────────────────────────────── */}
   <main className="flex-1 min-h-0 overflow-hidden">
    <div className="max-w-[1700px] mx-auto w-full h-full flex flex-col">
     {activeTab === 'users'   && <AdminUsersView   t={t} />}
     {activeTab === 'jobs'    && <AdminJobsView    t={t} />}
     {activeTab === 'stats'   && <AdminStatsView   t={t} />}
     {activeTab === 'presets' && <AdminPresetsView t={t} />}
     {(activeTab === 'objects' || activeTab === 'stamps') && <AdminObjectsView t={t} />}
    </div>
   </main>
  </div>
 );
};
