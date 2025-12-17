
import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { AdminUser, TranslationFunction } from '../../types';
import { Typo, Input } from '../ui/DesignSystem';
import { MOCK_USERS } from '../../data/adminMockData';
import { AdminUserDetail } from './AdminUserDetail';

interface AdminUsersViewProps {
  t: TranslationFunction;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ t }) => {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');

  const handleUpdateUser = (id: string, updates: Partial<AdminUser>) => {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      // Also update selected user if it matches, to reflect changes immediately
      if (selectedUser?.id === id) {
          setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
      }
  };

  const handleDeleteUser = (id: string) => {
      setUsers(prev => prev.filter(u => u.id !== id));
      setSelectedUser(null);
  };

  const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
      <div className="p-6 h-full flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className={Typo.H1}>{t('admin_users')}</h2>
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
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Total Spent</th>
                            <th className="px-4 py-3 font-medium text-right">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredUsers.map(u => (
                            <tr 
                                key={u.id} 
                                onClick={() => setSelectedUser(u)}
                                className={`cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                            >
                                <td className="px-4 py-3 font-medium text-black dark:text-white">{u.name}</td>
                                <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex w-2 h-2 rounded-full mr-2 ${u.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span className="capitalize text-zinc-600 dark:text-zinc-400">{u.status}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{u.totalSpent.toFixed(2)} €</td>
                                <td className="px-4 py-3 text-right text-zinc-500">{new Date(u.joinedAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>

          {selectedUser && (
              <AdminUserDetail 
                  user={selectedUser} 
                  onClose={() => setSelectedUser(null)} 
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  t={t}
              />
          )}
      </div>
  );
};
