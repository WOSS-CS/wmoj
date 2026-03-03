"use client";

import { ReactNode } from "react";

type BadgeVariant = "success" | "error" | "warning" | "info" | "easy" | "medium" | "hard" | "neutral";

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    success: "bg-success/10 text-success",
    error: "bg-error/10 text-error",
    warning: "bg-warning/10 text-warning",
    info: "bg-blue-500/10 text-blue-400",
    easy: "bg-success/10 text-success",
    medium: "bg-warning/10 text-warning",
    hard: "bg-error/10 text-error",
    neutral: "bg-surface-2 text-text-muted",
};

export const Badge = ({ children, variant = "neutral", className = "" }: BadgeProps) => {
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantStyles[variant]} ${className}`}
        >
            {children}
        </span>
    );
};
