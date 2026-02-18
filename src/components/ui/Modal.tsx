import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Theme, Typo, IconButton } from './DesignSystem';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
    showHeader?: boolean;
    headerContent?: ReactNode;
    footer?: ReactNode;
    className?: string;
}

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
};

/**
 * Universal Modal Component
 * 
 * Provides consistent styling for all modals in the application:
 * - Standardized backdrop (bg-zinc-950/60)
 * - Consistent container (Theme.Colors.ModalBg, Theme.Colors.Border, Theme.Geometry.RadiusLg)
 * - Optional header with title + close button (px-6 pt-6 pb-2, text-xl)
 * - Content area with customizable padding
 * - Optional footer area
 * 
 * @example
 * <Modal isOpen={isOpen} onClose={onClose} title="My Modal">
 *   <div className="p-8">Content here</div>
 * </Modal>
 */
export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'md',
    showHeader = true,
    headerContent,
    footer,
    className = '',
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-zinc-950/60" />

            {/* Modal Container */}
            <div
                className={`
                    relative w-full ${maxWidthClasses[maxWidth]}
                    ${Theme.Colors.ModalBg}
                    border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg}
                    shadow-2xl flex flex-col max-h-[90vh] overflow-hidden
                    animate-in zoom-in-95 duration-200
                    ${className}
                `}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {showHeader && (
                    <div className="flex items-center justify-between px-6 pt-6 pb-2">
                        {headerContent || (
                            <h2 className={`${Typo.H2} text-xl ${Theme.Colors.TextHighlight}`}>
                                {title}
                            </h2>
                        )}
                        <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                    </div>
                )}

                {/* Content */}
                {children}

                {/* Footer */}
                {footer && <div>{footer}</div>}
            </div>
        </div>
    );
};
