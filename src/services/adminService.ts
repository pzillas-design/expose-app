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
            lastActiveAt: user.last_active_at ? new Date(user.last_active_at).getTime() : 0,
            stripeCustomerId: user.stripe_customer_id || null,
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
     * Get Stripe payment history for a customer
     */
    async getStripePayments(stripeCustomerId: string): Promise<any[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');
        const res = await supabase.functions.invoke('admin-stats', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: { stripeCustomerId },
        });
        if (res.error) throw new Error(res.error.message);
        return res.data?.payments || [];
    },

    /**
     * Issue a Stripe refund for a payment intent
     */
    async createStripeRefund(paymentIntentId: string, amountCents?: number): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');
        const res = await supabase.functions.invoke('admin-refund', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: { paymentIntentId, amountCents },
        });
        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
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
        // Supabase TS type parser can't handle ::text casts + JSONB extraction in the same select.
        // Cast to `any` here — we hand-map the rows below anyway, so no type safety is lost.
        let query: any = supabase
            .from('generation_jobs')
            .select('id, user_id, user_name, user_email, type, model, quality_mode, status, error, prompt_preview, cost, created_at, request_type, has_source_image, has_mask, reference_count, image_size, duration_ms, api_cost, tokens_prompt, tokens_completion, tokens_total, downloaded_at, kie_task_id, request_payload->provider::text as provider, request_payload->firstChunkLatencyMs as first_chunk_latency_ms, request_payload->chunkCount as chunk_count, request_payload->thoughtChunkCount as thought_chunk_count')
            .order('created_at', { ascending: false });

        if (page !== undefined && pageSize !== undefined) {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Batch-fetch profiles + images in parallel
        const jobIds = (data || []).map(j => j.id);
        const userIds = [...new Set((data || []).map(j => j.user_id).filter(Boolean))];
        let imagesMap: Record<string, any> = {};
        let profilesMap: Record<string, { name: string; email: string | null }> = {};

        await Promise.all([
            jobIds.length > 0 ? supabase
                .from('images')
                .select('job_id, storage_path, width, height, real_width, real_height, title, base_name, model_version')
                .in('job_id', jobIds)
                .then(({ data: images }) => {
                    if (images) images.forEach(img => { if (img.job_id) imagesMap[img.job_id] = img; });
                }) : Promise.resolve(),
            userIds.length > 0 ? supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds)
                .then(({ data: profiles }) => {
                    if (profiles) profiles.forEach(p => { profilesMap[p.id] = { name: p.full_name || p.email || 'Unknown', email: p.email || null }; });
                }) : Promise.resolve(),
        ]);

        return (data || []).map(job => ({
            id: job.id,
            userName: profilesMap[job.user_id]?.name || job.user_name || 'Unknown',
            userEmail: profilesMap[job.user_id]?.email || job.user_email || null,
            type: job.type || 'Generation',
            model: job.model || 'unknown',
            qualityMode: job.quality_mode || job.model || 'unknown',
            status: job.status || 'completed',
            error: job.error || null,
            promptPreview: job.prompt_preview || '',
            cost: job.cost || 0,
            createdAt: new Date(job.created_at).getTime(),
            resultImage: imagesMap[job.id] || null,  // Attach result image if available
            requestPayload: null,  // Loaded on-demand via getJobDetail()
            requestType: job.request_type || null,
            hasSourceImage: job.has_source_image ?? null,
            hasMask: job.has_mask ?? null,
            referenceCount: job.reference_count ?? null,
            imageSize: job.image_size || null,
            durationMs: job.duration_ms || null,
            apiCost: job.api_cost || null,
            tokensPrompt: job.tokens_prompt ?? null,
            tokensCompletion: job.tokens_completion ?? null,
            tokensTotal: job.tokens_total ?? null,
            webhookData: null,  // Loaded on-demand via getJobDetail()
            downloadedAt: job.downloaded_at || null,
            provider: (job as any).provider || null,  // 'kie_fallback' or null (Google)
            firstChunkLatencyMs: (job as any).first_chunk_latency_ms != null ? Number((job as any).first_chunk_latency_ms) : null,
            chunkCount: (job as any).chunk_count != null ? Number((job as any).chunk_count) : null,
            thoughtChunkCount: (job as any).thought_chunk_count != null ? Number((job as any).thought_chunk_count) : null,
        }));
    },

    /**
     * Fetch the heavy JSONB fields for a single job (loaded on-demand when opening detail view).
     */
    async getJobDetail(jobId: string): Promise<{ requestPayload: any; webhookData: any } | null> {
        const { data, error } = await supabase
            .from('generation_jobs')
            .select('request_payload, webhook_data')
            .eq('id', jobId)
            .single();
        if (error || !data) return null;
        return {
            requestPayload: data.request_payload || null,
            webhookData: data.webhook_data || null,
        };
    },

    /**
     * Fetch voice session summaries (lightweight — no entries, just metadata for table rows).
     * Entries are loaded on-demand via getVoiceSessionEntries().
     */
    async getVoiceSessions(limit = 50): Promise<any[]> {
        // Only fetch the minimal fields needed for the summary row
        const { data, error } = await supabase
            .from('voice_logs')
            .select('session_id, user_id, kind, tool_name, tool_status, source, text, ts')
            .order('ts', { ascending: false })
            .limit(limit);

        if (error) throw error;
        if (!data?.length) return [];

        const sessionMap = new Map<string, any[]>();
        for (const log of data) {
            const sid = log.session_id || '__unknown__';
            if (!sessionMap.has(sid)) sessionMap.set(sid, []);
            sessionMap.get(sid)!.push(log);
        }

        const userIds = [...new Set(data.map(l => l.user_id).filter(Boolean))];
        const profilesMap: Record<string, { name: string; email: string | null }> = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
            if (profiles) profiles.forEach(p => { profilesMap[p.id] = { name: p.full_name || p.email || 'Unknown', email: p.email || null }; });
        }

        return Array.from(sessionMap.entries())
            .map(([sessionId, logs]) => {
                const sorted = logs.sort((a: any, b: any) => a.ts - b.ts);
                const transcripts = sorted.filter((l: any) => l.kind === 'transcript');
                const toolCalls = sorted.filter((l: any) => l.kind === 'tool_call');
                const userId = sorted[0]?.user_id;
                const firstUser = transcripts.find((l: any) => l.source === 'user')?.text;
                const hadGeneration = toolCalls.some((l: any) => l.tool_name === 'trigger_generation' && l.tool_status === 'ok');
                const cleanExit = toolCalls.some((l: any) => l.tool_name === 'stop_voice_mode' && l.tool_status === 'ok');
                const hadError = toolCalls.some((l: any) => l.tool_status === 'error');
                const startedAt = sorted[0]?.ts || 0;
                const endedAt = sorted[sorted.length - 1]?.ts || 0;

                return {
                    id: `voice-${sessionId}`,
                    _type: 'voice' as const,
                    sessionId,
                    userName: profilesMap[userId]?.name || 'Unknown',
                    userEmail: profilesMap[userId]?.email || null,
                    createdAt: startedAt,
                    durationMs: endedAt - startedAt,
                    messageCount: transcripts.length,
                    toolCount: toolCalls.length,
                    firstUserMessage: firstUser || null,
                    hadGeneration,
                    cleanExit,
                    status: hadError ? 'failed' : 'completed',
                    // entries NOT included — loaded on demand
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    },

    /**
     * Fetch full entries for a single voice session (on-demand when user clicks a row).
     */
    async getVoiceSessionEntries(sessionId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('voice_logs')
            .select('session_id, user_id, kind, tool_name, tool_status, args_summary, result_message, source, text, ts')
            .eq('session_id', sessionId)
            .order('ts', { ascending: true });

        if (error) throw error;
        return data || [];
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
            isCustom: p.is_custom,
            usageCount: p.usage_count,
            createdAt: p.created_at ? new Date(p.created_at).getTime() : undefined,
        };
    },

    async updateGlobalPreset(preset: any, userId?: string): Promise<any> {
        const isSystemPreset = !preset.user_id;
        const isUserAction = !!userId && userId !== preset.user_id;

        // Generate slug if not present
        const slug = preset.slug || (preset.title ? `${slugify(preset.title)}-${Math.floor(Math.random() * 10000)}` : null);

        // FORKING LOGIC: If a user edits a system preset, create a personal copy
        const dbPreset: any = {
            id: (isSystemPreset && isUserAction) ? crypto.randomUUID() : (preset.id || crypto.randomUUID()),
            original_id: (isSystemPreset && isUserAction) ? preset.id : (preset.original_id || null),
            title: preset.title,
            prompt: preset.prompt,
            emoji: preset.emoji || null,
            tags: preset.tags || [],
            is_custom: isUserAction ? true : (preset.isCustom ?? false),
            usage_count: preset.usageCount || 0,
            lang: preset.lang || 'de',
            slug: slug,
            updated_at: new Date().toISOString(),
            controls: preset.controls || [],
            user_id: userId || preset.user_id || null,
        };

        const { data, error } = await supabase
            .from('global_presets')
            .upsert(dbPreset)
            .select('*')
            .single();
        if (error) {
            console.error('AdminService: updateGlobalPreset failed!', error);
            throw error;
        }

        return data ? this._mapDbPreset(data) : this._mapDbPreset(dbPreset);
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
     * Update the usage count for a preset
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
        const { error } = await supabase.from('global_objects_items').upsert(item);
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
