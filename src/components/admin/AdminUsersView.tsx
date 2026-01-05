import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { AdminUser, TranslationFunction } from '@/types';
import { Typo, Input } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';
import { AdminUserDetail } from './AdminUserDetail';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

interface AdminUsersViewProps {
    t: TranslationFunction;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ t }) => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [search, setSearch] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (id: string, updates: Partial<AdminUser>) => {
        try {
            await adminService.updateUser(id, updates);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
            if (selectedUser?.id === id) {
                setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
            }
            showToast(t('admin_user_updated_success'), 'success');
        } catch (error: any) {
            console.error('Update failed:', error);
            showToast(error.message || t('failed_update_user'), 'error');
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await adminService.deleteUser(userToDelete);
            setUsers(prev => prev.filter(u => u.id !== userToDelete));
            if (selectedUser?.id === userToDelete) setSelectedUser(null);
        } catch (error) {
            showToast(t('failed_delete_user'), 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const getRelativeTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return t('admin_just_now');
        if (minutes < 60) return t('admin_mins_ago').replace('{{n}}', minutes.toString());
        if (hours < 24) return t('admin_hours_ago').replace('{{n}}', hours.toString());
        return t('admin_days_ago').replace('{{n}}', days.toString());
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="p-8 pb-6 flex items-center justify-between shrink-0">
                <h2 className={Typo.H1}>{t('admin_users')}</h2>
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                            className="pl-9 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-none"
                            placeholder={t('search')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-auto">
                <div className="min-w-[900px]">
                    {loading ? (
                        <div className="py-20 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 sticky top-0 z-10">
                                <tr>
                                    <th className="px-5 py-4 font-medium">{t('admin_user_name')}</th>
                                    <th className="px-5 py-4 font-medium">{t('admin_user_email')}</th>
                                    <th className="px-5 py-4 font-medium">{t('admin_role_label')}</th>
                                    <th className="px-5 py-4 font-medium">{t('admin_last_online')}</th>
                                    <th className="px-5 py-4 font-medium text-right">{t('admin_balance')}</th>
                                    <th className="px-5 py-4 font-medium text-right">{t('admin_user_joined')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                {filteredUsers.map(u => (
                                    <tr
                                        key={u.id}
                                        onClick={() => setSelectedUser(u)}
                                        className={`cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                    >
                                        <td className="px-5 py-5 font-medium text-black dark:text-white">{u.name}</td>
                                        <td className="px-5 py-5 text-zinc-500">{u.email}</td>
                                        <td className="px-5 py-5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-5 text-zinc-500">{getRelativeTime(u.lastActiveAt)}</td>
                                        <td className="px-5 py-5 text-right font-mono text-emerald-600 dark:text-emerald-400">{u.credits.toFixed(2)} €</td>
                                        <td className="px-5 py-5 text-right text-zinc-500">{new Date(u.joinedAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
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

            <ConfirmDialog
                isOpen={isDeleteModalOpen}
                title={t('admin_delete_user') || "Benutzer löschen"}
                description={t('admin_delete_user_desc') || "Möchtest du diesen Benutzer wirklich unwiderruflich löschen?"}
                confirmLabel={t('delete') || "Löschen"}
                cancelLabel={t('cancel') || "Abbrechen"}
                onConfirm={handleDeleteUser}
                onCancel={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
                variant="danger"
            />
        </div>
    );
};
