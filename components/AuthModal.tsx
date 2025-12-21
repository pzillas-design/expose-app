import React, { useState } from 'react';
import { X, Mail, Lock, ArrowRight, Loader2, Fingerprint, LogIn } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Theme, Typo, Button, IconButton, Input } from './ui/DesignSystem';
import { Logo } from './ui/Logo';
import { TranslationFunction } from '../types';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: TranslationFunction;
    initialMode?: 'signin' | 'signup' | 'reset' | 'update-password';
    initialEmail?: string;
    externalError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, t, initialMode = 'signin', initialEmail = '', externalError }) => {
    const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'update-password'>(initialMode);
    const [email, setEmail] = useState(initialEmail);

    // Sync mode and email if props change while open
    React.useEffect(() => {
        if (isOpen) {
            if (initialMode) setMode(initialMode);
            if (initialEmail) setEmail(initialEmail);
        }
    }, [initialMode, initialEmail, isOpen]);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Sync external error
    React.useEffect(() => {
        if (externalError) {
            setError(externalError);
        }
    }, [externalError]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setSuccessMsg(t('auth_check_email_conf'));
            } else if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onClose();
            } else if (mode === 'reset') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                setSuccessMsg(t('auth_check_email_reset'));
            } else if (mode === 'update-password') {
                if (password !== confirmPassword) {
                    throw new Error(t('auth_error_password_mismatch'));
                }
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                setSuccessMsg(t('auth_password_updated'));
                setTimeout(() => {
                    setMode('signin');
                    onClose();
                }, 2000);
            }
        } catch (err: any) {
            console.error("Email Auth Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err: any) {
            console.error("Google Login Error:", err);
            setError(err.message);
        }
    };

    if (!isOpen) return null;

    const getTranslatedError = (err: string | null) => {
        if (!err) return null;
        const e = err.toLowerCase();

        // 1. Password Errors
        if (e.includes('different from the old')) return t('auth_error_password_same');
        if (e.includes('mismatch')) return t('auth_error_password_mismatch');

        // 2. Credential Errors (Wait, check this first before "invalid")
        if (e.includes('credentials') || e.includes('invalid_grant')) return t('auth_error_invalid_credentials');

        // 3. User Errors
        if (e.includes('already registered') || e.includes('already exists')) return t('auth_error_user_exists');

        // 4. Link Errors (Specific check)
        if (e.includes('link') || e.includes('expired')) {
            return t('auth_error_invalid_link');
        }

        return err;
    };

    const isResendableError = (err: string | null) => {
        if (!err) return false;
        const e = err.toLowerCase();
        // Only resend if it's actually about a link or expiration, NOT credentials
        return (e.includes('link') || e.includes('expired')) && !e.includes('credentials');
    };

    return (
        <div className="fixed inset-0 z-[70] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className={`
                    w-full max-w-md ${Theme.Colors.PanelBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} 
                    shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="p-8 pt-12 pb-2 flex flex-col items-center text-center relative z-10">
                    <div className="flex items-center justify-center mb-6">
                        <Logo className="w-36 h-36" />
                    </div>
                    <div className="space-y-1">
                        {mode !== 'signin' && (
                            <h2 className={Typo.H1}>
                                {mode === 'signup' ? t('auth_create_account') :
                                    mode === 'update-password' ? t('auth_update_password_title') :
                                        t('auth_reset_password')}
                            </h2>
                        )}
                        {mode !== 'update-password' && mode !== 'signin' && (
                            <p className={Typo.Micro}>
                                {mode === 'signup' ? t('auth_signup_desc') :
                                    t('auth_reset_desc')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Form */}
                <div className="p-8 space-y-6">
                    {/* 1. Email Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {mode !== 'update-password' ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('auth_email_placeholder')}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <input
                                type="email"
                                name="email"
                                value={email}
                                autoComplete="username"
                                style={{ display: 'none' }}
                                readOnly
                            />
                        )}

                        {mode !== 'reset' && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={mode === 'update-password' ? t('auth_new_password_placeholder') : t('auth_password_placeholder')}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'update-password' && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder={t('auth_confirm_password_placeholder')}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg animate-in fade-in slide-in-from-top-1 flex items-center justify-between">
                                <span>{getTranslatedError(error)}</span>
                                {isResendableError(error) && (
                                    <button
                                        type="button"
                                        onClick={() => { setMode('reset'); setError(null); setSuccessMsg(null); }}
                                        className="text-xs font-semibold underline hover:opacity-70 transition-opacity ml-2 whitespace-nowrap"
                                    >
                                        {t('auth_resend_link')}
                                    </button>
                                )}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/10 rounded-lg animate-in fade-in slide-in-from-top-1">
                                {successMsg}
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full justify-center"
                            isLoading={loading}
                        >
                            <span>
                                {mode === 'signin' ? t('auth_sign_in_btn') :
                                    mode === 'signup' ? t('auth_create_account_btn') :
                                        mode === 'update-password' ? (t('auth_update_password_btn') || "Set New Password") :
                                            t('auth_send_reset_link')}
                            </span>
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </form>

                    {/* 2. Divider & Social Auth */}
                    {mode !== 'reset' && mode !== 'update-password' && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className={`bg-white dark:bg-zinc-900 px-2 text-zinc-500`}>{t('auth_or_continue')}</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleGoogleLogin}
                                className="w-full py-2.5"
                                icon={
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                                    </svg>
                                }
                            >
                                <span>{t('auth_google')}</span>
                            </Button>
                        </>
                    )}

                    {/* 3. Footer Links */}
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                        {mode === 'signin' ? (
                            <>
                                <button onClick={() => { setMode('signup'); setError(null); }} className="hover:text-black dark:hover:text-white transition-colors">{t('auth_no_account')}</button>
                                <button onClick={() => { setMode('reset'); setError(null); }} className="hover:text-black dark:hover:text-white transition-colors">{t('auth_forgot_password')}</button>
                            </>
                        ) : mode === 'signup' ? (
                            <div className="w-full text-center">
                                {t('auth_already_have')}{' '}
                                <button onClick={() => { setMode('signin'); setError(null); }} className="font-medium text-black dark:text-white hover:underline">{t('auth_sign_in_btn')}</button>
                            </div>
                        ) : (
                            <button onClick={() => { setMode('signin'); setError(null); }} className="flex items-center gap-2 hover:text-black dark:hover:text-white transition-colors">
                                <ArrowRight className="w-3 h-3 rotate-180" /> {t('auth_back_to_signin')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
