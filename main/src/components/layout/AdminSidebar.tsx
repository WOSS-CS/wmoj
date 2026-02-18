"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const SidebarItem = ({
    href,
    icon,
    label,
    isActive,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
}) => {
    return (
        <Link
            href={href}
            className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                ? "text-brand-primary bg-[rgba(16,185,129,0.1)]"
                : "text-text-muted hover:text-foreground hover:bg-surface-2"
                }`}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-primary rounded-r-full" />
            )}
            <span className={isActive ? "text-brand-primary" : "group-hover:text-foreground"}>
                {icon}
            </span>
            <span className="font-medium">{label}</span>
        </Link>
    );
};

export const AdminSidebar = () => {
    const pathname = usePathname();

    const navItems = [
        {
            label: "Overview",
            href: "/admin/dashboard",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
            ),
        },
        {
            label: "User Management",
            href: "/admin/usermanagement",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M7 10a4 4 0 118 0 4 4 0 01-8 0z" />
                </svg>
            ),
        },
        {
            label: "Create Contest",
            href: "/admin/contests/create",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            ),
        },
        {
            label: "Create Problem",
            href: "/admin/problems/create",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            label: "Manage Problems",
            href: "/admin/problems/manage",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ),
        },
        {
            label: "Manage Contests",
            href: "/admin/contests/manage",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                </svg>
            ),
        },
        {
            label: "Help",
            href: "/admin/help",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10a4 4 0 118 0c0 1.657-1 2.5-2.5 3.5-.88.6-1.5 1-1.5 2m0 3h.01" />
                </svg>
            ),
        },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 p-4 z-50">
            <div className="h-full glass-panel flex flex-col p-4 border-red-900/10"> {/* Subtle visual distinction for admin context if needed? keeping standard glass-panel for now but maybe we want a red tint eventually. Sticking to design system. */}
                <div className="mb-8 pl-2">
                    <Logo size="md" />
                </div>

                <div className="mb-4 px-4 py-1 bg-red-500/10 border border-red-500/20 rounded-full w-fit">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-400">Admin Mode</span>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <SidebarItem
                                key={item.href}
                                href={item.href}
                                icon={item.icon}
                                label={item.label}
                                isActive={isActive}
                            />
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
};
