import React, { useState } from 'react';
import { X, Shield, Clock, Lock, ArrowRight, Trash2, Plus, Loader2 } from 'lucide-react';
import { AdminUser, TranslationFunction } from '@/types';
import { Typo, IconButton, Button, Input, SectionHeader } from '@/components/ui/DesignSystem';
import { adminService } from '@/services/adminService';

import { useToast } from '@/components/ui/Toast';
import { useItemDialog } from '@/components/ui/Dialog';

interface AdminUserDetailProps {
    user: AdminUser;
    onClose: () => void;
    onUpdateUser: (id: string, updates: Partial<AdminUser>) => void;
    onDeleteUser: (id: string) => void;
    t: TranslationFunction;
}

export const AdminUserDetail: React.FC<AdminUserDetailProps> = ({
    user, onClose, onUpdateUser, onDeleteUser, t
}) => {
    const [creditAmount, setCreditAmount] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [isAddingBalance, setIsAddingBalance] = useState(false);

    const { showToast } = useToast();
    const { confirm } = useItemDialog();

    const handleAddCredits = () => {
        const amount = parseFloat(creditAmount);
        if (isNaN(amount)) return;
        onUpdateUser(user.id, { credits: user.credits + amount });
        setCreditAmount('');
        setIsAddingBalance(false);
        showToast(t('admin_add_credits_success').replace('{{amount}}', amount.toFixed(2)), 'success');
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: t('admin_delete_user_confirm').replace('{{name}}', user.name),
            description: t('admin_delete_user_desc'),
            confirmLabel: t('admin_delete_user'),
            variant: "danger"
        });

        if (confirmed) {
            onDeleteUser(user.id);
            onClose();
            showToast(t('admin_user_deleted_success'), 'success');
        }
    };

    const handleResetPassword = async () => {
        setIsResetting(true);
        try {
            await adminService.resetPassword(user.email);
            showToast(t('admin_pass_reset_success').replace('{{email}}', user.email), 'success');
        } catch (error) {
            showToast(t('admin_pass_reset_error'), 'error');
        } finally {
            setIsResetting(false);
        }
    };

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
        <div className="absolute top-0 bottom-0 right-0 w-96 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-xl z-20 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className={Typo.H2}>{t('admin_user_details')}</span>
                <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-500">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-black dark:text-white">{user.name}</h3>
                        <p className="text-zinc-500 text-sm">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400`}>
                                {t('id_label')}: {user.id}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Financials */}
                <div>
                    <SectionHeader>{t('admin_financials')}</SectionHeader>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('admin_total_spent')}</div>
                            <div className="text-xl font-mono text-black dark:text-white">{user.totalSpent.toFixed(2)} €</div>
                        </div>
                        <div className={`p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800`}>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('admin_balance')}</div>
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-mono text-emerald-600 dark:text-emerald-400">{user.credits.toFixed(2)} €</span>
                                <button
                                    onClick={() => setIsAddingBalance(true)}
                                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Add Balance Modal */}
                    {isAddingBalance && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
                            <div className="w-full max-w-[280px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 animate-in zoom-in-95 duration-200">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 text-center">{t('admin_add_funds')}</h4>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            autoFocus
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-center text-xl font-mono focus:ring-2 ring-emerald-500 outline-none transition-all"
                                            value={creditAmount}
                                            onChange={e => setCreditAmount(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddCredits()}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">€</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            className="flex-1 py-2 text-xs"
                                            onClick={() => { setIsAddingBalance(false); setCreditAmount(''); }}
                                        >
                                            {t('cancel')}
                                        </Button>
                                        <Button
                                            className="flex-1 py-2 text-xs"
                                            onClick={handleAddCredits}
                                            disabled={!creditAmount || isNaN(parseFloat(creditAmount))}
                                        >
                                            {t('admin_add_funds')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Account Settings */}
                <div>
                    <SectionHeader>{t('admin_account_section')}</SectionHeader>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm">{t('admin_role_label')}</span>
                            </div>
                            <select
                                value={user.role}
                                onChange={(e) => onUpdateUser(user.id, { role: e.target.value as any })}
                                className="bg-transparent text-sm font-medium outline-none text-right cursor-pointer text-zinc-900 dark:text-zinc-100"
                            >
                                <option value="user">{t('role_user')}</option>
                                <option value="pro">{t('role_pro')}</option>
                                <option value="admin">{t('role_admin')}</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm">{t('admin_last_online')}</span>
                            </div>
                            <span className={`text-sm text-zinc-500`}>{getRelativeTime(user.lastActiveAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div>
                    <SectionHeader className="text-red-500">{t('admin_danger_zone')}</SectionHeader>
                    <div className="space-y-3">
                        <button
                            onClick={handleResetPassword}
                            disabled={isResetting}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-zinc-500" />}
                                <span className="text-sm">{t('admin_reset_password')}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-400" />
                        </button>

                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-red-600 dark:text-red-400">{t('admin_delete_user')}</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
