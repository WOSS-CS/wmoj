"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

export const ThemeToggle = ({ className = "" }: { className?: string }) => {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Dynamic icon depends on state, only show after mount to avoid hydrate mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className={`w-8 h-8 ${className}`} />;

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full glass-panel hover:bg-surface-2 transition-all duration-300 group flex items-center justify-center ${className}`}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <svg
                    className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                    />
                </svg>
            ) : (
                <svg
                    className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                </svg>
            )}
        </button>
    );
};
