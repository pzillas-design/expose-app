
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
    suffix?: string;
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
                    <div className={`w-full max-w-[340px] ${Theme.Colors.ModalBg} ${Theme.Geometry.RadiusLg} shadow-md border ${Theme.Colors.Border} overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300`}>
                        <div className="p-10 pb-6 flex flex-col items-center text-center">
                            {options.variant === 'danger' && (
                                <div className="mb-6 text-red-500">
                                    <Trash size={32} strokeWidth={1} />
                                </div>
                            )}

                            <h3 className={`${Typo.H1} text-2xl font-bold mb-4`}>{options.title || 'Bist du sicher?'}</h3>

                            {options.description && (
                                <p className={`text-base text-zinc-600 dark:text-zinc-400 leading-relaxed`}>
                                    {options.description}
                                </p>
                            )}

                            {mode === 'prompt' && (
                                <div className="w-full mt-6 mb-2 relative">
                                    <Input
                                        autoFocus
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={options.placeholder}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleClose(true);
                                            if (e.key === 'Escape') handleClose(false);
                                        }}
                                        className="text-center h-14 text-xl font-bold border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 ring-0"
                                    />
                                    {options.suffix && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">
                                            {options.suffix}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-10 pb-10 flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => handleClose(false)}
                                className="flex-1 h-14 uppercase tracking-widest font-bold bg-zinc-50/80 border-none text-zinc-500 hover:dark:text-white"
                            >
                                {options.cancelLabel || 'Cancel'}
                            </Button>
                            <Button
                                variant={options.variant === 'danger' ? 'secondary' : (options.variant || 'primary')}
                                onClick={() => handleClose(true)}
                                className={`flex-1 h-14 uppercase tracking-widest font-bold ${options.variant === 'danger' ? 'bg-red-50/80 text-red-500 hover:bg-red-100 border-none' : ''}`}
                            >
                                {options.confirmLabel || 'Bestätigen'}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DialogContext.Provider>
    );
};
