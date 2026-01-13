
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Theme, Button, Typo, Card, Input } from './DesignSystem';
import { X, AlertTriangle, Trash, Edit3 } from 'lucide-react';

// --- Context ---

interface ConfirmOptions {
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
}

interface PromptOptions extends ConfirmOptions {
    value?: string;
    placeholder?: string;
}

interface DialogContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    prompt: (options: PromptOptions) => Promise<string | null>;
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
    const [mode, setMode] = useState<'confirm' | 'prompt'>('confirm');
    const [options, setOptions] = useState<PromptOptions>({});
    const [inputValue, setInputValue] = useState('');
    const resolver = useRef<((value: any) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => {
        setMode('confirm');
        setOptions(opts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const prompt = useCallback((opts: PromptOptions) => {
        setMode('prompt');
        setOptions(opts);
        setInputValue(opts.value || '');
        setIsOpen(true);
        return new Promise<string | null>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const handleClose = (result: boolean) => {
        setIsOpen(false);
        if (resolver.current) {
            if (mode === 'prompt') {
                resolver.current(result ? inputValue : null);
            } else {
                resolver.current(result);
            }
            resolver.current = null;
        }
    };

    return (
        <DialogContext.Provider value={{ confirm, prompt }}>
            {children}
            {isOpen && createPortal(
                <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 ${Theme.Effects.Overlay} animate-in fade-in duration-300`}>
                    <div className={`w-full max-w-[340px] ${Theme.Colors.ModalBg} ${Theme.Geometry.RadiusLg} shadow-2xl border ${Theme.Colors.Border} overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300`}>
                        <div className="p-8 pb-6 flex flex-col items-center text-center">
                            {options.variant === 'danger' && (
                                <div className="mb-4 text-red-500">
                                    <Trash size={28} strokeWidth={1.5} />
                                </div>
                            )}

                            <h3 className={`${Typo.H1} text-xl mb-3`}>{options.title || 'Bist du sicher?'}</h3>

                            {options.description && (
                                <p className={`${Typo.Body} text-zinc-500 dark:text-zinc-400 leading-relaxed`}>
                                    {options.description}
                                </p>
                            )}

                            {mode === 'prompt' && (
                                <div className="w-full mt-6 mb-2">
                                    <Input
                                        autoFocus
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={options.placeholder}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleClose(true);
                                            if (e.key === 'Escape') handleClose(false);
                                        }}
                                        className="text-center h-12"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="px-6 pb-8 flex flex-col gap-3">
                            <Button
                                variant={options.variant === 'danger' ? 'danger' : (options.variant || 'primary')}
                                onClick={() => handleClose(true)}
                                className="w-full h-12 text-sm font-bold"
                            >
                                {options.confirmLabel || 'Bestätigen'}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => handleClose(false)}
                                className="w-full h-12 text-sm font-bold border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-white/5"
                            >
                                {options.cancelLabel || 'Abbrechen'}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DialogContext.Provider>
    );
};
