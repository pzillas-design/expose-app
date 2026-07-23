import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Loader2, ArrowRight, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { Button, Theme, Typo, Input } from '@/components/ui/DesignSystem';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { TranslationFunction } from '@/types';

/**
 * Confirmation-page recovery flow.
 *
 * The problem this solves: with the implicit recovery flow, the email link points
 * straight at Supabase's /auth/v1/verify endpoint, so corporate mail scanners
 * (Outlook "Safe Links" etc.) that PREFETCH links silently consume the one-time
 * token before the human ever clicks — the real click then fails.
 *
 * Here the recovery email instead links to THIS page carrying only a `token_hash`
 * (never auto-verified on load). The scanner just renders a static screen; the
 * token is exchanged for a session ONLY when the user explicitly presses the
 * button — verifyOtp() runs on click, not on prefetch. This requires the Supabase
 * "Reset Password" email template to use:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 */
type Stage = 'gate' | 'verifying' | 'form' | 'saving' | 'done' | 'error';

export const AuthConfirmPage: React.FC<{ t: TranslationFunction }> = ({ t }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Read once at mount. Support both ?query and #hash carriers — some providers
    // rewrite one into the other.
    const { tokenHash, type } = useMemo(() => {
        const q = new URLSearchParams(location.search);
        const h = new URLSearchParams(location.hash.replace(/^#/, ''));
        return {
            tokenHash: q.get('token_hash') || h.get('token_hash'),
            type: (q.get('type') || h.get('type') || 'recovery') as 'recovery' | 'email',
        };
    }, [location.search, location.hash]);

    const [stage, setStage] = useState<Stage>(tokenHash ? 'gate' : 'error');
    const [error, setError] = useState<string | null>(tokenHash ? null : t('auth_error_link_expired'));
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Exchange the token for a session — runs ONLY on explicit user click.
    const handleConfirm = async () => {
        if (!tokenHash) return;
        setStage('verifying');
        setError(null);
        const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (verifyErr) {
            setError(t('auth_error_link_expired'));
            setStage('error');
            return;
        }
        setStage('form');
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError(t('auth_error_password_mismatch'));
            return;
        }
        setStage('saving');
        setError(null);
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) {
            setError(updateErr.message);
            setStage('form');
            return;
        }
        setStage('done');
    };

    const requestNewLink = () => {
        // Send the user back to the app where the reset form lives.
        navigate('/?reset=1', { replace: true });
    };

    return (
        <div className="fixed inset-0 z-[70] bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className={`w-full max-w-md ${Theme.Colors.PanelBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusXl} p-8 pt-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-200`}>
                <BrandLogo className="w-28 h-28 mb-4" />

                {/* GATE — nothing has happened yet; the token is untouched until the click */}
                {stage === 'gate' && (
                    <>
                        <ShieldCheck className="w-8 h-8 text-zinc-400 mb-3" />
                        <h2 className={Typo.H1}>{t('auth_reset_password')}</h2>
                        <p className={`${Typo.Micro} mt-2 mb-6`}>{t('auth_confirm_desc')}</p>
                        <Button variant="primary" className="w-full justify-center" onClick={handleConfirm}>
                            <span>{t('auth_confirm_btn')}</span>
                        </Button>
                    </>
                )}

                {(stage === 'verifying') && (
                    <div className="flex flex-col items-center gap-3 py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                        <p className={Typo.Micro}>{t('auth_confirm_verifying')}</p>
                    </div>
                )}

                {/* FORM — verified, ask for the new password */}
                {(stage === 'form' || stage === 'saving') && (
                    <>
                        <h2 className={Typo.H1}>{t('auth_update_password_title')}</h2>
                        <form onSubmit={handleSetPassword} className="w-full space-y-4 mt-6">
                            {/* Hidden username for password managers */}
                            <input type="text" name="username" autoComplete="username" className="hidden" readOnly value="" />
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('auth_new_password_placeholder')}
                                    className="pl-10"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder={t('auth_confirm_password_placeholder')}
                                    className="pl-10"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg text-left">
                                    {error}
                                </div>
                            )}
                            <Button type="submit" variant="primary" className="w-full justify-center" isLoading={stage === 'saving'}>
                                <span>{t('auth_update_password_btn')}</span>
                            </Button>
                        </form>
                    </>
                )}

                {/* DONE */}
                {stage === 'done' && (
                    <>
                        <CheckCircle2 className="w-8 h-8 text-green-500 mb-3" />
                        <h2 className={Typo.H1}>{t('auth_password_updated')}</h2>
                        <p className={`${Typo.Micro} mt-2 mb-6`}>{t('auth_confirm_success_desc')}</p>
                        <Button variant="primary" className="w-full justify-center" onClick={() => navigate('/', { replace: true })}>
                            <span>{t('auth_sign_in_btn')}</span>
                        </Button>
                    </>
                )}

                {/* ERROR — expired/consumed link */}
                {stage === 'error' && (
                    <>
                        <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
                        <h2 className={Typo.H1}>{t('auth_reset_password')}</h2>
                        <p className={`${Typo.Micro} mt-2 mb-6`}>{error || t('auth_error_link_expired')}</p>
                        <Button variant="primary" className="w-full justify-center" onClick={requestNewLink}>
                            <span>{t('auth_confirm_request_new')}</span>
                        </Button>
                        <button
                            onClick={() => navigate('/', { replace: true })}
                            className="mt-4 text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2"
                        >
                            <ArrowRight className="w-3 h-3 rotate-180" /> {t('auth_back_to_signin')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
