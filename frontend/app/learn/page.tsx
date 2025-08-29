"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BookOpen, 
  Search, 
  Clock, 
  Target, 
  TrendingUp, 
  Play, 
  CheckCircle, 
  Circle,
  Code,
  Database,
  Brain,
  FileText
} from "lucide-react"
import Link from "next/link"
import { getLearningResources, getUserLearningProgress } from "@/lib/supabase/client-queries"
import { useAuth } from "@/components/auth/auth-provider"
import type { Database } from "@/lib/supabase/types"

type LearningResource = Database["public"]["Tables"]["learning_resources"]["Row"]
type UserProgress = Database["public"]["Tables"]["user_learning_progress"]["Row"]

export default function LearnPage() {
  const { user } = useAuth()
  const [resources, setResources] = useState<LearningResource[]>([])
  const [userProgress, setUserProgress] = useState<UserProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const resourcesData = await getLearningResources({
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        difficulty: difficultyFilter !== "all" ? difficultyFilter : undefined,
        search: searchQuery || undefined,
      })
      setResources(resourcesData)

      if (user) {
        const progressData = await getUserLearningProgress(user.id)
        setUserProgress(progressData)
      }
    } catch (error) {
      console.error("Error loading learn page data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadData()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchQuery, categoryFilter, difficultyFilter])

  const getProgressForResource = (resourceId: string) => {
    return userProgress.find(p => p.resource_id === resourceId)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "algorithm": return <Code className="h-4 w-4" />
      case "data_structure": return <Database className="h-4 w-4" />
      case "concept": return <Brain className="h-4 w-4" />
      case "tutorial": return <FileText className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-500"
      case "Intermediate": return "bg-yellow-500"
      case "Advanced": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const filteredResources = resources.filter(resource => {
    if (searchQuery && !resource.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !resource.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const completedCount = userProgress.filter(p => p.status === "completed").length
  const inProgressCount = userProgress.filter(p => p.status === "in_progress").length
  const totalTimeSpent = userProgress.reduce((total, p) => total + (p.time_spent || 0), 0)

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Learn
            </h1>
            <p className="text-muted-foreground mt-2">
              Master algorithms, data structures, and programming concepts
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {user && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{completedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">{inProgressCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Spent</p>
                    <p className="text-2xl font-bold">{Math.round(totalTimeSpent / 60)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Streak</p>
                    <p className="text-2xl font-bold">7d</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search learning resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="tutorial">Tutorials</SelectItem>
              <SelectItem value="algorithm">Algorithms</SelectItem>
              <SelectItem value="data_structure">Data Structures</SelectItem>
              <SelectItem value="concept">Concepts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Learning Resources */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tutorial">Tutorials</TabsTrigger>
            <TabsTrigger value="algorithm">Algorithms</TabsTrigger>
            <TabsTrigger value="data_structure">Data Structures</TabsTrigger>
            <TabsTrigger value="concept">Concepts</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                filteredResources.map((resource) => {
                  const progress = getProgressForResource(resource.id)
                  return (
                    <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(resource.category)}
                            <CardTitle className="text-lg">{resource.title}</CardTitle>
                          </div>
                          {progress && (
                            <div className="flex items-center gap-1">
                              {progress.status === "completed" ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : progress.status === "in_progress" ? (
                                <Play className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {resource.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <Badge variant="outline" className={getDifficultyColor(resource.difficulty)}>
                              {resource.difficulty}
                            </Badge>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {resource.estimated_time}min
                            </div>
                          </div>
                          
                          {progress && progress.progress_percentage > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{progress.progress_percentage}%</span>
                              </div>
                              <Progress value={progress.progress_percentage} className="h-2" />
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1">
                            {resource.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {resource.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{resource.tags.length - 3}
                              </Badge>
                            )}
                          </div>

                          <Button asChild className="w-full">
                            <Link href={`/learn/${resource.slug}`}>
                              {progress?.status === "completed" ? "Review" : 
                               progress?.status === "in_progress" ? "Continue" : "Start Learning"}
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* Category-specific tabs would filter the same resources */}
          {["tutorial", "algorithm", "data_structure", "concept"].map((category) => (
            <TabsContent key={category} value={category} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources
                  .filter(resource => resource.category === category)
                  .map((resource) => {
                    const progress = getProgressForResource(resource.id)
                    return (
                      <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(resource.category)}
                              <CardTitle className="text-lg">{resource.title}</CardTitle>
                            </div>
                            {progress && (
                              <div className="flex items-center gap-1">
                                {progress.status === "completed" ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : progress.status === "in_progress" ? (
                                  <Play className="h-5 w-5 text-blue-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                          <CardDescription className="line-clamp-2">
                            {resource.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <Badge variant="outline" className={getDifficultyColor(resource.difficulty)}>
                                {resource.difficulty}
                              </Badge>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {resource.estimated_time}min
                              </div>
                            </div>
                            
                            {progress && progress.progress_percentage > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Progress</span>
                                  <span>{progress.progress_percentage}%</span>
                                </div>
                                <Progress value={progress.progress_percentage} className="h-2" />
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1">
                              {resource.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {resource.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{resource.tags.length - 3}
                                </Badge>
                              )}
                            </div>

                            <Button asChild className="w-full">
                              <Link href={`/learn/${resource.slug}`}>
                                {progress?.status === "completed" ? "Review" : 
                                 progress?.status === "in_progress" ? "Continue" : "Start Learning"}
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
