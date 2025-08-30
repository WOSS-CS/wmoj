"use client"

import { Button } from "@/components/ui/button"
import { Home, Target, Trophy, Code, User, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    requiresAuth: true,
  },
  {
    name: "Problems",
    href: "/problems",
    icon: Target,
    requiresAuth: false,
  },
  {
    name: "Contests",
    href: "/contests",
    icon: Trophy,
    requiresAuth: false,
  },
  {
    name: "Submissions",
    href: "/submissions",
    icon: Code,
    requiresAuth: true,
  },
]

const secondaryNavigation = [
  {
    name: "Profile",
    href: "/profile",
    icon: User,
    requiresAuth: true,
  },
  {
    name: "Settings",
    href: "/profile/settings",
    icon: Settings,
    requiresAuth: true,
  },
]

// Removed quick stats to simplify UI

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Navigation</h2>
          <div className="space-y-1">
            {navigation.map((item) => {
              if (item.requiresAuth && !user) return null
              return (
                <Button
                  key={item.name}
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>

        {user && (
          <>
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Account</h2>
              <div className="space-y-1">
                {secondaryNavigation.map((item) => (
                  <Button
                    key={item.name}
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick stats removed */}
          </>
        )}
        {/* Resources section removed to reduce clutter */}
      </div>
    </div>
  )
}
