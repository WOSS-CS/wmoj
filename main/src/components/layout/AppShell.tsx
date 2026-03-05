"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const { user } = useAuth();

    const isLandingPage = pathname === "/";
    const isAuthPage = pathname.startsWith("/auth");
    const isAboutPage = pathname === "/about";
    const isAdminPage = pathname.startsWith("/admin");
    const isPoopthrowerPage = pathname.startsWith("/poopthrower");

    // Secret game route — render nothing but the page itself
    if (isPoopthrowerPage) {
        return <>{children}</>;
    }

    const showNavigation = !isLandingPage && !isAuthPage && !isAboutPage && user;

    return (
        <div className="min-h-screen bg-background text-foreground">
            {showNavigation ? (
                <div className="flex min-h-screen">
                    {isAdminPage ? <AdminSidebar /> : <Sidebar />}
                    <div className="flex-1 flex flex-col min-w-0 pl-60">
                        <Header />
                        <main className="flex-1 p-6">
                            {children}
                        </main>
                    </div>
                </div>
            ) : (
                <main className="min-h-screen">
                    {children}
                </main>
            )}
        </div>
    );
};
