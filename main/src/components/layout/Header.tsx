"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export const Header = () => {
    const { user, profile, userRole, profileLoading, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (menuRef.current?.contains(document.activeElement)) menuButtonRef.current?.focus();
            setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    if (!user) return null;

    const displayName = profile?.username || user.email || "User";
    const initial = displayName.charAt(0).toUpperCase();
    const avatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/avatar`;

    const switchButton = profileLoading ? null : (() => {
        if (userRole === 'admin') {
            if (pathname.startsWith('/admin')) {
                return { label: 'Switch to User View', path: '/' };
            }
            return { label: 'Switch to Admin Panel', path: '/admin/dashboard' };
        }
        if (userRole === 'manager') {
            if (pathname.startsWith('/manager')) {
                return { label: 'Switch to User View', path: '/' };
            }
            return { label: 'Switch to Manager Panel', path: '/manager/dashboard' };
        }
        return null;
    })();

    return (
        <header className="sticky top-0 z-40 h-14 border-b border-border bg-background flex items-center justify-end px-6 gap-3">
            <div className="relative" ref={menuRef}>
                <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => !profileLoading && setIsMenuOpen(!isMenuOpen)}
                    disabled={profileLoading}
                    aria-expanded={isMenuOpen}
                    aria-haspopup="menu"
                    aria-controls="staff-account-menu"
                    aria-label={`Account menu for ${displayName}`}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-2 text-sm"
                >
                    {profileLoading ? (
                        <div className="flex items-center gap-2.5 animate-pulse">
                            <div className="w-7 h-7 rounded-lg bg-surface-2" />
                            <div className="hidden sm:block w-20 h-3.5 rounded bg-surface-2" />
                        </div>
                    ) : (
                        <>
                            {!avatarError ? (
                                // Plain <img>, not next/image: Supabase storage is
                                // not registered in next.config's images.remotePatterns
                                // and this is a fixed 28px decorative thumbnail.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={avatarUrl}
                                    alt=""
                                    aria-hidden="true"
                                    className="w-7 h-7 rounded-lg object-cover"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                <div aria-hidden="true" className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center text-white text-xs font-semibold">
                                    {initial}
                                </div>
                            )}
                            <span className="font-medium text-foreground hidden sm:block">
                                {displayName}
                            </span>
                        </>
                    )}
                    <svg
                        className={`w-3.5 h-3.5 text-text-muted ${isMenuOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isMenuOpen && (
                    <div id="staff-account-menu" className="absolute right-0 mt-1 w-48 bg-surface-1 border border-border rounded-lg py-1 shadow-lg">
                        {switchButton && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    router.push(switchButton.path);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-2"
                            >
                                {switchButton.label}
                            </button>
                        )}
                        <div className="h-px bg-border my-1" />
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-error hover:bg-surface-2"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
