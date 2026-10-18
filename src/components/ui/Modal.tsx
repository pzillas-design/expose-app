import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Theme, Typo, RoundIconButton } from './DesignSystem';
import { useModalStack } from './ModalStack';

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
 * - Standardized backdrop (bg-black/60)
 * - Consistent container (Theme.Colors.ModalBg, Theme.Colors.Border, Theme.Geometry.RadiusLg)
 * - Optional header with title + close button (px-6 pt-6 pb-2, text-xl)
 * - Content area with customizable padding
 * - Optional footer area
 * 
 * @example
 * <Modal isOpen={isOpen} onClose={onClose} title="My Modal">
 * <div className="p-8">Content here</div>
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
    const { register } = useModalStack();

    // Register in the global stack + handle ESC — both wired to same onClose
    useEffect(() => {
        if (!isOpen) return;
        const deregister = register(onClose);
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', handler, { capture: true });
        return () => {
            deregister();
            document.removeEventListener('keydown', handler, { capture: true });
        };
    }, [isOpen, onClose, register]);

    if (!isOpen) return null;

    /*
        In den Body gehaengt, nicht dort gerendert, wo der Aufruf steht.

        `position: fixed` bezieht sich auf das Fenster -- ausser ein Vorfahr
        traegt eine Transformation, dann auf diesen. Das Blatt der
        Detailansicht tut das waehrend seiner Einblendung, und ein Fenster,
        das darin aufging, war auf Panelbreite eingequetscht statt mittig im
        Bildschirm. Ein Portal macht diese Abhaengigkeit ein fuer alle Mal weg.
    */
    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/*
                Der Grund tritt zurueck, statt nur dunkler zu werden: etwas
                Weichzeichner dazu, wie unter der Navigationsleiste. Das
                Fenster liegt dann sichtbar OBEN, und was darunter steht,
                bleibt als Zusammenhang erkennbar, ohne zu konkurrieren.
            */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />

            {/* Modal Container */}
            <div
                className={`
            relative w-full ${maxWidthClasses[maxWidth]}
            ${Theme.Colors.PanelBg}
            ${Theme.Geometry.RadiusXl}
            flex flex-col max-h-[90vh] overflow-hidden
            animate-[view-in_240ms_cubic-bezier(0.16,1,0.3,1)_backwards]
            ${Theme.Effects.ShadowLg}
            ${className}
        `}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {showHeader && (
                    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
                        {headerContent || (
                            <h2 className={`${Typo.H2} text-xl ${Theme.Colors.TextHighlight}`}>
                                {title}
                            </h2>
                        )}
                        {/* Derselbe Knopf wie ueberall sonst: 40 Pixel sichtbar,
                            52 treffbar. Vorher ein kleinerer Sonderfall nur
                            fuer Fenster. */}
                        <RoundIconButton
                            icon={<X className="w-[18px] h-[18px]" />}
                            onClick={onClose}
                            variant="ghost"
                            className="-mr-2"
                        />
                    </div>
                )}

                {/* Content */}
                {children}

                {/* Footer */}
                {footer && <div>{footer}</div>}
            </div>
        </div>,
        document.body
    );
};
