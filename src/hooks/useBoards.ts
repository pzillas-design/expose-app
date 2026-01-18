import { useState, useEffect, useCallback } from 'react';
import { boardService } from '../services/boardService';
import { Board } from '../types';
import { useToast } from '../components/ui/Toast';
import { useConfig } from './useConfig';
import { generateId } from '../utils/ids';

export const useBoards = (userId: string | undefined) => {
    const { t, currentLang } = useConfig();
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

    const getNextBoardName = useCallback(() => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');

        const dateStr = currentLang === 'de' ? `${day}.${month}.` : `${month}-${day}`;
        const base = t('default_project_name' as any).replace('{{date}}', dateStr);

        if (!boards.find(b => b.name === base)) return base;

        let i = 2;
        while (boards.find(b => b.name === `${base} #${i}`)) {
            i++;
        }
        return `${base} #${i}`;
    }, [boards, currentLang, t]);

    const createBoard = useCallback(async (name?: string) => {
        const finalName = name || getNextBoardName();
        try {
            // For guests (no userId), create a local-only board
            if (!userId) {
                const localBoard: Board = {
                    id: generateId(),
                    name: finalName,
                    userId: 'guest',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                setBoards(prev => [localBoard, ...prev]);
                return localBoard;
            }

            // For authenticated users, persist to database
            const newBoard = await boardService.createBoard(userId, finalName);
            if (newBoard) {
                setBoards(prev => [newBoard, ...prev]);
                return newBoard;
            }
        } catch (error) {
            showToast(t('failed_create_board'), 'error');
        }
        return null;
    }, [userId, getNextBoardName, showToast, t]);

    const initializeNewBoard = useCallback(() => {
        const id = generateId();
        const name = getNextBoardName();
        return { id, name };
    }, [getNextBoardName]);

    const deleteBoard = useCallback(async (boardId: string) => {
        try {
            await boardService.deleteBoard(boardId);
            setBoards(prev => prev.filter(b => b.id !== boardId));
        } catch (error) {
            showToast(t('failed_delete_board'), 'error');
        }
    }, [showToast, t]);

    const updateBoard = useCallback(async (boardId: string, updates: Partial<Board>) => {
        try {
            await boardService.updateBoard(boardId, updates);
            setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
        } catch (error) {
            showToast(t('failed_update_board'), 'error');
        }
    }, [showToast, t]);

    const resolveBoardIdentifier = useCallback(async (identifier: string): Promise<Board | null> => {
        if (!userId) return null;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

        if (isUUID) {
            const found = boards.find(b => b.id === identifier);
            if (found) return found;
            return { id: identifier, name: 'Loading...', userId, createdAt: 0, updatedAt: 0 } as Board;
        }

        return await boardService.getBoardByName(userId, decodeURIComponent(identifier));
    }, [userId, boards]);

    return {
        boards,
        isLoading,
        fetchBoards,
        createBoard,
        initializeNewBoard,
        deleteBoard,
        updateBoard,
        resolveBoardIdentifier
    };
};
