'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

const FOCUSABLE =
    'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
    /** When false the modal renders nothing (and never touches focus). */
    open: boolean;
    /** Called on Escape, backdrop click and the built-in close button. */
    onClose: () => void;
    /** Accessible name. Rendered as the visible heading unless `hideTitle`. */
    title: string;
    /** Optional sub-heading; also becomes the dialog's accessible description. */
    description?: string;
    /** Hide the heading visually but keep it as the accessible name. */
    hideTitle?: boolean;
    /** Body content. */
    children: ReactNode;
    /** Optional footer, rendered in a bordered strip below the scroll area. */
    footer?: ReactNode;
    /** Extra classes for the dialog panel (use this for width, e.g. `max-w-2xl`). */
    className?: string;
}

/**
 * The one dialog shell for this app.
 *
 * Every modal here used to be a bare `<div>`: no `role="dialog"`, no focus
 * move, no focus trap, no Escape, and in one case a full-viewport
 * `role="button"` backdrop that landed ahead of the dialog in tab order. This
 * component is the fix — use it instead of hand-rolling an overlay.
 *
 * Behaviour:
 * - `role="dialog" aria-modal="true"` labelled by the title (and described by
 *   `description` when given).
 * - Focus moves to the panel on open and is restored to the previously focused
 *   element on close.
 * - Tab and Shift+Tab wrap inside the panel.
 * - Escape closes. The backdrop is inert to keyboard users (`aria-hidden`, no
 *   tabIndex) but still closes on click, which is the expected mouse affordance.
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    hideTitle = false,
    children,
    footer,
    className = 'max-w-md',
}: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
        }
        if (e.key !== 'Tab') return;

        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null || el === document.activeElement,
        );
        if (focusable.length === 0) {
            e.preventDefault();
            panel.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        // Focus the panel itself rather than its first control: a dialog's name
        // and description should be read before the user is dropped on a button.
        panelRef.current?.focus();
        return () => {
            previouslyFocused?.focus?.();
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Inert backdrop — click-to-close for mice, invisible to keyboards
                and screen readers. Escape is the keyboard equivalent. */}
            <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={onClose} />

            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className={`relative w-full ${className} bg-surface-1 border border-border rounded-xl shadow-lg flex flex-col max-h-[90vh] focus:outline-none`}
            >
                {/* With no visible title there is nothing to rule off, so the
                    header collapses to a bare close affordance rather than an
                    empty bordered strip. */}
                <div
                    className={
                        hideTitle
                            ? 'flex items-start justify-end px-3 pt-3'
                            : 'flex items-start justify-between gap-4 px-5 py-3 border-b border-border'
                    }
                >
                    <div className={hideTitle ? 'sr-only' : ''}>
                        <h2 id={titleId} className="text-base font-semibold text-foreground">
                            {title}
                        </h2>
                        {description && (
                            <p id={descriptionId} className="text-xs text-text-muted mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-shrink-0 text-text-muted hover:text-foreground rounded-md"
                        aria-label={`Close ${title}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className={`flex-1 overflow-y-auto px-5 pb-5 ${hideTitle ? 'pt-1' : 'pt-5'}`}>{children}</div>

                {footer && (
                    <div className="px-5 py-3 border-t border-border flex justify-end gap-2">{footer}</div>
                )}
            </div>
        </div>
    );
}

export default Modal;
