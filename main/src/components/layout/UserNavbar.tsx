"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useOptimisticPathname } from "@/hooks/useOptimisticPathname";

const navItems = [
    {
        label: "Problems",
        href: "/problems",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        label: "Submissions",
        href: "/submissions",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
    },
    {
        label: "Users",
        href: "/users",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        label: "Contests",
        href: "/contests",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
];

const aboutHrefs = ["/about", "/status", "/tips", "/pointsystem"];

const NavItem = ({
    href,
    icon,
    label,
    isActive,
    handleNavClick,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    handleNavClick: (e: React.MouseEvent, href: string) => void;
}) => (
    <Link
        href={href}
        onClick={(e) => handleNavClick(e, href)}
        // Active state was conveyed by colour alone; aria-current is the part a
        // screen reader can actually hear.
        aria-current={isActive ? "page" : undefined}
        className={`relative flex items-center gap-2 px-3 h-full text-sm font-medium transition-colors ${
            isActive ? "text-foreground" : "text-text-muted hover:text-foreground"
        }`}
    >
        <span className={isActive ? "text-brand-primary" : ""} aria-hidden="true">{icon}</span>
        <span className="hidden sm:block">{label}</span>
    </Link>
);

export const UserNavbar = () => {
    const { pathname, handleNavClick } = useOptimisticPathname();
    const { user, profile, userRole, profileLoading, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Hover and click are tracked separately on purpose. With one flag, the
    // pointerenter a tap synthesises would open the menu and the tap's own click
    // would immediately toggle it shut, so the About menu would be unopenable on
    // touch — the exact devices it was already unreachable on.
    const [isAboutHovered, setIsAboutHovered] = useState(false);
    const [isAboutPinned, setIsAboutPinned] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const aboutRef = useRef<HTMLDivElement>(null);
    const aboutButtonRef = useRef<HTMLButtonElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (aboutRef.current && !aboutRef.current.contains(event.target as Node)) {
                setIsAboutPinned(false);
                setIsAboutHovered(false);
            }
        };
        // Escape must close whichever popup is open — neither used to respond to
        // the keyboard at all. Focus goes back to the trigger, but only when it
        // was inside the popup being closed.
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            const active = document.activeElement;
            if (menuRef.current?.contains(active)) menuButtonRef.current?.focus();
            if (aboutRef.current?.contains(active)) aboutButtonRef.current?.focus();
            setIsMenuOpen(false);
            setIsAboutPinned(false);
            setIsAboutHovered(false);
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

    const displayName = user
        ? (profile?.username || user.email || "User")
        : null;
    const initial = displayName ? displayName.charAt(0).toUpperCase() : null;
    const avatarUrl = user
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/avatar`
        : null;

    const isAboutActive = aboutHrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
    const isAboutOpen = isAboutHovered || isAboutPinned;
    const closeAbout = () => { setIsAboutPinned(false); setIsAboutHovered(false); };

    const switchButton = (user && !profileLoading) ? (() => {
        if (userRole === "admin") return { label: "Switch to Admin Panel", path: "/admin/dashboard" };
        if (userRole === "manager") return { label: "Switch to Manager Panel", path: "/manager/dashboard" };
        return null;
    })() : null;

    return (
        <header data-navbar className="sticky top-0 z-40 h-14 border-b flex items-center px-6 gap-6">
            <Logo size="md" className="mt-1" />

            <nav aria-label="Main" className="flex items-stretch h-14 gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            isActive={isActive}
                            handleNavClick={handleNavClick}
                        />
                    );
                })}

                {/* About + its disclosure menu.
                    This used to be `hidden group-hover:block` with no focus or
                    click fallback, which made /status, /tips and /pointsystem
                    reachable ONLY by hovering with a mouse — not by keyboard,
                    not on any touch device, and /about links to none of them.
                    Hover still opens it; a real button now does too. */}
                <div
                    ref={aboutRef}
                    className="relative flex items-stretch"
                    onMouseEnter={() => setIsAboutHovered(true)}
                    onMouseLeave={() => setIsAboutHovered(false)}
                    onBlur={(e) => {
                        // Tabbing out of the group closes it; moving between the
                        // trigger and the menu items does not.
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) closeAbout();
                    }}
                >
                    <Link
                        href="/about"
                        onClick={(e) => { closeAbout(); handleNavClick(e, '/about'); }}
                        onFocus={() => setIsAboutPinned(true)}
                        aria-current={isAboutActive ? "page" : undefined}
                        className={`relative flex items-center gap-2 pl-3 h-full text-sm font-medium transition-colors ${
                            isAboutActive ? "text-foreground" : "text-text-muted hover:text-foreground"
                        }`}
                    >
                        <span className={isAboutActive ? "text-brand-primary" : ""} aria-hidden="true">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                        </span>
                        <span className="hidden sm:block">About</span>
                    </Link>
                    <button
                        ref={aboutButtonRef}
                        type="button"
                        onClick={() => setIsAboutPinned((pinned) => !(pinned || isAboutHovered))}
                        aria-expanded={isAboutOpen}
                        aria-haspopup="true"
                        aria-controls="about-menu"
                        aria-label="More about WMOJ"
                        className={`flex items-center pr-3 pl-1 h-full transition-colors ${
                            isAboutActive ? "text-foreground" : "text-text-muted hover:text-foreground"
                        }`}
                    >
                        <svg
                            className={`w-3 h-3 transition-transform ${isAboutOpen ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {isAboutOpen && (
                        <div className="absolute left-0 top-full pt-1 z-50">
                            {/* data-surface="light" is load-bearing: globals.css
                                re-declares the raw colour vars dark under
                                [data-navbar], and this attribute resets them.
                                A panel omitting it renders dark-on-dark. */}
                            <div id="about-menu" data-surface="light" className="w-44 bg-surface-1 border border-border rounded-xl p-1.5 shadow-xl flex flex-col gap-0.5">
                                <Link href="/status" onClick={(e) => { closeAbout(); handleNavClick(e, '/status'); }} aria-current={pathname === "/status" ? "page" : undefined} className="block w-full text-left px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors">
                                    Status
                                </Link>
                                <Link href="/tips" onClick={(e) => { closeAbout(); handleNavClick(e, '/tips'); }} aria-current={pathname === "/tips" ? "page" : undefined} className="block w-full text-left px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors">
                                    Tips
                                </Link>
                                <Link href="/pointsystem" onClick={(e) => { closeAbout(); handleNavClick(e, '/pointsystem'); }} aria-current={pathname === "/pointsystem" ? "page" : undefined} className="block w-full text-left px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors">
                                    Points
                                </Link>
                                <a href="https://github.com/WMOJ" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors">
                                    GitHub
                                    <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                    <span className="sr-only">(opens in a new tab)</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <div className="flex-1" />

            {user ? (
                <div className="relative" ref={menuRef}>
                    <button
                        ref={menuButtonRef}
                        type="button"
                        onClick={() => !profileLoading && setIsMenuOpen(!isMenuOpen)}
                        disabled={profileLoading}
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                        aria-controls="account-menu"
                        aria-label={displayName ? `Account menu for ${displayName}` : "Account menu"}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 text-sm"
                    >
                        {profileLoading ? (
                            <div className="flex items-center gap-2.5 animate-pulse">
                                <div className="w-7 h-7 rounded-lg bg-surface-2" />
                                <div className="hidden sm:block w-20 h-3.5 rounded bg-surface-2" />
                            </div>
                        ) : (
                            <>
                                {!avatarError && avatarUrl ? (
                                    // Plain <img>, not next/image: this is a
                                    // Supabase storage origin that is not in
                                    // next.config's images.remotePatterns, and
                                    // the avatar is a fixed 28px thumbnail with
                                    // no LCP role. Same treatment as
                                    // MarkdownRenderer's figure renderer.
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
                            className={`w-3.5 h-3.5 text-text-muted transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isMenuOpen && (
                        /* data-surface="light" resets the dark [data-navbar] vars — see the About menu above. */
                        <div id="account-menu" data-surface="light" className="absolute right-0 mt-2 w-48 bg-surface-1 border border-border rounded-xl p-1.5 shadow-xl z-50 flex flex-col gap-0.5">
                            <div className="px-3 py-2 mb-1 border-b border-border/50">
                                <p className="text-xs font-medium text-text-muted">Signed in as</p>
                                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                            </div>

                            <Link
                                href={`/users/${profile?.username || user?.id}`}
                                onClick={() => setIsMenuOpen(false)}
                                className="block w-full text-left px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                            >
                                My Profile
                            </Link>
                            <Link
                                href="/edit/profile"
                                onClick={() => setIsMenuOpen(false)}
                                className="block w-full text-left px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                            >
                                Edit Profile
                            </Link>

                            {switchButton && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        router.push(switchButton.path);
                                    }}
                                    className="block w-full text-left px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                                >
                                    {switchButton.label}
                                </button>
                            )}
                            
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="block w-full text-left px-3 py-2 text-sm font-medium text-error hover:bg-error/10 hover:text-error rounded-lg transition-colors mt-0.5"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Link
                        href="/auth/login"
                        className="px-4 py-1.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-surface-2 transition-colors"
                    >
                        Log In
                    </Link>
                    <Link
                        href="/auth/signup"
                        className="px-4 py-1.5 text-sm font-medium bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors"
                    >
                        Sign Up
                    </Link>
                </div>
            )}
        </header>
    );
};
