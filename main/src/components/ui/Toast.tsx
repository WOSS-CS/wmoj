"use client";

import { useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
}

export const toast = {
    success: (title: string, message?: string) => dispatch("success", title, message),
    error: (title: string, message?: string) => dispatch("error", title, message),
    info: (title: string, message?: string) => dispatch("info", title, message),
};

let toastSeq = 0;

const dispatch = (type: ToastType, title: string, message?: string) => {
    const event = new CustomEvent("toast", {
        detail: { id: `toast-${++toastSeq}-${Date.now()}`, type, title, message },
    });
    window.dispatchEvent(event);
};

const borderColor: Record<ToastType, string> = {
    success: "border-l-success",
    error: "border-l-error",
    info: "border-l-brand-primary",
};

export const ToastContainer = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    // Every pending auto-dismiss timer, so unmounting cannot leave one running
    // (it would call setState on an unmounted component and leak the closure).
    const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    useEffect(() => {
        const timers = timersRef.current;
        const handleToast = (e: Event) => {
            const detail = (e as CustomEvent).detail as ToastMessage;
            setToasts((prev) => [...prev, detail]);
            const timer = setTimeout(() => {
                timers.delete(timer);
                setToasts((prev) => prev.filter((t) => t.id !== detail.id));
            }, 5000);
            timers.add(timer);
        };

        window.addEventListener("toast", handleToast);
        return () => {
            window.removeEventListener("toast", handleToast);
            timers.forEach(clearTimeout);
            timers.clear();
        };
    }, []);

    return (
        // The live region is always mounted (even with zero toasts) so screen
        // readers are already observing it when the first toast is inserted —
        // a region created at the same moment as its content is not announced.
        // `toast.*` is this repo's only feedback channel for mutations, so this
        // is the sole confirmation an assistive-technology user ever gets.
        <div
            aria-live="polite"
            aria-atomic="false"
            className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
        >
            {toasts.map((t) => (
                <div
                    key={t.id}
                    role={t.type === "error" ? "alert" : "status"}
                    className={`pointer-events-auto min-w-[300px] bg-surface-1 border border-border border-l-4 ${borderColor[t.type]} rounded-lg p-4 shadow-lg`}
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-foreground">{t.title}</h4>
                            {t.message && <p className="text-sm text-text-muted mt-1">{t.message}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                            className="text-text-muted hover:text-foreground text-lg leading-none"
                            aria-label={`Dismiss notification: ${t.title}`}
                        >
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
