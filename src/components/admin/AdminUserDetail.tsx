import React, { useState, useEffect } from 'react';
import { X, Shield, Clock, Lock, ArrowRight, Trash, Pencil, Loader2, CreditCard, RotateCcw, ExternalLink } from 'lucide-react';
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
 const [payments, setPayments] = useState<any[]>([]);
 const [loadingPayments, setLoadingPayments] = useState(false);
 const [refundingId, setRefundingId] = useState<string | null>(null);

 const { showToast } = useToast();
 const { confirm, prompt } = useItemDialog();

 useEffect(() => {
     if (!user.stripeCustomerId) return;
     setLoadingPayments(true);
     adminService.getStripePayments(user.stripeCustomerId)
         .then(setPayments)
         .catch(() => setPayments([]))
         .finally(() => setLoadingPayments(false));
 }, [user.stripeCustomerId]);

 const handleAdjustCredits = async () => {
     // Accept a signed number: positive = add, negative = deduct.
     // Result is clamped to >= 0 server-side equivalent (we floor at 0 here too).
     const result = await prompt({
         title: `${t('admin_add_funds')} (±)`,
         description: `${t('admin_balance')}: ${user.credits.toFixed(2)} €. + addiert, − zieht ab.`,
         placeholder: '+1.00 / -1.00',
         confirmLabel: 'Anwenden',
         suffix: '€',
     });

     if (!result) return;
     const delta = parseFloat(result.replace(',', '.'));
     if (isNaN(delta) || delta === 0) return;

     const next = Math.max(0, Math.round((user.credits + delta) * 100) / 100);
     onUpdateUser(user.id, { credits: next });

     if (delta > 0) {
         showToast(t('admin_add_credits_success').replace('{{amount}}', delta.toFixed(2)), 'success');
     } else {
         const removed = Math.abs(delta);
         showToast(`${removed.toFixed(2)} € abgezogen — neuer Saldo ${next.toFixed(2)} €`, 'success');
     }
 };

 const handleDelete = async () => {
 const confirmed = await confirm({
 title: t('admin_delete_user_confirm').replace('{{name}}', user.email || t('admin_user_details')),
 description: t('admin_delete_user_desc'),
 confirmLabel: t('admin_delete_user'),
 variant: "danger"
 });

 if (confirmed) {
 onDeleteUser(user.id);
 }
 };

 const handleRefund = async (paymentIntentId: string, amountEur: number) => {
     const confirmed = await confirm({
         title: `Refund ${amountEur.toFixed(2)} €?`,
         description: `Payment Intent: ${paymentIntentId}`,
         confirmLabel: 'Refund',
         variant: 'danger',
     });
     if (!confirmed) return;
     setRefundingId(paymentIntentId);
     try {
         await adminService.createStripeRefund(paymentIntentId);
         showToast(`Refund von ${amountEur.toFixed(2)} € ausgelöst`, 'success');
         setPayments(prev => prev.filter(p => p.id !== paymentIntentId));
     } catch (e: any) {
         showToast(e.message || 'Refund fehlgeschlagen', 'error');
     } finally {
         setRefundingId(null);
     }
 };

 const handleResetPassword = async () => {
 if (!user.email) {
 showToast(t('admin_user_email_missing'), 'error');
 return;
 }

 setIsResetting(true);
 try {
 await adminService.resetPassword(user.email);
 showToast(t('admin_pass_reset_success').replace('{{email}}', user.email), 'success');
 } catch (error: any) {
 console.error('Reset password error:', error);
 showToast(error.message || t('admin_pass_reset_error'), 'error');
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

 const getUserIdentifier = () => {
 if (user.email) return user.email;
 if (user.name && user.name !== 'New User' && user.name !== t('admin_user_default')) return user.name;
 return t('admin_user_email_missing');
 };

 const userIdentifier = getUserIdentifier();

 return (
 <div className="absolute top-0 bottom-0 right-0 w-96 bg-white dark:bg-black border-l border-zinc-200 dark:border-zinc-800 z-20 flex flex-col animate-in slide-in-from-right duration-300">
 <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
 <span className={Typo.H2}>{t('admin_user_details')}</span>
 <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-8">
 {/* Profile Header */}
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-500">
 {userIdentifier.charAt(0).toUpperCase()}
 </div>
 <div>
 <h3 className="text-lg font-medium text-black dark:text-white break-all">{userIdentifier}</h3>
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
              <div className="text-xs font-medium text-zinc-500 mb-1">{t('admin_total_spent')}</div>
              <div className={`text-xl font-mono ${user.totalSpent === 0 ? 'text-zinc-400 dark:text-zinc-600' : 'text-black dark:text-white'}`}>{user.totalSpent.toFixed(2)} €</div>
 </div>
 <div className={`p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800`}>
              <div className="text-xs font-medium text-zinc-500 mb-1">{t('admin_balance')}</div>
              <div className="flex items-center justify-between">
                <span className={`text-xl font-mono ${user.credits === 0 ? 'text-zinc-400 dark:text-zinc-600' : 'text-black dark:text-white'}`}>{user.credits.toFixed(2)} €</span>
 <button
     onClick={handleAdjustCredits}
     title="Credits anpassen (+ oder −)"
     className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors"
 >
     <Pencil className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* Stripe Payments */}
 {user.stripeCustomerId && (
     <div>
         <SectionHeader>
             <span className="flex items-center gap-2">
                 <CreditCard className="w-3.5 h-3.5" />
                 Stripe
                 <a
                     href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                 >
                     <ExternalLink className="w-3 h-3" />
                 </a>
             </span>
         </SectionHeader>
         <div className="space-y-2">
             {loadingPayments ? (
                 <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-zinc-400" /></div>
             ) : payments.length === 0 ? (
                 <p className="text-xs text-zinc-400 px-1">Keine Zahlungen gefunden</p>
             ) : payments.map(p => (
                 <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                     <div>
                         <div className="text-sm font-mono font-medium">{p.amount.toFixed(2)} €</div>
                         <div className="text-xs text-zinc-400">{new Date(p.created * 1000).toLocaleDateString('de-DE')}</div>
                     </div>
                     <button
                         onClick={() => handleRefund(p.id, p.amount)}
                         disabled={refundingId === p.id}
                         className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-50"
                     >
                         {refundingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                         Refund
                     </button>
                 </div>
             ))}
         </div>
     </div>
 )}

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
 <Trash className="w-4 h-4 text-red-500" />
 <span className="text-sm text-red-600 dark:text-red-400">{t('admin_delete_user')}</span>
 </div>
 </button>
 </div>
 </div>
 </div>
 </div>
 );
};
