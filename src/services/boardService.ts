import { supabase } from './supabaseClient';
import { Board } from '../types';

export const boardService = {
    async getBoards(userId: string): Promise<Board[]> {
        const { data, error } = await supabase
            .from('boards')
            .select('*, canvas_images(count)')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching boards:', error);
            return [];
        }

        return data.map(b => ({
            id: b.id,
            userId: b.user_id,
            name: b.name,
            thumbnail: b.thumbnail,
            itemCount: b.canvas_images?.[0]?.count || 0,
            createdAt: new Date(b.created_at).getTime(),
            updatedAt: new Date(b.updated_at).getTime()
        }));
    },

    async createBoard(userId: string, name: string = 'Mein Board'): Promise<Board | null> {
        const { data, error } = await supabase
            .from('boards')
            .insert({
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
