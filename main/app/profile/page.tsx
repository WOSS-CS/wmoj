import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile, getUserStats } from "@/lib/supabase/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, MapPin, Globe, Github, Target, Trophy, Clock } from "lucide-react"
import Link from "next/link"

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const profile = await getProfile(data.user.id)
  const stats = await getUserStats(data.user.id)

  if (!profile) {
    redirect("/profile/setup")
  }

  const totalProblems = 150 // This would come from a count query in real app
  const solvedPercentage = Math.round((stats.totalSolved / totalProblems) * 100)

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || ""} alt={profile.display_name || ""} />
            <AvatarFallback className="text-2xl">
              {profile.display_name?.charAt(0) || profile.username.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-lg text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="text-muted-foreground max-w-md">{profile.bio}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </div>
              )}
              {profile.website_url && (
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Website
                  </a>
                </div>
              )}
              {profile.github_username && (
                <div className="flex items-center gap-1">
                  <Github className="h-4 w-4" />
                  <a
                    href={`https://github.com/${profile.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    GitHub
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href="/profile/settings">Edit Profile</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="contests">Contests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSolved}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={solvedPercentage} className="flex-1" />
                  <span className="text-xs text-muted-foreground">{solvedPercentage}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalSubmissions > 0
                    ? Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.acceptedSubmissions} / {stats.totalSubmissions} submissions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                <p className="text-xs text-muted-foreground">across all problems</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ranking</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">#1,234</div>
                <p className="text-xs text-muted-foreground">global ranking</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Problem Difficulty Breakdown</CardTitle>
                <CardDescription>Problems solved by difficulty level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Easy
                    </Badge>
                    <span className="text-sm font-medium">{stats.easySolved} solved</span>
                  </div>
                  <Progress value={(stats.easySolved / 50) * 100} className="w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Medium
                    </Badge>
                    <span className="text-sm font-medium">{stats.mediumSolved} solved</span>
                  </div>
                  <Progress value={(stats.mediumSolved / 75) * 100} className="w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Hard
                    </Badge>
                    <span className="text-sm font-medium">{stats.hardSolved} solved</span>
                  </div>
                  <Progress value={(stats.hardSolved / 25) * 100} className="w-24" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest submissions and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentSubmissions.slice(0, 5).map((submission, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              submission.status === "accepted" ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-sm">Problem submission</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={submission.status === "accepted" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {submission.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity. Start solving problems!</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="problems">
          <Card>
            <CardHeader>
              <CardTitle>Problem Solving History</CardTitle>
              <CardDescription>Track your progress across all problems</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Problem history will be displayed here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>All your code submissions and results</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Submission history will be displayed here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contests">
          <Card>
            <CardHeader>
              <CardTitle>Contest Participation</CardTitle>
              <CardDescription>Your contest history and rankings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Contest history will be displayed here...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
