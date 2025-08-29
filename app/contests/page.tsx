import { getContests } from "@/lib/supabase/queries"
import { ContestList } from "@/components/contests/contest-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Calendar, Clock } from "lucide-react"

export default async function ContestsPage() {
  const contests = await getContests()

  const now = new Date()
  const upcomingContests = contests.filter((c) => new Date(c.start_time) > now)
  const activeContests = contests.filter((c) => new Date(c.start_time) <= now && new Date(c.end_time) > now)
  const pastContests = contests.filter((c) => new Date(c.end_time) <= now)

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contests</h1>
        <p className="text-muted-foreground">Participate in programming contests and compete with others</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contests</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeContests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcomingContests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastContests.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        {activeContests.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Active Contests</h2>
            <ContestList contests={activeContests} />
          </div>
        )}

        {upcomingContests.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Upcoming Contests</h2>
            <ContestList contests={upcomingContests} />
          </div>
        )}

        {pastContests.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Past Contests</h2>
            <ContestList contests={pastContests.slice(0, 10)} />
          </div>
        )}
      </div>
    </div>
  )
}
