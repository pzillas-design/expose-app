
import { supabase } from './supabaseClient';
import { LibraryItem } from '../types';

export const userService = {
    async getUserObjects(userId: string): Promise<LibraryItem[]> {
        const { data, error } = await supabase
            .from('user_objects')
            .select('*')
            .eq('user_id', userId)
            .order('order', { ascending: true });

        if (error) {
            console.error('Error fetching user objects:', error);
            return [];
        }

        return (data || []).map(item => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            isUserCreated: true
        }));
    },

    async addUserObject(userId: string, label: string, icon: string = '📦', order: number = 0): Promise<LibraryItem | null> {
        const { data, error } = await supabase
            .from('user_objects')
            .insert({
                user_id: userId,
                label,
                icon,
                order
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding user object:', error);
            return null;
        }

        return {
            id: data.id,
            label: data.label,
            icon: data.icon,
            isUserCreated: true
        };
    },

    async deleteUserObject(userId: string, itemId: string): Promise<void> {
        const { error } = await supabase
            .from('user_objects')
            .delete()
            .eq('id', itemId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting user object:', error);
            throw error;
        }
    }
};
