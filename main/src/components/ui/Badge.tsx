"use client";

import { ReactNode } from "react";

type BadgeVariant = "success" | "error" | "warning" | "info" | "easy" | "medium" | "hard" | "neutral";

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export const Badge = ({ children, variant = "neutral", className = "" }: BadgeProps) => {
    const getVariantStyles = (v: BadgeVariant) => {
        switch (v) {
            case "success":
                return "bg-[#2ea043]/15 text-[#2ea043] border border-[#2ea043]/20";
            case "error":
                return "bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/20";
            case "warning":
                return "bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/20";
            case "info":
                return "bg-blue-500/15 text-blue-400 border border-blue-500/20";
            case "easy":
                return "bg-[#3fb950]/15 text-[#3fb950] border border-[#3fb950]/20";
            case "medium":
                return "bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/20";
            case "hard":
                return "bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/20";
            case "neutral":
            default:
                return "bg-gray-700/50 text-gray-300 border border-gray-600/30";
        }
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVariantStyles(
                variant
            )} ${className}`}
        >
            {children}
        </span>
    );
};
