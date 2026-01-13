
import React, { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

// --- 0. CENTRAL THEME CONFIGURATION ---
// STRICT ZINC PALETTE - CONSOLIDATED

export const Theme = {
    Colors: {
        // Structural Backgrounds
        CanvasBg: "bg-zinc-50 dark:bg-zinc-950",      // App Background
        PanelBg: "bg-white dark:bg-zinc-900",        // Sidebars, Sheets
        ModalBg: "bg-white dark:bg-zinc-900",        // Modals

        // Interactive Surfaces (New Standard)
        Surface: "bg-white dark:bg-zinc-900",
        SurfaceSubtle: "bg-zinc-50 dark:bg-zinc-800/50",
        SurfaceHover: "hover:bg-zinc-50 dark:hover:bg-zinc-800/10",
        SurfaceActive: "bg-zinc-100 dark:bg-zinc-800",

        // Borders
        Border: "border-zinc-200 dark:border-zinc-800",
        BorderSubtle: "border-zinc-100 dark:border-zinc-800/50",

        // Grid (Handled via CSS var in index.html)
        GridDot: "var(--grid-dot)",

        // Text Colors
        TextPrimary: "text-zinc-900 dark:text-zinc-100",  // Almost Black / Almost White
        TextSecondary: "text-zinc-500",                   // Unified Mid Gray for both modes
        TextHighlight: "text-black dark:text-white",       // Pure Black / Pure White
        TextSubtle: "text-zinc-400 dark:text-zinc-500",

        // Interactive/Accents
        AccentBg: "bg-black dark:bg-white",
        AccentFg: "text-white dark:text-black",

        // Status
        Danger: "text-red-600 dark:text-red-400",
        DangerBg: "bg-red-50 dark:bg-red-900/20",
        DangerBorder: "border-red-200 dark:border-red-800",

        // Brand
        Terracotta: "text-[#CC673F]",
        TerracottaBg: "bg-[#CC673F]",
        TerracottaBorder: "border-[#CC673F]",
        TerracottaHex: "#CC673F",
    },
    Effects: {
        Glass: "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm", // Slight blur for floating elements
        Overlay: "bg-black/40", // Dimming without blur
        Transition: "transition-all duration-200 ease-in-out",
        Shadow: "shadow-sm",
    },
    Geometry: {
        // TIGHTER RADII AS REQUESTED
        Radius: "rounded-md",     // 6px - Standard for inputs, buttons, list items
        RadiusLg: "rounded-lg",   // 8px - For containers, modals, panels (was xl/2xl)
        RadiusFull: "rounded-full",
    },
    Fonts: {
        Main: "font-sans",
        Mono: "font-mono"
    }
};

// --- 1. GLOBAL TYPOGRAPHY STYLES ---

export const Typo = {
    // Big Numbers / Hero Text
    Display: `text-5xl font-light tracking-tighter ${Theme.Colors.TextHighlight} ${Theme.Fonts.Mono}`,

    // Main Headers (Modals, Large Titles)
    H1: `text-lg font-medium tracking-tight ${Theme.Colors.TextHighlight}`,

    // Section Headers / Card Titles
    H2: `text-base font-medium tracking-tight ${Theme.Colors.TextHighlight}`,

    // Subtitles / Form Labels
    H3: `text-sm font-medium ${Theme.Colors.TextPrimary}`,

    // Section Labels (The "Eyebrow" style)
    Label: `text-[10px] font-bold uppercase tracking-widest ${Theme.Colors.TextSecondary}`,

    // Button Labels (Standardized for all buttons)
    ButtonLabel: `text-[10px] font-bold uppercase tracking-widest`,

    // Tiny Badges
    LabelSmall: `text-[9px] font-bold uppercase tracking-widest`,

    // Standard UI Text
    Body: `text-xs font-normal ${Theme.Colors.TextPrimary} leading-relaxed`,

    // Micro Labels
    Micro: `text-[11px] font-normal ${Theme.Colors.TextSecondary}`,

    // Technical/Numbers
    Mono: `${Theme.Fonts.Mono} text-xs ${Theme.Colors.TextSecondary}`
};

// --- 2. REUSABLE COMPONENTS ---

// -- Tooltip --
interface TooltipProps {
    text: string;
    children: React.ReactElement<any>;
    side?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, side = 'bottom' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const handleMouseEnter = (e: React.MouseEvent) => {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        // Dynamic estimate of tooltip width based on text length to allow closer edge alignment
        const padding = 8;
        const charWidth = 6; // Average width per character in pixels for text-[10px]
        const estimatedHalfWidth = Math.max(20, (text.length * charWidth) / 2 + 10);

        let left = rect.left + rect.width / 2;
        const top = side === 'bottom' ? rect.bottom + 8 : rect.top - 8;

        // Boundary check: nudge left if too close to edges
        if (left < estimatedHalfWidth + padding) {
            left = estimatedHalfWidth + padding;
        } else if (left > window.innerWidth - estimatedHalfWidth - padding) {
            left = window.innerWidth - estimatedHalfWidth - padding;
        }

        setCoords({ top, left });
        setIsVisible(true);
        if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    };

    const handleMouseLeave = (e: React.MouseEvent) => {
        setIsVisible(false);
        if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    };

    const childWithRef = React.cloneElement(children, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave
    });

    return (
        <>
            {childWithRef}
            {isVisible && createPortal(
                <div
                    className={`
                        fixed z-[100] px-2.5 py-1.5 ${Theme.Geometry.Radius} pointer-events-none animate-in fade-in zoom-in-95 duration-100
                        bg-white dark:bg-zinc-950
                        text-zinc-900 dark:text-zinc-100
                        border border-zinc-200 dark:border-zinc-800 shadow-md
                    `}
                    style={{
                        top: coords.top,
                        left: coords.left,
                        transform: `translate(-50%, ${side === 'bottom' ? '0' : '-100%'})`
                    }}
                >
                    <div className="text-[10px] font-medium whitespace-nowrap tracking-wide">
                        {text}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

// -- Section Header --
export const SectionHeader: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`mb-3 ${className}`}>
        <span className={Typo.Label}>{children}</span>
    </div>
);

// -- Modal Header --
export const ModalHeader: React.FC<{ title: string, onClose: () => void }> = ({ title, onClose }) => (
    <div className={`p-6 flex items-center justify-between shrink-0 border-b border-transparent`}>
        <span className={Typo.H1}>{title}</span>
        <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} tooltip="Close" />
    </div>
);

// -- Buttons --
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    icon?: React.ReactNode;
    isLoading?: boolean;
    tooltip?: string;
}

