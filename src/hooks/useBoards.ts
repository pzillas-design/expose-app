import { useState, useEffect, useCallback } from 'react';
import { boardService } from '../services/boardService';
import { Board } from '../types';
import { useToast } from '../components/ui/Toast';
import { useConfig } from './useConfig';
import { generateId } from '../utils/ids';

export const useBoards = (userId: string | undefined) => {
    const { t } = useConfig();
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
            showToast(t('failed_load_boards'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [userId, showToast]);

    useEffect(() => {
        fetchBoards();
    }, [fetchBoards]);

    const getNextBoardName = () => {
        const base = 'meinBot';
        if (!boards.find(b => b.name === base)) return base;

        let i = 2;
        while (boards.find(b => b.name === `${base}${i}`)) {
            i++;
        }
        return `${base}${i}`;
    };

    const createBoard = async (name?: string) => {
        if (!userId) return null;
        const finalName = name || getNextBoardName();
        try {
            const newBoard = await boardService.createBoard(userId, finalName);
            if (newBoard) {
                setBoards(prev => [newBoard, ...prev]);
                return newBoard;
            }
        } catch (error) {
            showToast(t('failed_create_board'), 'error');
        }
        return null;
    };

    const initializeNewBoard = () => {
        if (!userId) return null;
        const id = generateId();
        const name = getNextBoardName();
        return { id, name };
    };

    const deleteBoard = async (boardId: string) => {
        try {
            await boardService.deleteBoard(boardId);
            setBoards(prev => prev.filter(b => b.id !== boardId));
        } catch (error) {
            showToast(t('failed_delete_board'), 'error');
        }
    };

    const updateBoard = async (boardId: string, updates: Partial<Board>) => {
        try {
            await boardService.updateBoard(boardId, updates);
            setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
        } catch (error) {
            showToast(t('failed_update_board'), 'error');
        }
    };

    return {
        boards,
        isLoading,
        fetchBoards,
        createBoard,
        initializeNewBoard,
        deleteBoard,
        updateBoard
    };
};
