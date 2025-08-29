import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Target } from "lucide-react"
import Link from "next/link"
import type { Database } from "@/lib/supabase/types"

type Problem = Database["public"]["Tables"]["problems"]["Row"]

interface ProblemListProps {
  problems: Problem[]
}

export function ProblemList({ problems }: ProblemListProps) {
  if (problems.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No problems found matching your criteria.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {problems.map((problem) => (
        <Card key={problem.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    <Link href={`/problems/${problem.slug}`} className="hover:underline">
                      {problem.title}
                    </Link>
                  </CardTitle>
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
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{problem.description}</p>
                <div className="flex flex-wrap gap-1">
                  {problem.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {problem.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{problem.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {problem.time_limit}ms
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link href={`/problems/${problem.slug}`}>Solve</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
