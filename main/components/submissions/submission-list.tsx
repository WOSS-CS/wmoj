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
  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800"
      case "wrong_answer":
      case "runtime_error":
      case "compilation_error":
        return "bg-red-100 text-red-800"
      case "time_limit_exceeded":
      case "memory_limit_exceeded":
        return "bg-yellow-100 text-yellow-800"
      case "pending":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4" />
      case "wrong_answer":
      case "runtime_error":
      case "compilation_error":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

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
                    {getStatusIcon(submission.status)}
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <Badge variant="outline">{submission.language}</Badge>
                  <span>{new Date(submission.submitted_at).toLocaleString()}</span>
                </div>
                {submission.status === "accepted" && (
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
