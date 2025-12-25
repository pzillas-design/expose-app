
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Theme, Typo, IconButton } from './DesignSystem';

// --- Types ---

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// --- Context ---

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// --- Component ---

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {createPortal(
                <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-3 pointer-events-none">
                    {toasts.map(toast => (
                        <div
                            key={toast.id}
                            className={`
                                pointer-events-auto w-80 p-4 ${Theme.Geometry.RadiusLg} shadow-sm border
                                animate-in slide-in-from-bottom-5 fade-in duration-300
                                flex items-center gap-3
                                ${toast.type === 'error' ? 'border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/50' :
                                    toast.type === 'success' ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/50' :
                                        'border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90'}
                            `}
                        >
                            <div className={`shrink-0 ${toast.type === 'error' ? 'text-red-500' :
                                toast.type === 'success' ? 'text-emerald-500' :
                                    'text-blue-500'
                                }`}>
                                {toast.type === 'error' ? <AlertCircle size={18} /> :
                                    toast.type === 'success' ? <CheckCircle size={18} /> :
                                        <Info size={18} />}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${Theme.Colors.TextHighlight}`}>{toast.message}</p>
                            </div>
                            <IconButton
                                icon={<X size={14} />}
                                onClick={() => removeToast(toast.id)}
                                className="-mr-1 p-1.5"
                            />
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};
