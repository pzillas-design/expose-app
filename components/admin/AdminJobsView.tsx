
import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { TranslationFunction } from '../../types';
import { Typo, Input } from '../ui/DesignSystem';
import { MOCK_JOBS } from '../../data/adminMockData';

interface AdminJobsViewProps {
  t: TranslationFunction;
}

export const AdminJobsView: React.FC<AdminJobsViewProps> = ({ t }) => {
  const [search, setSearch] = useState('');

  const filteredJobs = MOCK_JOBS.filter(j => 
      j.userName.toLowerCase().includes(search.toLowerCase()) || 
      j.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="flex items-center justify-between mb-6 shrink-0">
            <h2 className={Typo.H1}>{t('admin_jobs')}</h2>
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                    className="pl-9 py-2 bg-white dark:bg-zinc-900" 
                    placeholder={t('search')} 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                />
            </div>
        </div>

        <div className="flex-1 min-h-0 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
            <div className="overflow-y-auto h-full">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 font-medium">Job ID</th>
                            <th className="px-4 py-3 font-medium">User</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Prompt</th>
                            <th className="px-4 py-3 font-medium text-right">Cost</th>
                            <th className="px-4 py-3 font-medium text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredJobs.map(j => (
                            <tr key={j.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{j.id}</td>
                                <td className="px-4 py-3 font-medium text-black dark:text-white">{j.userName}</td>
                                <td className="px-4 py-3 uppercase text-xs font-bold text-zinc-500">{j.type}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider 
                                        ${j.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 
                                        j.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 
                                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                        {j.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate" title={j.promptPreview}>{j.promptPreview}</td>
                                <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{j.cost.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-zinc-500 text-xs">{new Date(j.createdAt).toLocaleTimeString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
