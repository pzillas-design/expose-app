import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { imageService } from '../services/imageService';
import { ImageRow } from '../types';
import { LocaleKey } from '../data/locales';
import { useToast } from '../components/ui/Toast';

interface UseAuthProps {
    isAuthDisabled: boolean;
    getResolvedLang: () => LocaleKey;
    t: (key: any) => string;
}

export const useAuth = ({ isAuthDisabled, getResolvedLang, t }: UseAuthProps) => {
    const { showToast } = useToast();
    const [user, setUser] = useState<any>(isAuthDisabled ? { id: 'guest', email: 'guest@expose.ae' } : null);
    const [userProfile, setUserProfile] = useState<any>(isAuthDisabled ? { credits: 999.00, full_name: 'Guest User' } : null);
    const [credits, setCredits] = useState<number>(10.00);
    const userRef = useRef<any>(user);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset' | 'update-password'>('signin');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(!isAuthDisabled);
    const [authEmail, setAuthEmail] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);

    const fetchProfile = useCallback(async (sessionUser: any) => {
        // Prevent redundant loads if the user is already the same
        if (sessionUser?.id === userRef.current?.id && userProfile) {
            console.log("Auth: Session validated, skipping redundant profile/image reload.");
            return;
        }

        if (sessionUser) {
            setUser(sessionUser);
            try {
                // Update last_active_at
                await supabase.from('profiles').update({
                    last_active_at: new Date().toISOString()
                }).eq('id', sessionUser.id);

                // Fetch full profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', sessionUser.id)
                    .single();

                if (profile) {
                    setCredits(profile.credits);
                    setUserProfile(profile);
                }
            } catch (err) {
                console.error("Auth: Profile fetch failed:", err);
            }
        } else {
            setUser(null);
            setUserProfile(null);
        }
    }, [userProfile]);

    // Initial session and auth changes
    useEffect(() => {
        if (isAuthDisabled) {
            setCredits(999.00);
            return;
        }

        if (window.location.hash) {
            const params = new URLSearchParams(window.location.hash.substring(1));
            const errorMsg = params.get('error_description');
            if (errorMsg) {
                setAuthError(errorMsg.replace(/\+/g, ' '));
                setIsAuthModalOpen(true);
                window.history.replaceState(null, '', window.location.pathname);
            }
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUserId = userRef.current?.id;
            const newUserId = session?.user?.id;

            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (newUserId !== currentUserId) {
                    fetchProfile(session?.user ?? null);
                }
            } else if (event === 'TOKEN_REFRESHED') {
                // Only re-fetch if the user actually changed 
                if (newUserId && newUserId !== currentUserId) {
                    fetchProfile(session?.user);
                }
            } else if (event === 'SIGNED_OUT') {
                fetchProfile(null);
            } else if (event === 'PASSWORD_RECOVERY') {
                if (session?.user?.email) {
                    setAuthEmail(session.user.email);
                }
                setAuthModalMode('update-password');
                setIsAuthModalOpen(true);
            }
        });

        return () => subscription.unsubscribe();
    }, [isAuthDisabled, fetchProfile]);

    // Real-time Credit Updates
    useEffect(() => {
        if (!user || isAuthDisabled) return;

        const channel = supabase
            .channel(`profile-${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, (payload) => {
                if (payload.new && typeof payload.new.credits === 'number') {
                    setCredits(payload.new.credits);
                    setUserProfile(payload.new);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isAuthDisabled]);

    // Payment Success Redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            showToast(t('payment_success'), "success");

            const newURL = window.location.origin + window.location.pathname;
            window.history.replaceState(null, '', newURL);
        }
    }, [showToast, t]);

    const handleAddFunds = useCallback(async (amount: number) => {
        if (isAuthDisabled) {
            setCredits(prev => prev + amount);
            setUserProfile((prev: any) => ({ ...prev, credits: (prev?.credits || 0) + amount }));
            showToast(`Simulated: Added ${amount}€ to balance.`, "success");
            return;
        }

        try {
            const invokePromise = supabase.functions.invoke('stripe-checkout', {
                body: {
                    amount,
                    cancel_url: window.location.origin,
                    success_url: `${window.location.origin}?payment=success`
                }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: The server took too long to respond.")), 15000)
            );

            const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL received from server.");
            }
        } catch (err: any) {
            showToast(err.message || t('payment_failed'), "error");
        }
    }, [isAuthDisabled, showToast, t]);


    const updateProfile = useCallback(async (updates: { full_name?: string }) => {
        if (!user || isAuthDisabled) return;
        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
            if (error) throw error;
            setUserProfile((prev: any) => ({ ...prev, ...updates }));
            showToast(t('profile_updated'), "success");
        } catch (err: any) {
            showToast(err.message || t('failed_update_profile'), "error");
        }
    }, [user, isAuthDisabled, showToast, t]);


    const handleSignOut = useCallback(async () => {
        await supabase.auth.signOut();
        window.location.reload();
    }, []);

    const deleteAccount = useCallback(async () => {
        if (!user || isAuthDisabled) return;
        try {
            // First sign out locally
            await supabase.auth.signOut();

            // In a real app, you'd call an edge function to delete the user from auth.users
            // For now, we delete the profile specifically if it doesn't auto-cascade
            const { error } = await supabase.from('profiles').delete().eq('id', user.id);
            if (error) throw error;

            showToast(t('account_deleted'), "success");
            window.location.href = '/';
        } catch (err: any) {
            showToast(err.message || t('failed_delete_account'), "error");
        }
    }, [user, isAuthDisabled, t, showToast]);


    return {
        user,
        userProfile,
        credits,
        setCredits,
        authModalMode,
        setAuthModalMode,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authEmail,
        setAuthEmail,
        authError,
        setAuthError,
        handleAddFunds,
        handleSignOut,
        updateProfile,
        deleteAccount
    };
};
