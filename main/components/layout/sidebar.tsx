"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Target,
  Trophy,
  Code,
  User,
  Settings,
  BarChart3,
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
} from "lucide-react"
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

const quickStats = [
  {
    name: "Problems Solved",
    value: "42",
    icon: Target,
    color: "text-green-600",
  },
  {
    name: "Contest Rank",
    value: "#1,234",
    icon: Award,
    color: "text-blue-600",
  },
  {
    name: "Streak",
    value: "7 days",
    icon: TrendingUp,
    color: "text-orange-600",
  },
]

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

            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Quick Stats</h2>
              <div className="space-y-3">
                {quickStats.map((stat) => (
                  <div key={stat.name} className="px-4 py-2 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <stat.icon className={cn("h-4 w-4", stat.color)} />
                        <span className="text-sm font-medium">{stat.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {stat.value}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Resources</h2>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/learn">
                <BookOpen className="mr-2 h-4 w-4" />
                Learn
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/leaderboard">
                <BarChart3 className="mr-2 h-4 w-4" />
                Leaderboard
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/calendar">
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
