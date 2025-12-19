import React, { useState } from 'react';
import { X, Mail, Lock, ArrowRight, Loader2, Fingerprint, LogIn } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Theme, Typo, Button, IconButton } from './ui/DesignSystem';
import { Logo } from './ui/Logo';
import { TranslationFunction } from '../types';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: TranslationFunction;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, t }) => {
    const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setSuccessMsg('Check your email for the confirmation link.');
            } else if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onClose();
            } else if (mode === 'reset') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '?reset=true',
                });
                if (error) throw error;
                setSuccessMsg('Check your email for the password reset link.');
            }
        } catch (err: any) {
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
            setError(err.message);
        }
    };

    if (!isOpen) return null;

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
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="p-8 pb-0 flex flex-col items-center text-center relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl flex items-center justify-center mb-6">
                        <Logo className="w-10 h-10" />
                    </div>
                    <h2 className={Typo.H2}>
                        {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create an account' : 'Reset Password'}
                    </h2>
                    <p className={`${Typo.Body} text-zinc-400 mt-2`}>
                        {mode === 'signin' ? 'Enter your details to access your workspace.' : mode === 'signup' ? 'Start creating stunning Exposes with AI.' : 'Enter your email to receive a reset link.'}
                    </p>
                </div>

                {/* Form */}
                <div className="p-8 space-y-6">
                    {/* Social Auth */}
                    {mode !== 'reset' && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleGoogleLogin}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 ${Theme.Geometry.Radius} border ${Theme.Colors.Border} hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors bg-white dark:bg-zinc-900`}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span className="text-sm font-medium">Google</span>
                            </button>
                            <button
                                disabled // Placeholder for Passkey until fully implemented
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 ${Theme.Geometry.Radius} border ${Theme.Colors.Border} opacity-50 cursor-not-allowed bg-white dark:bg-zinc-900`}
                            >
                                <Fingerprint className="w-5 h-5 text-zinc-500" />
                                <span className="text-sm font-medium">Passkey</span>
                            </button>
                        </div>
                    )}

                    {mode !== 'reset' && (
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className={`bg-white dark:bg-zinc-950 px-2 text-zinc-500`}>Or continue with</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className={`w-full pl-10 pr-4 py-2.5 bg-transparent border ${Theme.Colors.Border} ${Theme.Geometry.Radius} ${Theme.Colors.TextPrimary} placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                                    required
                                />
                            </div>
                        </div>
                        {mode !== 'reset' && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`w-full pl-10 pr-4 py-2.5 bg-transparent border ${Theme.Colors.Border} ${Theme.Geometry.Radius} ${Theme.Colors.TextPrimary} placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/10 rounded-lg animate-in fade-in slide-in-from-top-1">
                                {successMsg}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full justify-center py-2.5"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    <span>
                                        {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                                    </span>
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="flex items-center justify-between text-sm text-zinc-500">
                        {mode === 'signin' ? (
                            <>
                                <button onClick={() => { setMode('reset'); setError(null); }} className="hover:text-black dark:hover:text-white transition-colors">Forgot password?</button>
                                <button onClick={() => { setMode('signup'); setError(null); }} className="hover:text-black dark:hover:text-white transition-colors">Don't have an account?</button>
                            </>
                        ) : mode === 'signup' ? (
                            <div className="w-full text-center">
                                Already have an account?{' '}
                                <button onClick={() => { setMode('signin'); setError(null); }} className="font-medium text-black dark:text-white hover:underline">Sign In</button>
                            </div>
                        ) : (
                            <button onClick={() => { setMode('signin'); setError(null); }} className="flex items-center gap-2 hover:text-black dark:hover:text-white transition-colors">
                                <ArrowRight className="w-3 h-3 rotate-180" /> Back to Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
