import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Code } from "lucide-react"
import Link from "next/link"
import type { Database } from "@/lib/supabase/types"

type Submission = Database["public"]["Tables"]["submissions"]["Row"] & {
  problems: {
    title: string
    slug: string
    difficulty: string
  }
}

interface SubmissionListProps {
  submissions: Submission[]
}

export function SubmissionList({ submissions }: SubmissionListProps) {
  const isAccepted = (s: any) => (s.total_test_cases && s.test_cases_passed === s.total_test_cases) || s.score === 100
  const statusBadge = (s: any) => (
    <Badge className={isAccepted(s) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
      {isAccepted(s) ? "ACCEPTED" : "REJECTED"}
    </Badge>
  )

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No submissions found. Start solving problems to see your submissions here!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <Card key={submission.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    <Link href={`/problems/${submission.problems.slug}`} className="hover:underline">
                      {submission.problems.title}
                    </Link>
                  </CardTitle>
                  <Badge
                    variant={
                      submission.problems.difficulty === "Easy"
                        ? "secondary"
                        : submission.problems.difficulty === "Medium"
                          ? "default"
                          : "destructive"
                    }
                    className={
                      submission.problems.difficulty === "Easy"
                        ? "bg-green-100 text-green-800"
                        : submission.problems.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }
                  >
                    {submission.problems.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {isAccepted(submission) ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {statusBadge(submission)}
                  </div>
                  <Badge variant="outline">{submission.language}</Badge>
                  <span>{new Date(submission.submitted_at).toLocaleString()}</span>
                </div>
                {isAccepted(submission) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Runtime: {submission.runtime}ms</span>
                    <span>Memory: {Math.round((submission.memory_used || 0) / 1024)}KB</span>
                    <span>
                      Score: {submission.test_cases_passed}/{submission.total_test_cases}
                    </span>
                  </div>
                )}
              </div>
              <Button asChild size="sm" variant="outline" className="bg-transparent">
                <Link href={`/submissions/${submission.id}`}>View Details</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
