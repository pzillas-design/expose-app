
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Theme, Button, Typo, Card } from './DesignSystem';
import { X, AlertTriangle } from 'lucide-react';

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
                        {/* Status Bar (Optional line at top for danger) */}
                        {options.variant === 'danger' && <div className="h-1 w-full bg-red-500" />}

                        <div className="p-8 flex flex-col items-center text-center">
                            {options.variant === 'danger' ? (
                                <div className="mb-6 w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
                                    <AlertTriangle size={24} strokeWidth={1.5} />
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <span className={Typo.Label}>{options.variant === 'primary' ? 'Aktion erforderlich' : 'System'}</span>
                                </div>
                            )}

                            <h3 className={`${Typo.H1} mb-3 px-4`}>{options.title || 'Bist du sicher?'}</h3>

                            {options.description && (
                                <p className={`${Typo.Body} text-zinc-500 dark:text-zinc-400 mb-8 max-w-[280px]`}>
                                    {options.description}
                                </p>
                            )}

                            <div className="flex flex-col w-full gap-2">
                                <Button
                                    variant={options.variant === 'danger' ? 'danger' : 'primary'}
                                    onClick={() => handleClose(true)}
                                    className="w-full"
                                >
                                    {options.confirmLabel || 'Bestätigen'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleClose(false)}
                                    className="w-full !text-zinc-400 hover:!text-zinc-600 dark:hover:!text-zinc-200"
                                >
                                    {options.cancelLabel || 'Abbrechen'}
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
