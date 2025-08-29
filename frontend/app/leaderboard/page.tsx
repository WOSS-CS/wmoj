"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  Users,
  Target,
  Clock,
  Star
} from "lucide-react"
import { getGlobalLeaderboard, getContests, getContestLeaderboard } from "@/lib/supabase/client-queries"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"

interface LeaderboardUser {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  total_solved: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  rank?: number
}

interface ContestLeaderboardUser {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  total_score: number
  last_submission: string
  rank?: number
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardUser[]>([])
  const [contestLeaderboards, setContestLeaderboards] = useState<Record<string, ContestLeaderboardUser[]>>({})
  const [contests, setContests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContest, setSelectedContest] = useState<string>("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load global leaderboard
      const globalData = await getGlobalLeaderboard()
      const rankedGlobalData = globalData.map((user, index) => ({
        ...user,
        rank: index + 1
      }))
      setGlobalLeaderboard(rankedGlobalData)

      // Load contests
      const contestsData = await getContests()
      setContests(contestsData.slice(0, 5)) // Get recent 5 contests
      
      // Load contest leaderboards
      const contestLeaderboardData: Record<string, ContestLeaderboardUser[]> = {}
      for (const contest of contestsData.slice(0, 5)) {
        const leaderboard = await getContestLeaderboard(contest.id)
        const rankedLeaderboard = leaderboard.map((user, index) => ({
          ...user,
          rank: index + 1
        }))
        contestLeaderboardData[contest.id] = rankedLeaderboard
      }
      setContestLeaderboards(contestLeaderboardData)
      
      if (contestsData.length > 0) {
        setSelectedContest(contestsData[0].id)
      }
    } catch (error) {
      console.error("Error loading leaderboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500 text-white"
      case 2:
        return "bg-gray-400 text-white"
      case 3:
        return "bg-amber-600 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "< 1h ago"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const currentUserRank = globalLeaderboard.find(u => u.user_id === user?.id)?.rank

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-2">
              See how you rank against other programmers
            </p>
          </div>
          {currentUserRank && (
            <Card className="w-fit">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                    <p className="text-2xl font-bold">#{currentUserRank}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{globalLeaderboard.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Contests</p>
                  <p className="text-2xl font-bold">{contests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Top Solver</p>
                  <p className="text-lg font-bold">
                    {globalLeaderboard[0]?.display_name || globalLeaderboard[0]?.username || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-lg font-bold">Just now</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="global">Global Leaderboard</TabsTrigger>
            <TabsTrigger value="contests">Contest Leaderboards</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Global Rankings
                </CardTitle>
                <CardDescription>
                  Rankings based on total problems solved across all difficulties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-lg animate-pulse">
                        <div className="w-8 h-8 bg-muted rounded"></div>
                        <div className="w-10 h-10 bg-muted rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/4"></div>
                          <div className="h-3 bg-muted rounded w-1/6"></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-12 h-6 bg-muted rounded"></div>
                          <div className="w-12 h-6 bg-muted rounded"></div>
                          <div className="w-12 h-6 bg-muted rounded"></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    globalLeaderboard.slice(0, 50).map((userEntry) => (
                      <div
                        key={userEntry.user_id}
                        className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                          userEntry.user_id === user?.id 
                            ? "bg-primary/10 border border-primary/20" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(userEntry.rank!)}
                        </div>
                        
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={userEntry.avatar_url || undefined} alt={userEntry.username} />
                          <AvatarFallback>
                            {(userEntry.display_name || userEntry.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">
                              {userEntry.display_name || userEntry.username}
                            </p>
                            {userEntry.user_id === user?.id && (
                              <Badge variant="outline">You</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">@{userEntry.username}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold">{userEntry.total_solved}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                          <Badge className="bg-green-500 text-white">
                            {userEntry.easy_solved}E
                          </Badge>
                          <Badge className="bg-yellow-500 text-white">
                            {userEntry.medium_solved}M
                          </Badge>
                          <Badge className="bg-red-500 text-white">
                            {userEntry.hard_solved}H
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contests" className="mt-6">
            <div className="space-y-6">
              {contests.map((contest) => (
                <Card key={contest.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Medal className="h-5 w-5" />
                          {contest.title}
                        </CardTitle>
                        <CardDescription>
                          {new Date(contest.start_time).toLocaleDateString()} - {new Date(contest.end_time).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Link href={`/contests/${contest.slug}`}>
                        <Badge variant="outline">View Contest</Badge>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contestLeaderboards[contest.id]?.slice(0, 10).map((userEntry) => (
                        <div
                          key={userEntry.user_id}
                          className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                            userEntry.user_id === user?.id 
                              ? "bg-primary/10 border border-primary/20" 
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <Badge className={getRankBadgeColor(userEntry.rank!)}>
                            #{userEntry.rank}
                          </Badge>
                          
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userEntry.avatar_url || undefined} alt={userEntry.username} />
                            <AvatarFallback>
                              {(userEntry.display_name || userEntry.username).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {userEntry.display_name || userEntry.username}
                              </p>
                              {userEntry.user_id === user?.id && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <p className="font-bold">{userEntry.total_score}</p>
                              <p className="text-xs text-muted-foreground">Points</p>
                            </div>
                            <div className="text-muted-foreground">
                              {formatTimeAgo(userEntry.last_submission)}
                            </div>
                          </div>
                        </div>
                      )) || (
                        <p className="text-center text-muted-foreground py-8">
                          No submissions yet for this contest
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {contests.length === 0 && !loading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Medal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Recent Contests</h3>
                    <p className="text-muted-foreground">Check back later for new contests!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
