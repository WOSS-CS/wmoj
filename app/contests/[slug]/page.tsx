"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ContestRegistrationButton } from "@/components/contests/contest-registration-button"
import { Calendar, Clock, Users, Trophy, Star, ArrowLeft, Medal, Target, Timer } from "lucide-react"
import Link from "next/link"
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
  participant_count: number
  is_public: boolean
  is_rated: boolean
  contest_type: string
  difficulty_level: string
  prize_pool: number
  rules: string | null
}

interface ContestProblem {
  problem_id: string
  problem_index: string
  points: number
  penalty_minutes: number
  order_index: number
  problem_title?: string
  problem_difficulty?: string
}

interface StandingsEntry {
  rank: number
  user_id: string
  username: string
  total_score: number
  total_penalty: number
  solved_count: number
  problems_solved: { [key: string]: boolean }
}

export default function ContestDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const slug = params.slug as string
  
  const [contest, setContest] = useState<Contest | null>(null)
  const [problems, setProblems] = useState<ContestProblem[]>([])
  const [standings, setStandings] = useState<StandingsEntry[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slug) {
      fetchContestData()
    }
  }, [slug, user])

  const fetchContestData = async () => {
    try {
      // Fetch contest details
      const contestResponse = await fetch(`/api/contests/${slug}`)
      if (contestResponse.ok) {
        const contestData = await contestResponse.json()
        setContest(contestData)
        
        // Check registration status if logged in
        if (user) {
          const regResponse = await fetch(`/api/contests/${slug}/register`)
          if (regResponse.ok) {
            const regData = await regResponse.json()
            setIsRegistered(regData.isRegistered)
          }
        }
      }

      // Fetch contest problems
      const problemsResponse = await fetch(`/api/contests/${slug}/problems`)
      if (problemsResponse.ok) {
        const problemsData = await problemsResponse.json()
        setProblems(problemsData)
      }

      // Fetch standings
      const standingsResponse = await fetch(`/api/contests/${slug}/standings`)
      if (standingsResponse.ok) {
        const standingsData = await standingsResponse.json()
        setStandings(standingsData)
      }

    } catch (error) {
      console.error("Failed to fetch contest data:", error)
    } finally {
      setLoading(false)
    }
  }

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

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "intermediate":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "advanced":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "expert":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

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

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!contest) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Contest Not Found</h1>
          <p className="text-muted-foreground mb-4">The contest you're looking for doesn't exist.</p>
          <Link href="/contests">
            <Button>Back to Contests</Button>
          </Link>
        </div>
      </div>
    )
  }

  const status = getContestStatus(contest)
  const timeRemaining = status === "active" ? getTimeRemaining(contest.end_time) : 
                        status === "upcoming" ? getTimeRemaining(contest.start_time) : null

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/contests">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contests
          </Button>
        </Link>
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              {contest.title}
              {contest.is_rated && <Star className="h-6 w-6 text-yellow-500" />}
            </h1>
            <div className="flex gap-2 mb-3">
              <Badge className={getStatusColor(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              <Badge className={getDifficultyColor(contest.difficulty_level)}>
                {contest.difficulty_level.charAt(0).toUpperCase() + contest.difficulty_level.slice(1)}
              </Badge>
              <Badge variant="outline">
                {contest.contest_type.toUpperCase()}
              </Badge>
              {!contest.is_public && (
                <Badge variant="outline">Private</Badge>
              )}
            </div>
            {contest.description && (
              <p className="text-muted-foreground text-lg">{contest.description}</p>
            )}
          </div>
          
          {timeRemaining && (
            <Card className="min-w-48">
              <CardContent className="pt-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Timer className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {status === "active" ? "Time Remaining" : "Starts In"}
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {timeRemaining}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Contest Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium mb-1">Start Time</div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(contest.start_time)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium mb-1">Duration</div>
            <div className="text-sm text-muted-foreground">
              {Math.round((new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime()) / (1000 * 60))} minutes
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium mb-1">Participants</div>
            <div className="text-sm text-muted-foreground">
              {contest.participant_count}
              {contest.max_participants && ` / ${contest.max_participants}`}
            </div>
          </CardContent>
        </Card>
        
        {contest.prize_pool > 0 && (
          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium mb-1">Prize Pool</div>
              <div className="text-sm text-muted-foreground">${contest.prize_pool}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="problems" className="space-y-4">
            <TabsList>
              <TabsTrigger value="problems">Problems</TabsTrigger>
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="problems">
              <Card>
                <CardHeader>
                  <CardTitle>Contest Problems</CardTitle>
                  <CardDescription>
                    {problems.length} problems • Total points: {problems.reduce((sum, p) => sum + p.points, 0)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {problems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No problems available yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {problems.map((problem, index) => (
                        <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline" className="font-mono">
                                  {problem.problem_index}
                                </Badge>
                                <h3 className="font-medium">
                                  {problem.problem_title || `Problem ${problem.problem_index}`}
                                </h3>
                                {problem.problem_difficulty && (
                                  <Badge variant="secondary">
                                    {problem.problem_difficulty}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Points: {problem.points}</span>
                                <span>Penalty: {problem.penalty_minutes} min</span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {status === "active" && isRegistered && (
                                <Link href={`/contests/${contest.slug}/problems/${problem.problem_index}`}>
                                  <Button size="sm">Solve</Button>
                                </Link>
                              )}
                              {status !== "active" && (
                                <Link href={`/problems/${problem.problem_id}`}>
                                  <Button variant="outline" size="sm">View</Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="standings">
              <Card>
                <CardHeader>
                  <CardTitle>Leaderboard</CardTitle>
                  <CardDescription>
                    Current standings • {standings.length} participants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {standings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Medal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No standings available yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {standings.map((entry, index) => (
                        <div key={entry.user_id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                              {entry.rank <= 3 ? (
                                <Medal className={`h-4 w-4 ${
                                  entry.rank === 1 ? "text-yellow-500" :
                                  entry.rank === 2 ? "text-gray-400" :
                                  "text-orange-600"
                                }`} />
                              ) : (
                                <span className="text-sm font-medium">{entry.rank}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{entry.username}</div>
                              <div className="text-xs text-muted-foreground">
                                {entry.solved_count} solved
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{entry.total_score} pts</div>
                            <div className="text-xs text-muted-foreground">
                              {entry.total_penalty} penalty
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Contest Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Schedule</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Registration: {formatDateTime(contest.registration_start)} - {formatDateTime(contest.registration_end)}</div>
                      <div>Contest: {formatDateTime(contest.start_time)} - {formatDateTime(contest.end_time)}</div>
                      <div>Duration: {Math.round((new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime()) / (1000 * 60))} minutes</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Contest Settings</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Type: {contest.contest_type.toUpperCase()} Style</div>
                      <div>Difficulty: {contest.difficulty_level.charAt(0).toUpperCase() + contest.difficulty_level.slice(1)}</div>
                      <div>Rating: {contest.is_rated ? "Rated" : "Unrated"}</div>
                      <div>Visibility: {contest.is_public ? "Public" : "Private"}</div>
                      {contest.max_participants && <div>Max Participants: {contest.max_participants}</div>}
                    </div>
                  </div>

                  {contest.rules && (
                    <div>
                      <h3 className="font-medium mb-2">Rules & Guidelines</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {contest.rules}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Registration Sidebar */}
        <div className="lg:col-span-1">
          <ContestRegistrationButton 
            contest={contest}
            isRegistered={isRegistered}
            onRegistrationChange={() => {
              setIsRegistered(!isRegistered)
              // Refresh contest data to update participant count
              fetchContestData()
            }}
          />
        </div>
      </div>
    </div>
  )
}
