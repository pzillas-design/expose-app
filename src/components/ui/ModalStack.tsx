/**
 * ModalStack — tracks open modals so any consumer can close the topmost one.
 *
 * Usage:
 *  - Wrap app in <ModalStackProvider>
 *  - Modal.tsx auto-registers via useModalStack()
 *  - goBack / ESC-like handlers call closeTopModal() without knowing which modal is open
 */
import React, { createContext, useCallback, useContext, useRef } from 'react';

interface ModalStackContextType {
    /** Called by Modal when it opens — returns a deregister function */
    register: (onClose: () => void) => () => void;
    /** Close the topmost registered modal. Returns true if one was closed. */
    closeTop: () => boolean;
    /** How many modals are currently open */
    depth: () => number;
}

const ModalStackContext = createContext<ModalStackContextType | null>(null);

export const ModalStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const stack = useRef<(() => void)[]>([]);

    const register = useCallback((onClose: () => void) => {
        stack.current.push(onClose);
        return () => {
            stack.current = stack.current.filter(fn => fn !== onClose);
        };
    }, []);

    const closeTop = useCallback((): boolean => {
        if (stack.current.length === 0) return false;
        const top = stack.current[stack.current.length - 1];
        top();
        return true;
    }, []);

    const depth = useCallback(() => stack.current.length, []);

    return (
        <ModalStackContext.Provider value={{ register, closeTop, depth }}>
            {children}
        </ModalStackContext.Provider>
    );
};

export const useModalStack = () => {
    const ctx = useContext(ModalStackContext);
    if (!ctx) throw new Error('useModalStack must be used within ModalStackProvider');
    return ctx;
};
