import { createClient } from "@/lib/supabase/server"
import { getGlobalStats } from "@/lib/supabase/queries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code, Trophy, Users, Target } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (data?.user) {
    redirect("/dashboard")
  }

  // Fetch real global stats
  const globalStats = await getGlobalStats()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <Code className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CodeContest</span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Master Programming Through Competition
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Solve challenging problems, compete in contests, and improve your coding skills with our comprehensive
            programming platform.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/auth/signup">Start Coding</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/problems">Browse Problems</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-16">
          <Card>
            <CardHeader>
              <Target className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Practice Problems</CardTitle>
              <CardDescription>Solve hundreds of coding challenges across different difficulty levels</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Trophy className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Contests</CardTitle>
              <CardDescription>Participate in regular programming contests and climb the leaderboard</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Community</CardTitle>
              <CardDescription>Connect with fellow programmers and learn from each other</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Code className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Multiple Languages</CardTitle>
              <CardDescription>Code in Python, Java, C++, JavaScript and many more languages</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid gap-8 md:grid-cols-3 mb-16">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{globalStats.totalProblems.toLocaleString()}+</div>
                <div className="text-muted-foreground">Problems Available</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{globalStats.totalUsers.toLocaleString()}+</div>
                <div className="text-muted-foreground">Active Users</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{globalStats.totalContests}+</div>
                <div className="text-muted-foreground">Contests Held</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Start Your Journey?</CardTitle>
              <CardDescription>Join thousands of programmers improving their skills every day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/auth/signup">Create Account</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
