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
                    : "text-gray-400 hover:text-white hover:bg-surface-2"
                }`}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-primary rounded-r-full" />
            )}
            <span className={isActive ? "text-brand-primary" : "group-hover:text-white"}>
                {icon}
            </span>
            <span className="font-medium">{label}</span>
        </Link>
    );
};

export const Sidebar = () => {
    const pathname = usePathname();

    const navItems = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: (
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                </svg>
            ),
        },
        {
            label: "Problems",
            href: "/problems",
            icon: (
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            ),
        },
        {
            label: "Contests",
            href: "/contests",
            icon: (
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                </svg>
            ),
        },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 p-4 z-50">
            <div className="h-full glass-panel flex flex-col p-4">
                <div className="mb-8 pl-2">
                    <Logo size="md" />
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
