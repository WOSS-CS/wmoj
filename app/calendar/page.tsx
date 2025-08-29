"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Trophy,
  ArrowRight,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  MapPin
} from "lucide-react"
import { getContests } from "@/lib/supabase/client-queries"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"

interface Contest {
  id: string
  title: string
  slug: string
  description: string | null
  start_time: string
  end_time: string
  registration_start: string | null
  registration_end: string | null
  max_participants: number | null
  is_public: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  contests: Contest[]
}

export default function CalendarPage() {
  const { user } = useAuth()
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month")

  useEffect(() => {
    loadContests()
  }, [])

  const loadContests = async () => {
    try {
      setLoading(true)
      const contestsData = await getContests()
      setContests(contestsData)
    } catch (error) {
      console.error("Error loading contests:", error)
    } finally {
      setLoading(false)
    }
  }

  const getContestStatus = (contest: Contest) => {
    const now = new Date()
    const start = new Date(contest.start_time)
    const end = new Date(contest.end_time)
    const regEnd = contest.registration_end ? new Date(contest.registration_end) : null

    if (now < start) {
      if (regEnd && now > regEnd) return "registration_closed"
      return "upcoming"
    } else if (now >= start && now <= end) {
      return "ongoing"
    } else {
      return "ended"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500"
      case "ongoing":
        return "bg-green-500"
      case "ended":
        return "bg-gray-500"
      case "registration_closed":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Upcoming"
      case "ongoing":
        return "Live"
      case "ended":
        return "Ended"
      case "registration_closed":
        return "Reg. Closed"
      default:
        return "Unknown"
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
    
    if (durationHours < 24) {
      return `${durationHours}h`
    } else {
      const days = Math.floor(durationHours / 24)
      const hours = durationHours % 24
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`
    }
  }

  const generateCalendarDays = (date: Date): CalendarDay[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstCalendarDay = new Date(firstDayOfMonth)
    firstCalendarDay.setDate(firstCalendarDay.getDate() - firstDayOfMonth.getDay())
    
    const days: CalendarDay[] = []
    const currentDay = new Date(firstCalendarDay)
    
    for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
      const dayContests = contests.filter(contest => {
        const contestStart = new Date(contest.start_time)
        const contestEnd = new Date(contest.end_time)
        return (
          (contestStart.toDateString() === currentDay.toDateString()) ||
          (currentDay >= contestStart && currentDay <= contestEnd)
        )
      })
      
      days.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        contests: dayContests,
      })
      
      currentDay.setDate(currentDay.getDate() + 1)
    }
    
    return days
  }

  const calendarDays = generateCalendarDays(currentDate)
  const upcomingContests = contests.filter(c => getContestStatus(c) === "upcoming").slice(0, 5)
  const ongoingContests = contests.filter(c => getContestStatus(c) === "ongoing")
  
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-8 w-8 text-primary" />
              Calendar
            </h1>
            <p className="text-muted-foreground mt-2">
              Track upcoming contests and important coding events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Live Contests</p>
                  <p className="text-2xl font-bold">{ongoingContests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold">{upcomingContests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">
                    {contests.filter(c => {
                      const contestDate = new Date(c.start_time)
                      return contestDate.getMonth() === currentDate.getMonth() && 
                             contestDate.getFullYear() === currentDate.getFullYear()
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Registered</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="month">Month View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="week">Week View</TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
                        day.isCurrentMonth 
                          ? "bg-background hover:bg-muted/50" 
                          : "bg-muted/20 text-muted-foreground"
                      } ${
                        day.date.toDateString() === new Date().toDateString()
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <div className="text-sm font-medium mb-1">
                        {day.date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {day.contests.slice(0, 2).map((contest) => {
                          const status = getContestStatus(contest)
                          return (
                            <div
                              key={contest.id}
                              className={`text-xs p-1 rounded text-white truncate ${getStatusColor(status)}`}
                              title={contest.title}
                            >
                              {contest.title}
                            </div>
                          )
                        })}
                        {day.contests.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{day.contests.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <div className="space-y-6">
              {/* Ongoing Contests */}
              {ongoingContests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      Live Contests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ongoingContests.map((contest) => (
                        <div
                          key={contest.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{contest.title}</h3>
                              <Badge className="bg-green-500 text-white">Live</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {contest.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Ends {formatDate(contest.end_time)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                Duration: {formatDuration(contest.start_time, contest.end_time)}
                              </span>
                            </div>
                          </div>
                          <Button asChild>
                            <Link href={`/contests/${contest.slug}`}>
                              Join Now
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Contests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Upcoming Contests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/4"></div>
                        </div>
                      ))
                    ) : upcomingContests.length > 0 ? (
                      upcomingContests.map((contest) => {
                        const status = getContestStatus(contest)
                        return (
                          <div
                            key={contest.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold">{contest.title}</h3>
                                <Badge className={getStatusColor(status)}>
                                  {getStatusText(status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {contest.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatDate(contest.start_time)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  Duration: {formatDuration(contest.start_time, contest.end_time)}
                                </span>
                                {contest.max_participants && (
                                  <span>Max: {contest.max_participants} participants</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" asChild>
                                <Link href={`/contests/${contest.slug}`}>
                                  View Details
                                </Link>
                              </Button>
                              {status === "upcoming" && (
                                <Button>
                                  Register
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8">
                        <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Upcoming Contests</h3>
                        <p className="text-muted-foreground">Check back later for new contests!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Past Contests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-gray-500" />
                    Recent Contests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contests
                      .filter(c => getContestStatus(c) === "ended")
                      .slice(0, 5)
                      .map((contest) => (
                        <div
                          key={contest.id}
                          className="flex items-center justify-between p-4 border rounded-lg opacity-75"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{contest.title}</h3>
                              <Badge className="bg-gray-500">Ended</Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Ended {formatDate(contest.end_time)}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/contests/${contest.slug}`}>
                              View Results
                            </Link>
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="week" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Week View</CardTitle>
                <CardDescription>Coming soon - Weekly calendar view</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Week View</h3>
                  <p className="text-muted-foreground">This feature will be available soon!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
