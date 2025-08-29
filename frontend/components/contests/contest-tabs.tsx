"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Target, Trophy } from "lucide-react"
import Link from "next/link"
import type { Database } from "@/lib/supabase/types"

type Contest = Database["public"]["Tables"]["contests"]["Row"]
type Problem = Database["public"]["Tables"]["problems"]["Row"] & { points: number; order_index: number }

interface ContestTabsProps {
  contest: Contest
  problems: Problem[]
  userId: string
}

export function ContestTabs({ contest, problems, userId }: ContestTabsProps) {
  return (
    <Tabs defaultValue="problems" className="space-y-6">
      <TabsList>
        <TabsTrigger value="problems">Problems</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="submissions">My Submissions</TabsTrigger>
        <TabsTrigger value="rules">Rules</TabsTrigger>
      </TabsList>

      <TabsContent value="problems">
        <Card>
          <CardHeader>
            <CardTitle>Contest Problems</CardTitle>
            <CardDescription>Solve these problems to earn points and climb the leaderboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {problems.map((problem, index) => (
                <div key={problem.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">{problem.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            problem.difficulty === "Easy"
                              ? "secondary"
                              : problem.difficulty === "Medium"
                                ? "default"
                                : "destructive"
                          }
                          className={
                            problem.difficulty === "Easy"
                              ? "bg-green-100 text-green-800"
                              : problem.difficulty === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {problem.difficulty}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{problem.points} points</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {problem.time_limit}ms
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/problems/${problem.slug}?contest=${contest.slug}`}>Solve</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="leaderboard">
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Current standings for this contest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Leaderboard will be displayed here during the contest.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="submissions">
        <Card>
          <CardHeader>
            <CardTitle>My Submissions</CardTitle>
            <CardDescription>Track your submission history for this contest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Your submissions will appear here once you start solving problems.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rules">
        <Card>
          <CardHeader>
            <CardTitle>Contest Rules</CardTitle>
            <CardDescription>Important information about this contest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Scoring</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Each problem has a fixed point value</li>
                <li>You get full points for a correct solution</li>
                <li>No partial credit for incorrect solutions</li>
                <li>Faster submissions break ties</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Submission Rules</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>You can submit multiple times for each problem</li>
                <li>Only your best submission counts</li>
                <li>Time limit and memory limit must be respected</li>
                <li>Code must be your own work</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Conduct</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>No collaboration with other participants</li>
                <li>No external help or resources during the contest</li>
                <li>Violations may result in disqualification</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
