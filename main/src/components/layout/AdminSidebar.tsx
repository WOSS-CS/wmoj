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
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive
                    ? "text-foreground bg-surface-2 font-medium"
                    : "text-text-muted hover:text-foreground hover:bg-surface-2"
                }`}
        >
            <span className={isActive ? "text-brand-primary" : ""}>{icon}</span>
            <span>{label}</span>
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
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
            ),
        },
        {
            label: "User Management",
            href: "/admin/usermanagement",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M7 10a4 4 0 118 0 4 4 0 01-8 0z" />
                </svg>
            ),
        },
        {
            label: "Create Contest",
            href: "/admin/contests/create",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            ),
        },
        {
            label: "Create Problem",
            href: "/admin/problems/create",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            label: "Manage Problems",
            href: "/admin/problems/manage",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            ),
        },
        {
            label: "Manage Contests",
            href: "/admin/contests/manage",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                </svg>
            ),
        },
        {
            label: "Help",
            href: "/admin/help",
            icon: (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10a4 4 0 118 0c0 1.657-1 2.5-2.5 3.5-.88.6-1.5 1-1.5 2m0 3h.01" />
                </svg>
            ),
        },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-60 border-r border-border bg-surface-1 z-50 flex flex-col">
            <div className="p-5">
                <Logo size="md" />
            </div>

            <div className="mx-3 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-semibold text-error bg-error/10">
                    Admin
                </span>
            </div>

            <nav className="flex-1 px-3 space-y-1">
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
        </aside>
    );
};