export const Button: React.FC<ButtonProps> = ({
    children, variant = 'primary', icon, isLoading, className = '', disabled, tooltip, ...props
}) => {
    // Structural classes
    const base = `flex items-center justify-center gap-2 ${Theme.Geometry.Radius} ${Theme.Effects.Transition} active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0`;

    // Aesthetic classes
    const variants = {
        primary: `${Theme.Colors.AccentBg} ${Theme.Colors.AccentFg} hover:opacity-90 h-11 px-6 ${Typo.ButtonLabel}`,

        secondary: `bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 h-11 px-6 ${Typo.ButtonLabel}`,

        danger: `${Theme.Colors.DangerBg} ${Theme.Colors.Danger} hover:bg-red-500/20 h-11 px-6 ${Typo.ButtonLabel}`,

        ghost: `${Theme.Colors.SurfaceHover} ${Theme.Colors.TextSecondary} hover:text-black dark:hover:text-white h-10 px-4 ${Typo.ButtonLabel}`
    };

    const btn = (
        <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || isLoading} {...props}>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {!isLoading && icon}
            {children}
        </button>
    );

    if (tooltip && !disabled && !isLoading) {
        return <Tooltip text={tooltip}>{btn}</Tooltip>;
    }
    return btn;
};

// -- Icon Button --
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    active?: boolean;
    tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, active, tooltip, className = '', ...props }) => {
    const btn = (
        <button
            className={`
                w-10 h-10 flex items-center justify-center ${Theme.Geometry.Radius} ${Theme.Effects.Transition} shrink-0 
                ${active
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
                } 
                ${className}
            `}
            {...props}
        >
            {React.cloneElement(icon as React.ReactElement, { className: `w-4 h-4 ${(icon as React.ReactElement).props.className || ''}` })}
        </button>
    );

    if (tooltip) {
        return <Tooltip text={tooltip}>{btn}</Tooltip>;
    }
    return btn;
};

// -- Inputs --
export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => (
    <input
        ref={ref}
        className={`w-full bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-800 border ${Theme.Geometry.Radius} px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500/10 focus:border-zinc-300 dark:focus:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 ${Theme.Effects.Transition} placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ${Typo.Body} ${className}`}
        {...props}
    />
));

// -- Table Input (Clean inline editing) --
export const TableInput = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => (
    <input
        ref={ref}
        className={`w-full bg-transparent border border-transparent rounded px-2 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800 ${Theme.Effects.Transition} ${Typo.Body} ${className}`}
        {...props}
    />
));

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...props }, ref) => (
    <textarea
        ref={ref}
        className={`w-full bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-800 border ${Theme.Geometry.Radius} p-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500/10 focus:border-zinc-300 dark:focus:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 resize-none ${Theme.Effects.Transition} placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ${Typo.Body} ${className}`}
        {...props}
    />
));

// -- Card/Box --
export const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <div
        onClick={onClick}
        className={`${Theme.Colors.Surface} ${Theme.Colors.Border} border ${Theme.Geometry.RadiusLg} ${className}`}
    >
        {children}
    </div>
);

// -- Progress Bar (Global Loader) --
export const ProgressBar: React.FC<{ progress: number, isVisible: boolean }> = ({ progress, isVisible }) => (
    <div className={`fixed top-0 left-0 right-0 z-[200] h-0.5 pointer-events-none transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div
            className="h-full bg-zinc-900 dark:bg-white transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
        />
    </div>
);
