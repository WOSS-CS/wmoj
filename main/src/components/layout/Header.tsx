"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const Header = () => {
    const { user, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    if (!user) return null;

    return (
        <header className="sticky top-0 z-40 w-full p-4 pointer-events-none">
            <div className="max-w-[calc(100%-17rem)] ml-auto pointer-events-auto flex justify-end">
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-3 p-2 rounded-full glass-panel hover:bg-surface-2 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-brand-primary to-emerald-400 flex items-center justify-center text-black font-bold text-sm">
                            {(user.user_metadata?.username || user.email || "U")
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                        <span className="text-sm font-medium pr-2 hidden sm:block">
                            {user.user_metadata?.username || user.email}
                        </span>
                        <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isMenuOpen ? "rotate-180" : ""
                                }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 glass-panel py-1 animate-scale-in origin-top-right">
                            <Link
                                href="/profile"
                                className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Profile
                            </Link>
                            <Link
                                href="/settings"
                                className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Settings
                            </Link>
                            <div className="h-px bg-[#30363d] my-1" />
                            <button
                                onClick={handleSignOut}
                                className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-surface-2"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
