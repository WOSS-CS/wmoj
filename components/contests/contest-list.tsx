import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, Trophy } from "lucide-react"
import Link from "next/link"
import type { Database } from "@/lib/supabase/types"

type Contest = Database["public"]["Tables"]["contests"]["Row"]

interface ContestListProps {
  contests: Contest[]
}

export function ContestList({ contests }: ContestListProps) {
  const getContestStatus = (contest: Contest) => {
    const now = new Date()
    const start = new Date(contest.start_time)
    const end = new Date(contest.end_time)

    if (now < start) return "upcoming"
    if (now >= start && now < end) return "active"
    return "ended"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Live</Badge>
      case "upcoming":
        return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>
      case "ended":
        return <Badge variant="secondary">Ended</Badge>
      default:
        return null
    }
  }

  const formatDuration = (start: string, end: string) => {
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (contests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No contests available at the moment.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {contests.map((contest) => {
        const status = getContestStatus(contest)
        return (
          <Card key={contest.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">
                    <Link href={`/contests/${contest.slug}`} className="hover:underline">
                      {contest.title}
                    </Link>
                  </CardTitle>
                  {getStatusBadge(status)}
                </div>
              </div>
              {contest.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{contest.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(contest.start_time).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(contest.start_time, contest.end_time)}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {contest.max_participants ? `Max ${contest.max_participants}` : "Unlimited"}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {status === "upcoming" && `Starts ${new Date(contest.start_time).toLocaleTimeString()}`}
                    {status === "active" && `Ends ${new Date(contest.end_time).toLocaleTimeString()}`}
                    {status === "ended" && `Ended ${new Date(contest.end_time).toLocaleDateString()}`}
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/contests/${contest.slug}`}>
                      {status === "active" ? "Join" : status === "upcoming" ? "Register" : "View"}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
