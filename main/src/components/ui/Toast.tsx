"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
}

// Simple Toast Manager (Event Emitter compatible)
export const toast = {
    success: (title: string, message?: string) => dispatch("success", title, message),
    error: (title: string, message?: string) => dispatch("error", title, message),
    info: (title: string, message?: string) => dispatch("info", title, message),
};

const dispatch = (type: ToastType, title: string, message?: string) => {
    const event = new CustomEvent("toast", {
        detail: { id: Math.random().toString(36).substr(2, 9), type, title, message },
    });
    window.dispatchEvent(event);
};

export const ToastContainer = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        const handleToast = (e: Event) => {
            const detail = (e as CustomEvent).detail as ToastMessage;
            setToasts((prev) => [...prev, detail]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== detail.id));
            }, 5000);
        };

        window.addEventListener("toast", handleToast);
        return () => window.removeEventListener("toast", handleToast);
    }, []);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`
            pointer-events-auto min-w-[300px] glass-panel p-4 animate-slide-in-right
            border-l-4 overflow-hidden relative
            ${t.type === "success" ? "border-l-brand-primary" : ""}
            ${t.type === "error" ? "border-l-red-500" : ""}
            ${t.type === "info" ? "border-l-blue-500" : ""}
          `}
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-white">{t.title}</h4>
                            {t.message && <p className="text-sm text-gray-400 mt-1">{t.message}</p>}
                        </div>
                        <button
                            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                            className="text-gray-500 hover:text-white"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
