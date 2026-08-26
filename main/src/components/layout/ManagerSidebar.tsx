"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useOptimisticPathname } from "@/hooks/useOptimisticPathname";

type NavEntry = {
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

export const ManagerSidebar = () => {
    const { pathname, handleNavClick } = useOptimisticPathname();

    const navItems: NavEntry[] = [
        {
            label: "Overview",
            href: "/manager/dashboard",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
            ),
        },
        {
            label: "User Management",
            href: "/manager/usermanagement",
            activePrefixes: ["/manager/usermanagement"],
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M7 10a4 4 0 118 0 4 4 0 01-8 0z" />
                </svg>
            ),
        },
        {
            label: "Create Contest",
            href: "/manager/contests/create",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            ),
        },
        {
            label: "Create Problem",
            href: "/manager/problems/create",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            label: "Manage Problems",
            href: "/manager/problems/manage",
            activePrefixes: ["/manager/problems"],
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            ),
        },
        {
            label: "Manage Contests",
            href: "/manager/contests/manage",
            activePrefixes: ["/manager/contests"],
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                </svg>
            ),
        },
        {
            label: "News Posts",
            href: "/manager/newsposts",
            activePrefixes: ["/manager/newsposts"],
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            ),
        },
        {
            label: "Help",
            href: "/manager/help",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10a4 4 0 118 0c0 1.657-1 2.5-2.5 3.5-.88.6-1.5 1-1.5 2m0 3h.01" />
                </svg>
            ),
        },
    ];

    const activeHref = findActiveHref(navItems, pathname);

    return (
        <aside className="fixed left-0 top-0 h-screen w-60 border-r border-border bg-surface-1 z-50 flex flex-col">
            <div className="p-5">
                <Logo size="md" />
            </div>

            <div className="mx-3 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-semibold text-brand-primary bg-brand-primary/10">
                    Manager
                </span>
            </div>

            <nav aria-label="Manager" className="flex-1 px-3 space-y-1">
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
