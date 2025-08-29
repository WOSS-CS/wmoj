import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, Trophy } from "lucide-react"
import { ContestRegistrationButton } from "./contest-registration-button"
import type { Database } from "@/lib/supabase/types"

type Contest = Database["public"]["Tables"]["contests"]["Row"]

interface ContestHeaderProps {
  contest: Contest
  userId: string
}

export function ContestHeader({ contest, userId }: ContestHeaderProps) {
  const getContestStatus = () => {
    const now = new Date()
    const start = new Date(contest.start_time)
    const end = new Date(contest.end_time)

    if (now < start) return "upcoming"
    if (now >= start && now < end) return "active"
    return "ended"
  }

  const status = getContestStatus()

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Live Now</Badge>
      case "upcoming":
        return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>
      case "ended":
        return <Badge variant="secondary">Ended</Badge>
    }
  }

  const formatDuration = () => {
    const duration = new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">{contest.title}</CardTitle>
              {getStatusBadge()}
            </div>
            {contest.description && <CardDescription className="text-base">{contest.description}</CardDescription>}
          </div>
          <ContestRegistrationButton contest={contest} userId={userId} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">Start Time</div>
              <div className="text-muted-foreground">{new Date(contest.start_time).toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">Duration</div>
              <div className="text-muted-foreground">{formatDuration()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">Participants</div>
              <div className="text-muted-foreground">
                {contest.max_participants ? `Max ${contest.max_participants}` : "Unlimited"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">Status</div>
              <div className="text-muted-foreground capitalize">{status}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
