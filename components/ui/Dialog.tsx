
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
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className={`w-full max-w-md ${Theme.Colors.ModalBg} ${Theme.Geometry.RadiusLg} shadow-2xl border ${Theme.Colors.Border} p-6 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200`}>
                        <div className="flex items-start gap-4">
                            {options.variant === 'danger' && (
                                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                    <AlertTriangle size={20} />
                                </div>
                            )}
                            <div className="flex-1">
                                <h3 className={`${Typo.H2} mb-2`}>{options.title || 'Are you sure?'}</h3>
                                {options.description && (
                                    <p className={`${Typo.Body} text-zinc-500 mb-6`}>{options.description}</p>
                                )}

                                <div className="flex items-center justify-end gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleClose(false)}
                                    >
                                        {options.cancelLabel || 'Cancel'}
                                    </Button>
                                    <Button
                                        variant={options.variant === 'danger' ? 'danger' : 'primary'}
                                        onClick={() => handleClose(true)}
                                    >
                                        {options.confirmLabel || 'Confirm'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DialogContext.Provider>
    );
};
