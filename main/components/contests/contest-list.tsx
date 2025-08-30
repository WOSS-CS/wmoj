"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, Trophy, Star, Plus } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

interface Contest {
  id: string
  slug: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  registration_start: string
  registration_end: string
  max_participants: number | null
  participant_count?: number
  is_public: boolean
  // removed fields from schema
}

interface ContestListProps {
  isAdmin?: boolean
}

export function ContestList({ isAdmin = false }: ContestListProps) {
  const { user } = useAuth()
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "upcoming" | "active" | "ended">("all")

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const response = await fetch("/api/contests")
        if (response.ok) {
          const data = await response.json()
          setContests(data)
        }
      } catch (error) {
        console.error("Failed to fetch contests:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchContests()
  }, [])

  const getContestStatus = (contest: Contest) => {
    const now = new Date()
    const start = new Date(contest.start_time)
    const end = new Date(contest.end_time)
    const regEnd = new Date(contest.registration_end)

    if (now < regEnd && now < start) return "upcoming"
    if (now >= regEnd && now < start) return "registration"
    if (now >= start && now < end) return "active"
    return "ended"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "registration":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "active":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "ended":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  // difficulty/type/prize removed

  const filteredContests = contests.filter(contest => {
    if (filter === "all") return true
    return getContestStatus(contest) === filter
  })

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeRemaining = (dateString: string) => {
    const now = new Date().getTime()
    const target = new Date(dateString).getTime()
    const diff = target - now

    if (diff <= 0) return null

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with filter buttons and create button */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {["all", "upcoming", "active", "ended"].map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status as any)}
            >
              {status === "all" ? "All Contests" : status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {user && isAdmin && (
          <Link href="/contests/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Contest
            </Button>
          </Link>
        )}
      </div>

      {/* Contest cards */}
      <div className="space-y-4">
        {filteredContests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No contests found</h3>
              <p className="text-muted-foreground mb-4">
                {filter === "all" 
                  ? "There are no contests available at the moment."
                  : `There are no ${filter} contests at the moment.`
                }
              </p>
              {user && isAdmin && filter === "all" && (
                <Link href="/contests/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Contest
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredContests.map((contest) => {
            const status = getContestStatus(contest)
            return (
              <Card key={contest.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Link 
                          href={`/contests/${contest.slug}`}
                          className="hover:underline"
                        >
                          {contest.title}
                        </Link>
                        {/* rated removed */}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {contest.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(status)}>
                        {status}
                      </Badge>
                      {/* difficulty removed */}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Start Time</div>
                        <div className="text-muted-foreground">
                          {formatDateTime(contest.start_time)}
                        </div>
                        {status === "upcoming" && getTimeRemaining(contest.start_time) && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            In {getTimeRemaining(contest.start_time)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Duration</div>
                        <div className="text-muted-foreground">
                          {Math.round(
                            (new Date(contest.end_time).getTime() - 
                             new Date(contest.start_time).getTime()) / 
                            (1000 * 60)
                          )} minutes
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Participants</div>
                        <div className="text-muted-foreground">
                          {contest.participant_count || 0}
                          {contest.max_participants && ` / ${contest.max_participants}`}
                        </div>
                      </div>
                    </div>

                    {/* prize pool removed */}
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {!contest.is_public && (
                        <Badge variant="outline" className="text-xs">
                          Private
                        </Badge>
                      )}
                    </div>
                    
                    <Link href={`/contests/${contest.slug}`}>
                      <Button size="sm">
                        {status === "active" ? "Enter Contest" :
                         status === "upcoming" ? "View Details" :
                         status === "registration" ? "Register" :
                         "View Results"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
