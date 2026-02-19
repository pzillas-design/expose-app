import { supabase } from './supabaseClient';
import { AdminUser } from '../types';
import { slugify } from '../utils/stringUtils';

export const adminService = {
    /**
     * Fetch all users/profiles from the database
     */
    async getUsers(): Promise<AdminUser[]> {
        const { data, error } = await supabase.rpc('get_admin_users');

        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }

        return (data || []).map((user: any) => ({
            id: user.user_id,
            name: user.full_name || 'New User',
            email: user.email,
            role: user.role as 'admin' | 'user' | 'pro',
            status: 'active',
            credits: user.credits || 0.0,
            totalSpent: user.total_spent || 0.0,
            joinedAt: new Date(user.created_at).getTime(),
            lastActiveAt: new Date(user.last_active_at).getTime(),
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
        // We use an Edge Function to delete from auth.users (which requires service_role)
        // and it handles the profile cleanup as well.
        const { error } = await supabase.functions.invoke('delete-user', {
            body: { userId: id }
        });

        if (error) {
            console.error('Error deleting user:', error);
            throw new Error(error.message || 'Failed to delete user via Edge Function');
        }
    },

    /**
     * Trigger a password reset email for a user
     */
    async resetPassword(email: string): Promise<void> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
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

        // Fetch related images for all jobs (if job_id is set)
        const jobIds = (data || []).map(j => j.id);
        let imagesMap: Record<string, any> = {};

        if (jobIds.length > 0) {
            const { data: images } = await supabase
                .from('canvas_images')
                .select('job_id, storage_path, width, height')
                .in('job_id', jobIds);

            // Create a map: job_id -> image
            if (images) {
                images.forEach(img => {
                    if (img.job_id) {
                        imagesMap[img.job_id] = img;
                    }
                });
            }
        }

        return (data || []).map(job => ({
            id: job.id,
            userName: job.user_name || 'Unknown',
            type: job.type || 'Generation',
            model: job.model || 'unknown', // This already contains 'pro-1k', 'pro-2k' etc from DB
            status: job.status || 'completed',
            promptPreview: job.prompt_preview || '',
            cost: job.cost || 0,
            apiCost: job.api_cost || 0,
            tokensPrompt: job.tokens_prompt || 0,
            tokensCompletion: job.tokens_completion || 0,
            tokensTotal: job.tokens_total || 0,
            createdAt: new Date(job.created_at).getTime(),
            resultImage: imagesMap[job.id] || null,  // Attach result image if available
            requestPayload: job.request_payload || null  // Attach API request for debugging
        }));
    },

    /**
     * Preset Management
     */
    /**
     * Preset Management
     */
    async getGlobalPresets(userId?: string, systemOnly = false): Promise<any[]> {
        // Fetch all presets
        let query = supabase
            .from('global_presets')
            .select('*')
            .order('created_at', { ascending: false });

        if (systemOnly) {
            query = query.is('user_id', null);
        }

        const { data: allPresets, error: presetsError } = await query;

        if (presetsError) throw presetsError;

        if (!userId) {
            return (allPresets || []).map(p => this._mapDbPreset(p));
        }

        // Fetch user preferences (hidden presets)
        const { data: prefs, error: prefsError } = await supabase
            .from('user_preset_preferences')
            .select('*')
            .eq('user_id', userId);

        if (prefsError) throw prefsError;

        const hiddenIds = new Set(prefs?.filter(pr => pr.is_hidden).map(pr => pr.preset_id) || []);

        // Identify forked presets owned by the user
        const userForks = allPresets?.filter(p => p.user_id === userId && p.original_id !== null) || [];
        const forkedOriginalIds = new Set(userForks.map(f => f.original_id));

        // Filter:
        // 1. Keep all user-owned presets
        // 2. Keep system presets (user_id IS NULL) ONLY IF:
        //    - Not hidden by user
        //    - Not forked by user (user has their own version)
        // 3. EXCLUDE 'recent' category unless specifically requested (handled by separate history logic)
        const filteredPresets = allPresets?.filter(p => {
            // Never show 'recent' items in the main preset library
            if (p.category === 'recent') return false;

            const isSystem = p.user_id === null;
            if (!isSystem) return p.user_id === userId; // Own presets always shown

            const isHidden = hiddenIds.has(p.id);
            const isForked = forkedOriginalIds.has(p.id);

            return !isHidden && !isForked;
        });

        // Deduplicate by ID just in case
        const seen = new Set();
        const uniquePresets = (filteredPresets || []).filter(p => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });

        return uniquePresets.map(p => this._mapDbPreset(p));
    },

    _mapDbPreset(p: any) {
        return {
            ...p,
            isPinned: p.is_pinned,
            isCustom: p.is_custom,
            isDefault: p.is_default || false,
            usageCount: p.usage_count,
            createdAt: p.created_at ? new Date(p.created_at).getTime() : undefined,
            lastUsed: p.last_used ? new Date(p.last_used).getTime() : undefined,
            slug: p.slug
        };
    },

    async updateGlobalPreset(preset: any, userId?: string): Promise<void> {
        const isSystemPreset = !preset.user_id;
        const isUserAction = userId && userId !== preset.user_id;

        // Determine category: system presets stay 'system', user presets are 'user'
        let category = 'system';
        if (userId) {
            // If user is creating/editing, it's a user preset
            category = 'user';
        } else if (preset.user_id) {
            // If preset has a user_id, it's a user preset
            category = 'user';
        } else if (preset.category === 'recent') {
            // Preserve 'recent' category for history
            category = 'recent';
        }

        // Generate slug if not present
        const slug = preset.slug || (preset.title ? `${slugify(preset.title)}-${Math.floor(Math.random() * 10000)}` : null);

        // FORKING LOGIC: If a user edits a system preset, create a fork
        const dbPreset: any = {
            id: (isSystemPreset && isUserAction) ? crypto.randomUUID() : (preset.id || crypto.randomUUID()),
            original_id: (isSystemPreset && isUserAction) ? preset.id : (preset.original_id || null),
            title: preset.title,
            label: preset.title, // Sync label with title for DB compatibility
            prompt: preset.prompt,
            tags: preset.tags || [],
            is_pinned: preset.isPinned ?? (category === 'user' ? true : false),
            is_custom: userId ? true : (preset.isCustom ?? false),
            usage_count: preset.usageCount || 0,
            lang: preset.lang || 'en',
            slug: slug,
            updated_at: new Date().toISOString(),
            last_used: preset.lastUsed ? new Date(preset.lastUsed).toISOString() : null,
            controls: preset.controls || [],
            user_id: userId || preset.user_id || null, // Maintain existing owner or set new one
            category: category
        };

        const { error } = await supabase.from('global_presets').upsert(dbPreset);
        if (error) {
            console.error('AdminService: updateGlobalPreset failed!', error);
            throw error;
        }
    },

    async hideGlobalPreset(presetId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('user_preset_preferences')
            .upsert({
                user_id: userId,
                preset_id: presetId,
                is_hidden: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,preset_id' });

        if (error) {
            console.error('AdminService: hideGlobalPreset failed!', error);
            throw error;
        }
    },

    async deleteGlobalPreset(id: string): Promise<void> {
        const { error } = await supabase.from('global_presets').delete().eq('id', id);
        if (error) throw error;
    },

    /**
     * Trigger a manual sync of user emails from Auth to Profiles
     */
    async syncUsers(): Promise<string> {
        const { data, error } = await supabase.functions.invoke('sync-users');
        if (error) {
            console.error('Error syncing users:', error);
            throw error;
        }
        return data?.message || 'Sync completed';
    },

    /**
     * Update the usage count and last used timestamp for a preset
     */
    async updatePresetUsage(id: string): Promise<void> {
        const { data: preset } = await supabase
            .from('global_presets')
            .select('usage_count')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('global_presets')
            .update({
                usage_count: (preset?.usage_count || 0) + 1,
                last_used: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('AdminService: updatePresetUsage failed!', error);
            throw error;
        }
    },

    /**
     * Objects Library Management (Flat Stamps)
     */
    async getObjectCategories(): Promise<any[]> {
        // Return a virtual 'All' category for backward compatibility if needed, 
        // or just return empty as we are going flat.
        return [{ id: 'stamps', label_de: 'Stempel', label_en: 'Stamps', icon: '📦' }];
    },

    async getObjectItems(): Promise<any[]> {
        const { data, error } = await supabase.from('global_objects_items').select('*').order('order', { ascending: true });
        if (error) {
            console.error('AdminService: Failed to fetch stamps!', error);
            throw error;
        }
        console.log('AdminService: Fetched stamps:', data?.length || 0, data);
        return data || [];
    },

    async updateObjectCategory(_category: any): Promise<void> {
        // No-op or handle if needed
    },

    async deleteObjectCategory(_id: string): Promise<void> {
        // No-op
    },

    async updateObjectItem(item: any): Promise<void> {
        // Clean up item for flat table (remove category_id)
        const { category_id, ...flatItem } = item;
        const { error } = await supabase.from('global_objects_items').upsert(flatItem);
        if (error) throw error;
    },

    async deleteObjectItem(id: string): Promise<void> {
        const { error } = await supabase.from('global_objects_items').delete().eq('id', id);
        if (error) throw error;
    },

    /**
     * Fetch a single preset by its unique slug
     */
    async getPresetBySlug(slug: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('global_presets')
            .select('*')
            .eq('slug', slug.toLowerCase())
            .order('updated_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('AdminService: getPresetBySlug failed!', error);
            throw error;
        }

        if (!data || data.length === 0) return null;
        return this._mapDbPreset(data[0]);
    }
};
