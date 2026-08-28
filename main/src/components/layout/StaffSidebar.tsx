"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useOptimisticPathname } from "@/hooks/useOptimisticPathname";

export type NavEntry = {
    label: string;
    href: string;
    icon: React.ReactNode;
    /**
     * Extra path prefixes this item owns. Without these, the plain
     * `pathname === href || startsWith(href + "/")` rule leaves NO item
     * highlighted on e.g. /admin/problems/[id]/edit — the sidebar simply goes
     * blank while you are editing.
     */
    activePrefixes?: string[];
};

/**
 * The active item is the one whose own href matches; only if none does do we
 * fall back to `activePrefixes`. That ordering matters: "Create Problem"
 * (/admin/problems/create) must win over "Manage Problems", which claims the
 * whole /admin/problems subtree as a fallback.
 */
function findActiveHref(navItems: NavEntry[], pathname: string): string | undefined {
    const direct = navItems.find(
        (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
    );
    if (direct) return direct.href;
    return navItems.find((i) =>
        (i.activePrefixes ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`)),
    )?.href;
}

const SidebarItem = ({
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
}) => {
    return (
        <Link
            href={href}
            onClick={(e) => handleNavClick(e, href)}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive
                    ? "text-foreground bg-surface-2 font-medium"
                    : "text-text-muted hover:text-foreground hover:bg-surface-2"
                }`}
        >
            <span className={isActive ? "text-brand-primary" : ""} aria-hidden="true">{icon}</span>
            <span>{label}</span>
        </Link>
    );
};

interface StaffSidebarProps {
    navItems: NavEntry[];
    /** Role badge text; doubles as the `<nav>`'s accessible name. */
    roleLabel: string;
    /** Tone classes for the role badge. Its layout classes are fixed here. */
    badgeClassName: string;
    className?: string;
}

/**
 * The staff sidebar chrome, shared by the admin and manager trees. Those two
 * trees differed in nothing but their nav entries and the colour and wording of
 * the role badge, so those are the only props — see `AdminSidebar` /
 * `ManagerSidebar`, the only callers.
 */
export const StaffSidebar = ({
    navItems,
    roleLabel,
    badgeClassName,
    className = "",
}: StaffSidebarProps) => {
    const { pathname, handleNavClick } = useOptimisticPathname();

    const activeHref = findActiveHref(navItems, pathname);

    return (
        <aside className={`fixed left-0 top-0 h-screen w-60 border-r border-border bg-surface-1 z-50 flex flex-col ${className}`}>
            <div className="p-5">
                <Logo size="md" />
            </div>

            <div className="mx-3 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-semibold ${badgeClassName}`}>
                    {roleLabel}
                </span>
            </div>

            <nav aria-label={roleLabel} className="flex-1 px-3 space-y-1">
                {navItems.map((item) => (
                    <SidebarItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        isActive={item.href === activeHref}
                        handleNavClick={handleNavClick}
                    />
                ))}
            </nav>
        </aside>
    );
};
