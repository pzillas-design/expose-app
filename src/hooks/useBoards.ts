import { useState, useEffect, useCallback } from 'react';
import { boardService } from '../services/boardService';
import { Board } from '../types';
import { useToast } from '../components/ui/Toast';

export const useBoards = (userId: string | undefined) => {
    const [boards, setBoards] = useState<Board[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const fetchBoards = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await boardService.getBoards(userId);
            setBoards(data);
        } catch (error) {
            showToast('Failed to load boards', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [userId, showToast]);

    useEffect(() => {
        fetchBoards();
    }, [fetchBoards]);

    const createBoard = async (name?: string) => {
        if (!userId) return null;
        try {
            const newBoard = await boardService.createBoard(userId, name);
            if (newBoard) {
                setBoards(prev => [newBoard, ...prev]);
                return newBoard;
            }
        } catch (error) {
            showToast('Failed to create board', 'error');
        }
        return null;
    };

    const deleteBoard = async (boardId: string) => {
        try {
            await boardService.deleteBoard(boardId);
            setBoards(prev => prev.filter(b => b.id !== boardId));
        } catch (error) {
            showToast('Failed to delete board', 'error');
        }
    };

    const updateBoard = async (boardId: string, updates: Partial<Board>) => {
        try {
            await boardService.updateBoard(boardId, updates);
            setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
        } catch (error) {
            showToast('Failed to update board', 'error');
        }
    };

    return {
        boards,
        isLoading,
        fetchBoards,
        createBoard,
        deleteBoard,
        updateBoard
    };
};
