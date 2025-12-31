"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import CodeRainBackground from "@/components/landing/CodeRainBackground";

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
    const showNavigation = !isLandingPage && !isAuthPage && user;

    return (
        <div className="min-h-screen text-foreground relative overflow-hidden">
            {/* Global Background Layer - The "Gold Standard" */}
            <div className="fixed inset-0 bg-[#0F1115] -z-50" />
            <div className="bg-noise fixed inset-0 z-0 opacity-[0.04] pointer-events-none" />
            {/* Code Rain is part of the aesthetic, rendered fixed at z-0 with low opacity */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <CodeRainBackground />
            </div>

            {/* Application Layout */}
            {showNavigation ? (
                <div className="flex relative z-10 min-h-screen">
                    {/* Sidebar */}
                    {isAdminPage ? <AdminSidebar /> : <Sidebar />}

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 pl-64 transition-all duration-300">
                        <Header />
                        <main className="flex-1 p-6 animate-fade-in-up">
                            {children}
                        </main>
                    </div>
                </div>
            ) : (
                /* Public/Auth Layout (No Sidebar/Header, but keeps background) */
                <main className="relative z-10 min-h-screen animate-fade-in-up">
                    {children}
                </main>
            )}
        </div>
    );
};
