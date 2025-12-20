
import React, { useState } from 'react';
import { X, Shield, Clock, Lock, ArrowRight, Trash2, Plus, Loader2 } from 'lucide-react';
import { AdminUser, TranslationFunction } from '../../types';
import { Typo, IconButton, Button, Input, SectionHeader } from '../ui/DesignSystem';
import { adminService } from '../../services/adminService';

import { useToast } from '../ui/Toast';
import { useItemDialog } from '../ui/Dialog';

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
        showToast(`Added ${amount.toFixed(2)} credits`, 'success');
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: `Delete ${user.name}?`,
            description: "This action cannot be undone.",
            confirmLabel: "Delete User",
            variant: "danger"
        });

        if (confirmed) {
            onDeleteUser(user.id);
            onClose();
            showToast("User deleted", 'success');
        }
    };

    const handleResetPassword = async () => {
        setIsResetting(true);
        try {
            await adminService.resetPassword(user.email);
            showToast(`Password reset link sent to ${user.email}`, 'success');
        } catch (error) {
            showToast('Failed to send reset link', 'error');
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

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="absolute top-0 bottom-0 right-0 w-96 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-xl z-20 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className={Typo.H2}>User Details</span>
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
                                ID: {user.id}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Financials */}
                <div>
                    <SectionHeader>Financials</SectionHeader>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Spent</div>
                            <div className="text-xl font-mono text-black dark:text-white">{user.totalSpent.toFixed(2)} €</div>
                        </div>
                        <div className={`p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 relative group overflow-hidden transition-all text-left`}>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Balance</div>
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-mono text-emerald-600 dark:text-emerald-400">{user.credits.toFixed(2)} €</span>
                                {!isAddingBalance && (
                                    <button
                                        onClick={() => setIsAddingBalance(true)}
                                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {isAddingBalance && (
                                <div className="absolute inset-0 bg-white dark:bg-zinc-900 px-2 flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                    <input
                                        autoFocus
                                        type="number"
                                        placeholder="0.00"
                                        className="flex-1 bg-transparent text-sm border-b border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 outline-none p-1 font-mono"
                                        value={creditAmount}
                                        onChange={e => setCreditAmount(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddCredits()}
                                        onBlur={() => !creditAmount && setIsAddingBalance(false)}
                                    />
                                    <button
                                        onClick={handleAddCredits}
                                        disabled={!creditAmount}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded p-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setIsAddingBalance(false)}
                                        className="text-zinc-400 hover:text-zinc-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Account Settings */}
                <div>
                    <SectionHeader>Account</SectionHeader>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm">Role</span>
                            </div>
                            <select
                                value={user.role}
                                onChange={(e) => onUpdateUser(user.id, { role: e.target.value as any })}
                                className="bg-transparent text-sm font-medium outline-none text-right cursor-pointer text-zinc-900 dark:text-zinc-100"
                            >
                                <option value="user">User</option>
                                <option value="pro">Pro</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm">Last Online</span>
                            </div>
                            <span className={`text-sm text-zinc-500`}>{getRelativeTime(user.lastActiveAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div>
                    <SectionHeader className="text-red-500">Danger Zone</SectionHeader>
                    <div className="space-y-3">
                        <button
                            onClick={handleResetPassword}
                            disabled={isResetting}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-zinc-500" />}
                                <span className="text-sm">Reset Password</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-400" />
                        </button>

                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-red-600 dark:text-red-400">Delete User</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
