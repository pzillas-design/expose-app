
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Theme, Button, Typo, Card } from './DesignSystem';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

// --- Context ---

interface ConfirmOptions {
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
}

interface DialogContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useItemDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

// --- Component ---

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({});
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const handleClose = (result: boolean) => {
        setIsOpen(false);
        if (resolver.current) {
            resolver.current(result);
            resolver.current = null;
        }
    };

    return (
        <DialogContext.Provider value={{ confirm }}>
            {children}
            {isOpen && createPortal(
                <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 ${Theme.Effects.Overlay} animate-in fade-in duration-300`}>
                    <div className={`w-full max-w-[400px] ${Theme.Colors.ModalBg} ${Theme.Geometry.RadiusLg} shadow-2xl border ${Theme.Colors.Border} overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300`}>
                        <div className="p-8 flex flex-col items-center text-center">
                            {options.variant === 'danger' && (
                                <div className="mb-4 text-red-500">
                                    <Trash2 size={24} strokeWidth={1.5} />
                                </div>
                            )}

                            <h3 className={`${Typo.H1} mb-2`}>{options.title || 'Bist du sicher?'}</h3>

                            {options.description && (
                                <p className={`${Typo.Body} text-zinc-500 dark:text-zinc-400 mb-8 max-w-[320px]`}>
                                    {options.description}
                                </p>
                            )}

                            <div className="flex items-center justify-center gap-3 w-full">
                                <Button
                                    variant="secondary"
                                    onClick={() => handleClose(false)}
                                    className="flex-1"
                                >
                                    {options.cancelLabel || 'Abbrechen'}
                                </Button>
                                <Button
                                    variant={options.variant === 'danger' ? 'danger' : 'primary'}
                                    onClick={() => handleClose(true)}
                                    className="flex-1"
                                >
                                    {options.confirmLabel || 'Bestätigen'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DialogContext.Provider>
    );
};
