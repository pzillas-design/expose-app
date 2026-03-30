import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SEEN_TIPS_KEY = 'expose_seen_tips_v1';
const LAST_TIP_SHOWN_AT_KEY = 'expose_last_tip_shown_at_v1';
const ACTIVE_TIP_KEY = 'expose_active_tip_id_v1';
const TIP_COOLDOWN_MS = 10 * 60 * 1000;

interface ContextTipProps {
    storageKey: string;
    text?: string;
    content?: React.ReactNode;
    enabled?: boolean;
    onDismiss?: () => void;
    autoHideMs?: number;
    className?: string;
    placement?: 'auto' | 'above' | 'below';
    inline?: boolean;
    showArrow?: boolean;
    persistForSession?: boolean;
    anchorClassName?: string;
}

export const ContextTip: React.FC<ContextTipProps> = ({
    storageKey,
    text,
    content,
    enabled = true,
    onDismiss,
    autoHideMs = 12000,
    className = '',
    placement = 'auto',
    inline = false,
    showArrow = true,
    persistForSession = false,
    anchorClassName = 'absolute inset-0 pointer-events-none',
}) => {
    const [visible, setVisible] = useState(false);   // controls DOM presence
    const [fadeIn, setFadeIn] = useState(false);      // controls CSS opacity
    const [mounted, setMounted] = useState(false);
    const [anchorVisible, setAnchorVisible] = useState(true);
    const FADE_DURATION = 500; // ms — must match transition duration below
    const [portalStyle, setPortalStyle] = useState<{ top: number; left: number; arrowLeft: number; showBelow: boolean; align: 'left' | 'center' | 'right' }>({
        top: 0,
        left: 0,
        arrowLeft: 32,
        showBelow: true,
        align: 'center',
    });
    const anchorRef = useRef<HTMLSpanElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!enabled) {
            if (visible) {
                setFadeIn(false);
                window.setTimeout(() => setVisible(false), FADE_DURATION);
            }
            try {
                if (localStorage.getItem(ACTIVE_TIP_KEY) === storageKey) {
                    localStorage.removeItem(ACTIVE_TIP_KEY);
                }
            } catch {
                // ignore storage errors
            }
            return;
        }

        if (persistForSession) {
            const showId = window.setTimeout(() => {
                setVisible(true);
                window.requestAnimationFrame(() => window.requestAnimationFrame(() => setFadeIn(true)));
            }, 800);
            return () => window.clearTimeout(showId);
        }

        try {
            const seenTips = JSON.parse(localStorage.getItem(SEEN_TIPS_KEY) || '[]') as string[];
            if (localStorage.getItem(storageKey) === 'true' || seenTips.includes(storageKey)) return;

            const lastTipShownAt = Number(localStorage.getItem(LAST_TIP_SHOWN_AT_KEY) || '0');
            if (Date.now() - lastTipShownAt < TIP_COOLDOWN_MS) return;

            const activeTipId = localStorage.getItem(ACTIVE_TIP_KEY);
            if (activeTipId && activeTipId !== storageKey) return;
        } catch {
            // ignore storage errors and still show for this session
        }

        // Delay ≥5s so tips don't appear immediately on page load
        const delay = 5000 + Math.random() * 3000;
        const showId = window.setTimeout(() => {
            // Check if anchor is actually visible (prevents tips for hidden sidepanel)
            const anchor = anchorRef.current;
            if (anchor && !inline) {
                const rect = anchor.getBoundingClientRect();
                const styles = window.getComputedStyle(anchor);
                if (rect.width === 0 || rect.height === 0 || styles.display === 'none' || styles.visibility === 'hidden') return;
            }
            try {
                // Re-check cooldown and active tip — another tip may have claimed the slot during the delay
                const lastShown = Number(localStorage.getItem(LAST_TIP_SHOWN_AT_KEY) || '0');
                if (Date.now() - lastShown < TIP_COOLDOWN_MS) return;
                const active = localStorage.getItem(ACTIVE_TIP_KEY);
                if (active && active !== storageKey) return;

                localStorage.setItem(ACTIVE_TIP_KEY, storageKey);
                localStorage.setItem(LAST_TIP_SHOWN_AT_KEY, String(Date.now()));
            } catch {
                // ignore storage errors
            }
            setVisible(true);
            // Fade in after DOM mount (double rAF ensures first paint is opacity-0)
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => setFadeIn(true)));
        }, delay);

        return () => {
            window.clearTimeout(showId);
        };
    }, [storageKey, persistForSession, enabled]);

    useEffect(() => {
        if (persistForSession || !enabled) return;
        if (!visible) return;
        const hideId = window.setTimeout(() => {
            try {
                const seenTips = JSON.parse(localStorage.getItem(SEEN_TIPS_KEY) || '[]') as string[];
                if (!seenTips.includes(storageKey)) {
                    localStorage.setItem(SEEN_TIPS_KEY, JSON.stringify([...seenTips, storageKey]));
                }
                localStorage.setItem(storageKey, 'true');
                if (localStorage.getItem(ACTIVE_TIP_KEY) === storageKey) {
                    localStorage.removeItem(ACTIVE_TIP_KEY);
                }
            } catch {
                // ignore storage errors
            }
            fadeOut(() => onDismiss?.());
        }, autoHideMs);

        return () => window.clearTimeout(hideId);
    }, [visible, autoHideMs, onDismiss, storageKey, persistForSession, enabled]);

    useLayoutEffect(() => {
        if (!visible || inline || !mounted) return;

        const updatePosition = () => {
            const anchor = anchorRef.current;
            const tip = tipRef.current;
            if (!anchor) return;

            const anchorRect = anchor.getBoundingClientRect();
            const anchorStyles = window.getComputedStyle(anchor);
            const isRenderable =
                anchorRect.width > 0 &&
                anchorRect.height > 0 &&
                anchorStyles.display !== 'none' &&
                anchorStyles.visibility !== 'hidden' &&
                anchorStyles.opacity !== '0';

            setAnchorVisible(isRenderable);
            if (!isRenderable || !tip) return;

            const tipRect = tip.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const horizontalPadding = 16;
            const verticalGap = 10;

            const spaceAbove = anchorRect.top - horizontalPadding;
            const spaceBelow = viewportHeight - anchorRect.bottom - horizontalPadding;
            const shouldShowBelow =
                placement === 'below'
                    ? true
                    : placement === 'above'
                        ? false
                        : spaceBelow >= tipRect.height + verticalGap || spaceBelow >= spaceAbove;
            const idealLeft = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2;
            const left = Math.min(
                Math.max(horizontalPadding, idealLeft),
                viewportWidth - tipRect.width - horizontalPadding
            );
            const align: 'left' | 'center' | 'right' =
                idealLeft < horizontalPadding + 1
                    ? 'left'
                    : idealLeft > viewportWidth - tipRect.width - horizontalPadding - 1
                        ? 'right'
                        : 'center';
            const top = shouldShowBelow
                ? Math.min(anchorRect.bottom + verticalGap, viewportHeight - tipRect.height - horizontalPadding)
                : Math.max(horizontalPadding, anchorRect.top - tipRect.height - verticalGap);
            const arrowLeft = Math.min(
                Math.max(18, anchorRect.left + anchorRect.width / 2 - left),
                tipRect.width - 18
            );

            setPortalStyle({ top, left, arrowLeft, showBelow: shouldShowBelow, align });
        };

        const frameId = window.requestAnimationFrame(updatePosition);
        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => updatePosition());
            if (anchorRef.current) resizeObserver.observe(anchorRef.current);
            if (tipRef.current) resizeObserver.observe(tipRef.current);
        }

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.cancelAnimationFrame(frameId);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [visible, inline, mounted, placement, anchorClassName]);

    const fadeOut = (callback?: () => void) => {
        setFadeIn(false);
        window.setTimeout(() => {
            setVisible(false);
            callback?.();
        }, FADE_DURATION);
    };

    const handleClose = () => {
        if (persistForSession) {
            fadeOut(() => onDismiss?.());
            return;
        }
        try {
            const seenTips = JSON.parse(localStorage.getItem(SEEN_TIPS_KEY) || '[]') as string[];
            if (!seenTips.includes(storageKey)) {
                localStorage.setItem(SEEN_TIPS_KEY, JSON.stringify([...seenTips, storageKey]));
            }
            localStorage.setItem(storageKey, 'true');
            if (localStorage.getItem(ACTIVE_TIP_KEY) === storageKey) {
                localStorage.removeItem(ACTIVE_TIP_KEY);
            }
        } catch {
            // ignore storage errors
        }
        fadeOut(() => onDismiss?.());
    };

    const shellClassName =
        'rounded-[18px] border border-orange-300 bg-orange-100 text-zinc-900 dark:border-orange-500/20 dark:bg-[rgba(48,24,8,0.94)] dark:text-zinc-100';
    const shadowClassName =
        'shadow-[0_6px_18px_rgba(15,23,42,0.10)] dark:shadow-[0_10px_24px_rgba(0,0,0,0.28)]';
    const cardBody = (
        <>
            {content ?? <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{text}</p>}
        </>
    );

    if (!visible) {
        return inline ? null : <span ref={anchorRef} className={anchorClassName} aria-hidden="true" />;
    }

    if (inline) {
        return (
            <button
                type="button"
                onClick={handleClose}
                className={`relative mt-2 w-full px-4 py-3 text-left transition-all duration-500 hover:scale-[0.995] hover:opacity-40 ${shellClassName} ${shadowClassName} ${className}`}
                style={{ opacity: fadeIn ? 1 : 0 }}
            >
                {cardBody}
            </button>
        );
    }

    const showBelow = portalStyle.showBelow;
    const arrowClassName = showBelow
        ? 'absolute -top-[6px] h-3 w-3 rotate-45 border-l border-t'
        : 'absolute -bottom-[6px] h-3 w-3 rotate-[225deg] border-l border-t';

    return (
        <>
            <span ref={anchorRef} className={anchorClassName} aria-hidden="true" />
            {mounted && anchorVisible && createPortal(
                <button
                    type="button"
                    onClick={handleClose}
                    ref={tipRef}
                    className={`fixed z-[120] overflow-visible px-4 py-3 text-left hover:opacity-40 ${shellClassName} ${shadowClassName} ${className}`}
                    style={{
                        top: portalStyle.top,
                        left: portalStyle.left,
                        width: 'min(264px, calc(100vw - 32px))',
                        transformOrigin: portalStyle.align === 'left' ? 'left top' : portalStyle.align === 'right' ? 'right top' : 'center top',
                        opacity: fadeIn ? 1 : 0,
                        transition: `opacity ${FADE_DURATION}ms ease-in-out`,
                    }}
                >
                    {cardBody}
                    {showArrow && (
                        <div
                            className={`${arrowClassName} border-orange-300 bg-orange-100 dark:border-orange-500/20 dark:bg-[rgba(48,24,8,0.94)]`}
                            style={{ left: portalStyle.arrowLeft - 6 }}
                        />
                    )}
                </button>,
                document.body
            )}
        </>
    );
};

interface ContextTipChipProps {
    icon: React.ReactNode;
    label?: string;
}

export const ContextTipChip: React.FC<ContextTipChipProps> = ({ icon, label }) => (
    <span className="inline-flex translate-y-[-0.02em] items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-sm font-medium leading-none text-orange-800 align-middle dark:bg-orange-400/10 dark:text-orange-300">
        <span className="text-orange-700 dark:text-orange-300">{icon}</span>
        {label ? <span>{label}</span> : null}
    </span>
);
