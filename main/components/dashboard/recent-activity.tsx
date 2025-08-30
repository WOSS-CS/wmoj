"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Trophy, Target, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getRecentActivity } from "@/lib/supabase/queries"
import { useAuth } from "@/components/auth/auth-provider"

interface Activity {
  id: string
  type: "submission" | "contest" | "achievement"
  title: string
  description: string
  status?: string
  timestamp: string
  href?: string
}

export function RecentActivity() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        if (!user?.id) {
          setIsLoading(false)
          return
        }

        const realActivities = await getRecentActivity(user.id, 10)
        setActivities(realActivities)
      } catch (error) {
        console.error('Error fetching recent activity:', error)
        // Fallback to empty array if fetch fails
        setActivities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [user?.id])

  const getActivityIcon = (activity: Activity) => {
    switch (activity.type) {
      case "submission":
        return activity.status === "accepted" ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )
      case "contest":
        return <Trophy className="h-4 w-4 text-blue-600" />
      case "achievement":
        return <Target className="h-4 w-4 text-purple-600" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const colors = {
      accepted: "bg-green-100 text-green-800",
      wrong_answer: "bg-red-100 text-red-800",
      runtime_error: "bg-red-100 text-red-800",
      time_limit_exceeded: "bg-yellow-100 text-yellow-800",
    }

    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest actions and achievements</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-1">{getActivityIcon(activity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    {getStatusBadge(activity.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{activity.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</span>
                    {activity.href && (
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2">
                        <Link href={activity.href}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity. Start solving problems to see your progress here!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
