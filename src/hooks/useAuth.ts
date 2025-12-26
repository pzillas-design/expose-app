import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { imageService } from '../services/imageService';
import { ImageRow } from '../types';
import { LocaleKey } from '../data/locales';
import { useToast } from '../components/ui/Toast';

interface UseAuthProps {
    isAuthDisabled: boolean;
    getResolvedLang: () => LocaleKey;
    setRows: (rows: ImageRow[]) => void;
    selectAndSnap: (id: string) => void;
}

export const useAuth = ({ isAuthDisabled, getResolvedLang, setRows, selectAndSnap }: UseAuthProps) => {
    const { showToast } = useToast();
    const [user, setUser] = useState<any>(isAuthDisabled ? { id: 'guest', email: 'guest@expose.ae' } : null);
    const [userProfile, setUserProfile] = useState<any>(isAuthDisabled ? { credits: 999.00, full_name: 'Guest User' } : null);
    const [credits, setCredits] = useState<number>(10.00);

    const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset' | 'update-password'>('signin');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(!isAuthDisabled);
    const [authEmail, setAuthEmail] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);

    const fetchProfile = useCallback(async (sessionUser: any) => {
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

                    // Load User Images
                    imageService.loadUserImages(sessionUser.id).then(loadedRows => {
                        setRows(loadedRows);
                        if (loadedRows.length > 0 && loadedRows[0].items.length > 0) {
                            const newestRow = loadedRows[0];
                            const newestItem = newestRow.items[newestRow.items.length - 1];
                            setTimeout(() => {
                                selectAndSnap(newestItem.id);
                            }, 100);
                        }
                    });
                }
            } catch (err) {
                console.error("Auth: Profile fetch failed:", err);
            }
        } else {
            setUser(null);
            setUserProfile(null);
        }
    }, [setRows, selectAndSnap]);

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

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                fetchProfile(session?.user ?? null);
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
            showToast(getResolvedLang() === 'de'
                ? "Zahlung erfolgreich! Dein Guthaben wird in Kürze aktualisiert."
                : "Payment successful! Your balance will be updated shortly.", "success");

            const newURL = window.location.origin + window.location.pathname;
            window.history.replaceState(null, '', newURL);
        }
    }, [showToast, getResolvedLang]);

    const handleAddFunds = async (amount: number) => {
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
            showToast(err.message || "Payment initialization failed.", "error");
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

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
        handleSignOut
    };
};
