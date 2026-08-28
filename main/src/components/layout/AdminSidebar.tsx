"use client";

import { StaffSidebar, type NavEntry } from "./StaffSidebar";

const navItems: NavEntry[] = [
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
        activePrefixes: ["/admin/problems"],
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        ),
    },
    {
        label: "Manage Contests",
        href: "/admin/contests/manage",
        activePrefixes: ["/admin/contests"],
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

export const AdminSidebar = () => (
    <StaffSidebar navItems={navItems} roleLabel="Admin" badgeClassName="text-error bg-error/10" />
);
