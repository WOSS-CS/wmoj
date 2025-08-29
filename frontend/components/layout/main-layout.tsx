"use client"

import type React from "react"

import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { useAuth } from "@/components/auth/auth-provider"
import { usePathname } from "next/navigation"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth()
  const pathname = usePathname()

  // Don't show sidebar on auth pages or landing page
  const hideLayout = pathname.startsWith("/auth") || pathname === "/"

  if (hideLayout) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {user && (
          <aside className="hidden lg:block w-64 border-r bg-muted/10">
            <div className="sticky top-16 h-[calc(100vh-4rem)]">
              <Sidebar />
            </div>
          </aside>
        )}
        <main className="flex-1 overflow-hidden">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
