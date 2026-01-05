import { supabase } from './supabaseClient';
import { AdminUser } from '../types';

export const adminService = {
    /**
     * Fetch all users/profiles from the database
     */
    async getUsers(): Promise<AdminUser[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }

        return (data || []).map(profile => ({
            id: profile.id,
            name: profile.full_name || 'New User',
            email: profile.email,
            role: profile.role as 'admin' | 'user' | 'pro',
            status: 'active', // Derived or hardcoded as per user request (removing status management)
            credits: profile.credits || 0.0,
            totalSpent: profile.total_spent || 0.0,
            joinedAt: new Date(profile.created_at).getTime(),
            lastActiveAt: new Date(profile.last_active_at).getTime(),
        }));
    },

    /**
     * Update a user's profile information
     */
    async updateUser(id: string, updates: Partial<AdminUser>): Promise<void> {
        const dbUpdates: any = {};

        if (updates.role) dbUpdates.role = updates.role;
        if (updates.credits !== undefined) dbUpdates.credits = updates.credits;
        if (updates.name) dbUpdates.full_name = updates.name;

        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', id);

        if (error) {
            console.error('AdminService: Profile update failed!', error.message, error.details, error.hint);
            throw error;
        }
    },

    /**
     * Delete a user (from profiles - Auth deletion usually requires service role or Edge Function)
     */
    async deleteUser(id: string): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting user profile:', error);
            throw error;
        }

        // Note: To delete from auth.users, we would typically call an Edge Function
        // for security reasons as anon/auth keys cannot delete other users.
    },

    /**
     * Trigger a password reset email for a user
     */
    async resetPassword(email: string): Promise<void> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    },

    /**
     * Fetch generation jobs with pagination
     */
    async getJobs(page?: number, pageSize?: number): Promise<any[]> {
        let query = supabase
            .from('generation_jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (page !== undefined && pageSize !== undefined) {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(job => ({
            id: job.id,
            userName: job.user_name || 'Unknown',
            type: job.type || 'Generation',
            status: job.status || 'completed',
            promptPreview: job.prompt || '',
            cost: job.cost || 0,
            apiCost: job.api_cost || 0,
            tokensPrompt: job.tokens_prompt || 0,
            tokensCompletion: job.tokens_completion || 0,
            tokensTotal: job.tokens_total || 0,
            createdAt: new Date(job.created_at).getTime()
        }));
    },

    /**
     * Preset Management
     */
    async getGlobalPresets(): Promise<any[]> {
        const { data, error } = await supabase.from('global_presets').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(p => ({
            ...p,
            isPinned: p.is_pinned,
            isCustom: p.is_custom,
            isDefault: p.is_default,
            usageCount: p.usage_count,
            createdAt: p.created_at ? new Date(p.created_at).getTime() : undefined,
            lastUsed: p.last_used ? new Date(p.last_used).getTime() : undefined,
        }));
    },

    async updateGlobalPreset(preset: any): Promise<void> {
        const dbPreset = {
            id: preset.id,
            title: preset.title,
            prompt: preset.prompt,
            tags: [],
            is_pinned: preset.isPinned,
            is_custom: preset.isCustom,
            is_default: preset.isDefault,
            usage_count: preset.usageCount,
            lang: preset.lang,
            updated_at: new Date().toISOString(),
            last_used: preset.lastUsed ? new Date(preset.lastUsed).toISOString() : null,
            controls: preset.controls
        };
        const { error } = await supabase.from('global_presets').upsert(dbPreset);
        if (error) {
            console.error('AdminService: updateGlobalPreset failed!', error);
            throw error;
        }
    },

    async deleteGlobalPreset(id: string): Promise<void> {
        const { error } = await supabase.from('global_presets').delete().eq('id', id);
        if (error) throw error;
    },

    /**
     * Objects Library Management
     */
    async getObjectCategories(): Promise<any[]> {
        const { data, error } = await supabase.from('global_objects_categories').select('*').order('order', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async getObjectItems(): Promise<any[]> {
        const { data, error } = await supabase.from('global_objects_items').select('*').order('order', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async updateObjectCategory(category: any): Promise<void> {
        const { error } = await supabase.from('global_objects_categories').upsert(category);
        if (error) throw error;
    },

    async deleteObjectCategory(id: string): Promise<void> {
        const { error } = await supabase.from('global_objects_categories').delete().eq('id', id);
        if (error) throw error;
    },

    async updateObjectItem(item: any): Promise<void> {
        const { error } = await supabase.from('global_objects_items').upsert(item);
        if (error) throw error;
    },

    async deleteObjectItem(id: string): Promise<void> {
        const { error } = await supabase.from('global_objects_items').delete().eq('id', id);
        if (error) throw error;
    }
};
