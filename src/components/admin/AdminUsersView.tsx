import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminUser, TranslationFunction } from '@/types';
import { adminService } from '@/services/adminService';
import { AdminUserDetail } from './AdminUserDetail';
import { AdminViewHeader } from './AdminViewHeader';
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

    const handleDeleteUser = async (id?: string) => {
        const targetId = id || userToDelete;
        if (!targetId) return;
        try {
            await adminService.deleteUser(targetId);
            setUsers(prev => prev.filter(u => u.id !== targetId));
            if (selectedUser?.id === targetId) setSelectedUser(null);
            showToast(t('admin_user_deleted_success'), 'success');
        } catch (error: any) {
            console.error('Delete failed:', error);
            showToast(error.message || t('failed_delete_user'), 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const filteredUsers = users.filter(u => {
        const searchLower = search.toLowerCase();
        const ident = (u.email || u.name || u.id).toLowerCase();
        return ident.includes(searchLower);
    });

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

    const getUserIdentifier = (u: AdminUser) => {
        if (u.email) return u.email;
        if (u.name && u.name !== 'New User' && u.name !== t('admin_user_default')) return u.name;
        return t('admin_user_email_missing');
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <AdminViewHeader
                title={t('admin_users')}
                search={{ value: search, onChange: setSearch, placeholder: t('search') }}
            />

            <div className="flex-1 min-h-0 overflow-auto">
                <div className="min-w-[900px]">
                    {loading ? (
                        <div className="py-20 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/60">
                                <tr>
                                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">{t('admin_user_email')}</th>
                                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">{t('admin_role_label')}</th>
                                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">{t('admin_last_online')}</th>
                                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">{t('admin_balance')}</th>
                                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">{t('admin_total_spent_header')}</th>
                                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">{t('admin_user_joined')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                {filteredUsers.map(u => (
                                    <tr
                                        key={u.id}
                                        onClick={() => setSelectedUser(u)}
                                        className={`cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                    >
                                        <td className="px-5 py-3.5 font-medium text-black dark:text-white">
                                            {getUserIdentifier(u)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                {u.role === 'admin' ? t('role_admin') : (u.role === 'pro' ? t('role_pro') : t('role_user'))}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-zinc-500 text-sm">{getRelativeTime(u.lastActiveAt)}</td>
                                        <td className="px-5 py-3.5 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">{u.credits.toFixed(2)} €</td>
                                        <td className="px-5 py-3.5 text-right font-mono text-sm text-zinc-900 dark:text-white">{u.totalSpent.toFixed(2)} €</td>
                                        <td className="px-5 py-3.5 text-right text-sm text-zinc-500">{new Date(u.joinedAt).toLocaleDateString()}</td>
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
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                onConfirm={handleDeleteUser}
                onCancel={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
                variant="danger"
            />
        </div>
    );
};
