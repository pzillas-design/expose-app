
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Theme, Button, Typo, Input, IconButton } from './DesignSystem';
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
 <div
 className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200"
 onClick={() => handleClose(false)}
 >
 {/* Backdrop */}
 <div className="absolute inset-0 bg-zinc-950/60" />

 {/* Modal Container - Using new standard design */}
 <div
 className={`
 relative w-full max-w-md
 ${Theme.Colors.ModalBg}
 border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg}
 flex flex-col
 animate-in zoom-in-95 duration-200
 `}
 onClick={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 onMouseUp={(e) => e.stopPropagation()}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-6 pt-6 pb-2">
 <h2 className={`${Typo.H2} text-xl ${Theme.Colors.TextHighlight}`}>
 {options.title || 'Bist du sicher?'}
 </h2>
 <IconButton icon={<X className="w-5 h-5" />} onClick={() => handleClose(false)} />
 </div>

 {/* Content */}
 <div className="px-6 pb-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
 {options.description && (
 <p className={`text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed`}>
 {options.description}
 </p>
 )}

 {mode === 'prompt' && (
 <div className="relative">
 <Input
 autoFocus
 value={inputValue}
 onChange={(e) => setInputValue(e.target.value)}
 placeholder={options.placeholder}
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleClose(true);
 if (e.key === 'Escape') handleClose(false);
 }}
 className="h-12"
 />
 {options.suffix && (
 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">
 {options.suffix}
 </div>
 )}
 </div>
 )}

 {/* Buttons - Only Primary Action */}
 <div className="flex flex-col gap-3 mt-2">
 <Button
 variant="primary"
 onClick={() => handleClose(true)}
 className={`w-full h-11 ${options.variant === 'danger' ? '!bg-red-500 hover:!bg-red-600 !text-white !border-red-500' : ''}`}
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
