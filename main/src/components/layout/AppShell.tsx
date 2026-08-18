"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { ManagerSidebar } from "./ManagerSidebar";
import { Header } from "./Header";
import { UserNavbar } from "./UserNavbar";
import { Skeleton, SkeletonTable } from "@/components/SkeletonLoader";

type ShellType = "auth" | "admin" | "manager" | "poopthrower" | "user";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();

    const isAuthPage = pathname.startsWith("/auth");
    const isAdminPage = pathname.startsWith("/admin");
    const isManagerPage = pathname.startsWith("/manager");
    const isPoopthrowerPage = pathname.startsWith("/poopthrower");

    const shellType: ShellType = isPoopthrowerPage
        ? "poopthrower"
        : isAuthPage
            ? "auth"
            : isAdminPage
                ? "admin"
                : isManagerPage
                    ? "manager"
                    : "user";

    // Track the previous shell so we can detect cross-shell transitions
    // (e.g. user → admin). During a transition the whole chrome swaps, so we
    // show a full-page skeleton for one render cycle until the new shell
    // commits. Using state + an effect avoids accessing a ref during render.
    const [prevShell, setPrevShell] = useState<ShellType>(shellType);
    const shellChanged = prevShell !== shellType;

    useEffect(() => {
        setPrevShell(shellType);
    }, [shellType]);

    // Secret game route — render nothing but the page itself
    if (isPoopthrowerPage) {
        return <>{children}</>;
    }

    const showNavigation = !isAuthPage;

    // During a cross-shell transition (e.g. user → admin), the whole chrome is
    // in flux. Show a full-page skeleton for exactly one render cycle instead
    // of the old chrome over a new-content skeleton.
    if (shellChanged && showNavigation) {
        return (
            <div role="status" aria-busy="true" aria-label="Loading" className="min-h-screen bg-background p-6 space-y-6">
                <Skeleton className="w-full h-14" />
                <Skeleton variant="text" width="30%" height={28} />
                <SkeletonTable rows={6} />
                <span className="sr-only">Loading…</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {showNavigation ? (
                isAdminPage ? (
                    <div className="flex min-h-screen">
                        <AdminSidebar />
                        <div className="flex-1 flex flex-col min-w-0 pl-60">
                            <Header />
                            <main className="flex-1 p-6">{children}</main>
                        </div>
                    </div>
                ) : isManagerPage ? (
                    <div className="flex min-h-screen">
                        <ManagerSidebar />
                        <div className="flex-1 flex flex-col min-w-0 pl-60">
                            <Header />
                            <main className="flex-1 p-6">{children}</main>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col min-h-screen w-full">
                        <UserNavbar />
                        <main className="flex-1 p-6">{children}</main>
                    </div>
                )
            ) : (
                <main className="min-h-screen">
                    {children}
                </main>
            )}
        </div>
    );
};
