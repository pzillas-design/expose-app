import { supabase } from './supabaseClient';
import { Board } from '../types';
import { storageService } from './storageService';

export const boardService = {
    async getBoards(userId: string): Promise<Board[]> {
        const { data, error } = await supabase
            .from('boards')
            .select(`
                *,
                canvas_images(thumb_storage_path)
            `)
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching boards:', error);
            return [];
        }

        // 1. Collect all paths to fetch
        const allPathsToSign: string[] = [];
        const boardImageMap = new Map<string, string[]>();

        data.forEach((b) => {
            const paths = (b.canvas_images || [])
                .filter((img: any) => img.thumb_storage_path)
                .slice(0, 4) // Max 4 thumbnails per board
                .map((img: any) => img.thumb_storage_path);

            boardImageMap.set(b.id, paths);
            allPathsToSign.push(...paths);
        });

        // 2. Batch fetch signed URLs
        const signedUrlsMap = await storageService.getSignedUrls(allPathsToSign);

        // 3. Map back to boards
        const boardsWithImages = data.map((b) => {
            const originalPaths = boardImageMap.get(b.id) || [];
            const previewImages = originalPaths.map(path => signedUrlsMap[path]).filter(Boolean);

            return {
                id: b.id,
                userId: b.user_id,
                name: b.name,
                thumbnail: b.thumbnail,
                previewImages: previewImages,
                itemCount: b.canvas_images?.length || 0,
                createdAt: new Date(b.created_at).getTime(),
                updatedAt: new Date(b.updated_at).getTime()
            };
        });

        return boardsWithImages;
    },

    async getBoardByName(userId: string, name: string): Promise<Board | null> {
        // Try to verify if we have a match by name
        // We use order by updated_at desc to get the most recent one if duplicates exist
        const { data, error } = await supabase
            .from('boards')
            .select('*')
            .eq('user_id', userId)
            .eq('name', name)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;

        return {
            id: data.id,
            userId: data.user_id,
            name: data.name,
            thumbnail: data.thumbnail,
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: new Date(data.updated_at).getTime()
        };
    },

    async createBoard(userId: string, name: string = 'Main Board', id?: string): Promise<Board | null> {
        const { data, error } = await supabase
            .from('boards')
            .insert({
                id: id || undefined,
                user_id: userId,
                name: name
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating board:', error);
            return null;
        }

        return {
            id: data.id,
            userId: data.user_id,
            name: data.name,
            thumbnail: data.thumbnail,
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: new Date(data.updated_at).getTime()
        };
    },

    async ensureBoardExists(userId: string, boardId: string, name: string = 'Main Board'): Promise<void> {
        const { data: existing } = await supabase
            .from('boards')
            .select('id')
            .eq('id', boardId)
            .single();

        if (!existing) {
            await this.createBoard(userId, name, boardId);
        }
    },

    async updateBoard(boardId: string, updates: Partial<Board>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.thumbnail) dbUpdates.thumbnail = updates.thumbnail;

        const { error } = await supabase
            .from('boards')
            .update({ ...dbUpdates, updated_at: new Date().toISOString() })
            .eq('id', boardId);

        if (error) {
            console.error('Error updating board:', error);
            throw error;
        }
    },

    async deleteBoard(boardId: string): Promise<void> {
        const { error } = await supabase
            .from('boards')
            .delete()
            .eq('id', boardId);

        if (error) {
            console.error('Error deleting board:', error);
            throw error;
        }
    }
};
