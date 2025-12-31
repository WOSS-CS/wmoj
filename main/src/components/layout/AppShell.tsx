"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    // Hide shell on landing page if not logged in options, or just always show for logged in?
    // Strategy: If user is logged in, they might see the shell everywhere?
    // Or simpler: Hide shell on landing page "/" explicitly unless we want a consistent experience.
    // Also auth pages usually don't have the sidebar.

    const isLandingPage = pathname === "/";
    const isAuthPage = pathname.startsWith("/auth");
    const isAdminPage = pathname.startsWith("/admin");
    const showShell = !isLandingPage && !isAuthPage && user;

    if (loading) return <>{children}</>; // Or a spinner

    if (!showShell) {
        // Just render children for landing/auth pages
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {isAdminPage ? <AdminSidebar /> : <Sidebar />}
            <div className="flex-1 flex flex-col min-w-0 pl-64">
                <Header />
                <main className="flex-1 p-6 animate-fade-in-up">
                    {children}
                </main>
            </div>
        </div>
    );
};
