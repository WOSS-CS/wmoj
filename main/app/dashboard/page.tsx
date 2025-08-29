import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserStats } from "@/lib/supabase/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Target, CheckCircle, Trophy, TrendingUp, Calendar } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const stats = await getUserStats(data.user.id)

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your coding progress and upcoming events.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSolved}</div>
            <p className="text-xs text-muted-foreground">out of {stats.totalAttempted} attempted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSubmissions > 0 ? Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.acceptedSubmissions} / {stats.totalSubmissions} submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">days active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Rank</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#1,234</div>
            <p className="text-xs text-muted-foreground">out of 50,000 users</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Progress by Difficulty */}
          <Card>
            <CardHeader>
              <CardTitle>Progress by Difficulty</CardTitle>
              <CardDescription>Your problem-solving progress across difficulty levels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Easy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{stats.easySolved}/50</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(stats.easySolved / 50) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{stats.mediumSolved}/75</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all"
                      style={{ width: `${(stats.mediumSolved / 75) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Hard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{stats.hardSolved}/25</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${(stats.hardSolved / 25) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump into coding or explore contests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button asChild className="h-20 flex-col gap-2">
                  <Link href="/problems">
                    <Target className="h-6 w-6" />
                    <span>Solve Problems</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                  <Link href="/contests">
                    <Trophy className="h-6 w-6" />
                    <span>Join Contest</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Recent Activity */}
          <RecentActivity />

          {/* Upcoming Contests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Contests
              </CardTitle>
              <CardDescription>Don't miss these upcoming competitions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Weekly Contest 2</p>
                    <p className="text-xs text-muted-foreground">Tomorrow at 2:00 PM</p>
                  </div>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    Register
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Monthly Challenge</p>
                    <p className="text-xs text-muted-foreground">In 3 days</p>
                  </div>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    Register
                  </Button>
                </div>
              </div>
              <div className="pt-4">
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/contests">View All Contests</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
