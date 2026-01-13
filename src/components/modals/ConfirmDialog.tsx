import React from 'react';
import { createPortal } from 'react-dom';
import { Trash } from 'lucide-react';
import { Button, Theme, Typo } from '@/components/ui/DesignSystem';

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
        className={`w-full max-w-[340px] ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-6 flex flex-col items-center text-center">
          {variant === 'danger' && (
            <div className="mb-4 text-red-500">
              <Trash size={28} strokeWidth={1.5} />
            </div>
          )}
          <h3 className={`${Typo.H1} text-xl mb-3`}>{title}</h3>
          <p className={`${Typo.Body} text-zinc-500 dark:text-zinc-400 leading-relaxed`}>
            {description}
          </p>
        </div>

        <div className="px-6 pb-8 flex flex-col gap-3">
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="w-full h-12 text-sm font-bold"
          >
            {confirmLabel}
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="w-full h-12 text-sm font-bold border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-white/5"
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
