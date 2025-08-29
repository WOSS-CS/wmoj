"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Save, ArrowLeft, Calendar, Trophy, Users } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"

interface ContestProblem {
  problemId: string
  problemIndex: string
  points: number
  penaltyMinutes: number
  orderIndex: number
  problemTitle?: string
}

interface Problem {
  id: string
  title: string
  slug: string
  difficulty: string
}

export function ContestCreator() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Basic contest info
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [contestType, setContestType] = useState<"icpc" | "ioi" | "atcoder" | "codeforces">("icpc")
  const [difficultyLevel, setDifficultyLevel] = useState<"beginner" | "intermediate" | "advanced" | "expert">("beginner")
  const [prizePool, setPrizePool] = useState(0)
  const [rules, setRules] = useState("")

  // Timing
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [registrationStart, setRegistrationStart] = useState("")
  const [registrationEnd, setRegistrationEnd] = useState("")

  // Settings
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null)
  const [isPublic, setIsPublic] = useState(true)
  const [isRated, setIsRated] = useState(true)

  // Problems
  const [contestProblems, setContestProblems] = useState<ContestProblem[]>([])
  const [availableProblems, setAvailableProblems] = useState<Problem[]>([])
  const [selectedProblemId, setSelectedProblemId] = useState("")

  const [isLoading, setIsLoading] = useState(false)

  // Load available problems
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch('/api/problems?limit=100')
        const data = await response.json()
        if (response.ok) {
          setAvailableProblems(data.problems || [])
        }
      } catch (error) {
        console.error('Failed to fetch problems:', error)
      }
    }
    fetchProblems()

    // Set default times (contest tomorrow, 2 hours duration)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(14, 0, 0, 0) // 2 PM tomorrow
    
    const contestEnd = new Date(tomorrow)
    contestEnd.setHours(16, 0, 0, 0) // 4 PM tomorrow
    
    const regEnd = new Date(tomorrow)
    regEnd.setHours(13, 30, 0, 0) // 1:30 PM tomorrow
    
    setStartTime(tomorrow.toISOString().slice(0, 16))
    setEndTime(contestEnd.toISOString().slice(0, 16))
    setRegistrationEnd(regEnd.toISOString().slice(0, 16))
    setRegistrationStart(new Date().toISOString().slice(0, 16))
  }, [])

  // Generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value)
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    setSlug(generatedSlug)
  }

  // Add problem to contest
  const addProblem = () => {
    if (!selectedProblemId) return

    const problem = availableProblems.find(p => p.id === selectedProblemId)
    if (!problem) return

    // Check if problem already added
    if (contestProblems.find(cp => cp.problemId === selectedProblemId)) {
      alert('This problem is already added to the contest')
      return
    }

    const newProblem: ContestProblem = {
      problemId: selectedProblemId,
      problemIndex: String.fromCharCode(65 + contestProblems.length), // A, B, C...
      points: 100,
      penaltyMinutes: 20,
      orderIndex: contestProblems.length,
      problemTitle: problem.title
    }

    setContestProblems([...contestProblems, newProblem])
    setSelectedProblemId("")
  }

  // Remove problem from contest
  const removeProblem = (index: number) => {
    const updated = contestProblems.filter((_, i) => i !== index)
    // Reindex problems
    const reindexed = updated.map((problem, i) => ({
      ...problem,
      problemIndex: String.fromCharCode(65 + i),
      orderIndex: i
    }))
    setContestProblems(reindexed)
  }

  // Update problem details
  const updateProblem = (index: number, field: keyof ContestProblem, value: any) => {
    const updated = contestProblems.map((problem, i) => 
      i === index ? { ...problem, [field]: value } : problem
    )
    setContestProblems(updated)
  }

  // Create contest
  const createContest = async () => {
    if (!user) {
      alert("Please log in to create contests")
      return
    }

    if (!title || !slug || !startTime || !endTime || !registrationEnd) {
      alert("Please fill in all required fields")
      return
    }

    if (contestProblems.length === 0) {
      alert("Please add at least one problem to the contest")
      return
    }

    setIsLoading(true)
    try {
      const contestData = {
        title,
        slug,
        description,
        startTime,
        endTime,
        registrationStart,
        registrationEnd,
        maxParticipants,
        isPublic,
        isRated,
        contestType,
        difficultyLevel,
        prizePool,
        rules,
        problems: contestProblems.map(cp => ({
          problemId: cp.problemId,
          problemIndex: cp.problemIndex,
          points: cp.points,
          penaltyMinutes: cp.penaltyMinutes,
          orderIndex: cp.orderIndex
        }))
      }

      const response = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contestData),
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Contest created successfully! Added ${result.stats.problems} problems.`)
        router.push(`/contests/${result.contest.slug}`)
      } else {
        const error = await response.json()
        alert(`Error creating contest: ${error.error}`)
      }
    } catch (error) {
      alert("Error creating contest")
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p>Please log in to create contests.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/contests")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contests
        </Button>
        <h1 className="text-3xl font-bold">Create New Contest</h1>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Contest Details</TabsTrigger>
          <TabsTrigger value="timing">Timing & Settings</TabsTrigger>
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Contest Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., Weekly Contest #1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g., weekly-contest-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contest description, rules, or welcome message..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contest Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label>Contest Type</Label>
                    <Select value={contestType} onValueChange={(value: any) => setContestType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="icpc">ICPC Style</SelectItem>
                        <SelectItem value="ioi">IOI Style</SelectItem>
                        <SelectItem value="atcoder">AtCoder Style</SelectItem>
                        <SelectItem value="codeforces">Codeforces Style</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Difficulty Level</Label>
                    <Select value={difficultyLevel} onValueChange={(value: any) => setDifficultyLevel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="prizePool">Prize Pool ($)</Label>
                  <Input
                    id="prizePool"
                    type="number"
                    value={prizePool}
                    onChange={(e) => setPrizePool(parseInt(e.target.value) || 0)}
                    min="0"
                    step="10"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isPublic"
                      checked={isPublic}
                      onCheckedChange={(checked: boolean) => setIsPublic(checked)}
                    />
                    <Label htmlFor="isPublic">Public Contest</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRated"
                      checked={isRated}
                      onCheckedChange={(checked: boolean) => setIsRated(checked)}
                    />
                    <Label htmlFor="isRated">Rated Contest</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Additional Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Any specific rules or guidelines for this contest..."
                rows={4}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Contest Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="startTime">Contest Start Time *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">Contest End Time *</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>

                {startTime && endTime && (
                  <div className="text-sm text-muted-foreground">
                    Duration: {Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))} minutes
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Registration Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="registrationStart">Registration Start</Label>
                  <Input
                    id="registrationStart"
                    type="datetime-local"
                    value={registrationStart}
                    onChange={(e) => setRegistrationStart(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="registrationEnd">Registration End *</Label>
                  <Input
                    id="registrationEnd"
                    type="datetime-local"
                    value={registrationEnd}
                    onChange={(e) => setRegistrationEnd(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={maxParticipants || ""}
                    onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : null)}
                    min="1"
                    placeholder="Unlimited"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="problems" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contest Problems</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedProblemId} onValueChange={setSelectedProblemId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a problem..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProblems
                        .filter(p => !contestProblems.find(cp => cp.problemId === p.id))
                        .map(problem => (
                          <SelectItem key={problem.id} value={problem.id}>
                            {problem.title} ({problem.difficulty})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addProblem} disabled={!selectedProblemId}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {contestProblems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No problems added yet.</p>
                  <p className="text-sm mt-1">Add problems to create your contest.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contestProblems.map((problem, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">
                          Problem {problem.problemIndex}: {problem.problemTitle}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeProblem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div>
                          <Label>Problem Index</Label>
                          <Input
                            value={problem.problemIndex}
                            onChange={(e) => updateProblem(index, 'problemIndex', e.target.value)}
                            placeholder="A"
                          />
                        </div>
                        <div>
                          <Label>Points</Label>
                          <Input
                            type="number"
                            value={problem.points}
                            onChange={(e) => updateProblem(index, 'points', parseInt(e.target.value) || 100)}
                            min="1"
                          />
                        </div>
                        <div>
                          <Label>Penalty (minutes)</Label>
                          <Input
                            type="number"
                            value={problem.penaltyMinutes}
                            onChange={(e) => updateProblem(index, 'penaltyMinutes', parseInt(e.target.value) || 20)}
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {title || "Untitled Contest"}
                    <Badge className={
                      difficultyLevel === "beginner" ? "bg-green-100 text-green-800" :
                      difficultyLevel === "intermediate" ? "bg-blue-100 text-blue-800" :
                      difficultyLevel === "advanced" ? "bg-orange-100 text-orange-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {difficultyLevel}
                    </Badge>
                    <Badge variant="outline">{contestType.toUpperCase()}</Badge>
                  </CardTitle>
                  {description && (
                    <p className="text-muted-foreground mt-2">{description}</p>
                  )}
                </div>
                <Button onClick={createContest} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Creating..." : "Create Contest"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{contestProblems.length}</div>
                  <div className="text-sm text-muted-foreground">Problems</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {startTime && endTime ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)) : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">${prizePool}</div>
                  <div className="text-sm text-muted-foreground">Prize Pool</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{maxParticipants || "∞"}</div>
                  <div className="text-sm text-muted-foreground">Max Participants</div>
                </div>
              </div>

              {startTime && (
                <div>
                  <h3 className="font-semibold mb-2">Schedule</h3>
                  <div className="space-y-2 text-sm">
                    <div>Registration: {registrationStart ? new Date(registrationStart).toLocaleString() : "Now"} - {new Date(registrationEnd).toLocaleString()}</div>
                    <div>Contest: {new Date(startTime).toLocaleString()} - {new Date(endTime).toLocaleString()}</div>
                  </div>
                </div>
              )}

              {contestProblems.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Problems ({contestProblems.length})</h3>
                  <div className="space-y-2">
                    {contestProblems.map((problem, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span>{problem.problemIndex}. {problem.problemTitle}</span>
                        <Badge variant="secondary">{problem.points} pts</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rules && (
                <div>
                  <h3 className="font-semibold mb-2">Rules</h3>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{rules}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
