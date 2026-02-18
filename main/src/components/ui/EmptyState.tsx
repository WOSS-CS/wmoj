"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
    icon?: ReactNode;
    title?: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

export const EmptyState = ({
    icon,
    title = "No data found",
    description,
    action,
    className = "",
}: EmptyStateProps) => {
    return (
        <div
            className={`glass-panel border-dashed border-border flex flex-col items-center justify-center p-12 text-center ${className}`}
        >
            {icon ? (
                <div className="text-text-muted mb-4">{icon}</div>
            ) : (
                <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mb-4">
                    <svg
                        className="w-8 h-8 text-text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                </div>
            )}
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            {description && <p className="text-text-muted max-w-sm mb-6">{description}</p>}
            {action}
        </div>
    );
};
