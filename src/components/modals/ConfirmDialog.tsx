
import React from 'react';
import { createPortal } from 'react-dom';
import { Theme, Typo, Button, ModalHeader } from './ui/DesignSystem';
import { Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'primary'
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center animate-in fade-in duration-200 p-4"
        onClick={onCancel}
    >
      <div 
        className={`w-full max-w-sm ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                    <Trash2 className="w-5 h-5" />
                </div>
                <h3 className={Typo.H2}>{title}</h3>
            </div>
            <p className={`${Typo.Body} text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed`}>
                {description}
            </p>
        </div>

        <div className={`p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t ${Theme.Colors.Border} flex justify-end gap-3`}>
            <Button variant="secondary" onClick={onCancel} className="w-24 text-xs">
                {cancelLabel}
            </Button>
            <Button 
                variant={variant} 
                onClick={onConfirm}
                className="w-24 text-xs"
            >
                {confirmLabel}
            </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
