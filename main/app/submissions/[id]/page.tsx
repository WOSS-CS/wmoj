import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, ArrowLeft, Copy } from "lucide-react"
import Link from "next/link"

interface SubmissionPageProps {
  params: {
    id: string
  }
}

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select(`
      *,
      problems (title, slug, difficulty),
      contests (title, slug)
    `)
    .eq("id", params.id)
    .eq("user_id", data.user.id)
    .single()

  if (!submission) {
    notFound()
  }

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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/submissions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Submission Details</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Submission Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(submission.status)}
                Submission Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(submission.status)}>
                  {submission.status.replace("_", " ").toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Submitted {new Date(submission.submitted_at).toLocaleString()}
                </span>
              </div>

              {submission.status === "accepted" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-sm font-medium text-green-800">Runtime</div>
                    <div className="text-lg font-bold text-green-900">{submission.runtime}ms</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-sm font-medium text-green-800">Memory</div>
                    <div className="text-lg font-bold text-green-900">
                      {Math.round((submission.memory_used || 0) / 1024)}KB
                    </div>
                  </div>
                </div>
              )}

              {submission.test_cases_passed !== null && (
                <div className="bg-muted rounded-md p-3">
                  <div className="text-sm font-medium mb-1">Test Cases</div>
                  <div className="text-lg font-bold">
                    {submission.test_cases_passed} / {submission.total_test_cases} passed
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        submission.test_cases_passed === submission.total_test_cases ? "bg-green-500" : "bg-red-500"
                      }`}
                      style={{
                        width: `${(submission.test_cases_passed / submission.total_test_cases) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {submission.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="text-sm font-medium text-red-800 mb-1">Error Message</div>
                  <p className="text-sm text-red-700 font-mono">{submission.error_message}</p>
                </div>
              )}

              {/* Test Case Results */}
              {submission.test_case_results && Array.isArray(submission.test_case_results) && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Test Case Details:</div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {submission.test_case_results.slice(0, 10).map((testCase: any, index: number) => (
                      <div 
                        key={index} 
                        className={`border rounded-md p-3 text-sm ${
                          testCase.passed 
                            ? "border-green-200 bg-green-50" 
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Test Case {index + 1}</span>
                          <Badge 
                            variant="outline" 
                            className={testCase.passed ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}
                          >
                            {testCase.passed ? "✓ Passed" : "✗ Failed"}
                          </Badge>
                        </div>
                        {testCase.runtime && (
                          <div className="text-xs text-muted-foreground mb-1">
                            Runtime: {testCase.runtime}ms | Memory: {Math.round((testCase.memory || 0) / 1024)}KB
                          </div>
                        )}
                        {!testCase.passed && (
                          <div className="space-y-1 font-mono text-xs">
                            <div className="truncate">
                              <span className="font-medium">Input:</span> {testCase.input.length > 50 ? testCase.input.substring(0, 50) + '...' : testCase.input}
                            </div>
                            <div className="truncate">
                              <span className="font-medium">Expected:</span> {testCase.expected.length > 50 ? testCase.expected.substring(0, 50) + '...' : testCase.expected}
                            </div>
                            <div className="truncate">
                              <span className="font-medium">Got:</span> {testCase.actual.length > 50 ? testCase.actual.substring(0, 50) + '...' : testCase.actual}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {submission.test_case_results.length > 10 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        ... and {submission.test_case_results.length - 10} more test cases
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Code */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Submitted Code</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{submission.language}</Badge>
                  <Button size="sm" variant="outline">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
                <code>{submission.code}</code>
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Problem Info */}
          <Card>
            <CardHeader>
              <CardTitle>Problem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Link href={`/problems/${submission.problems.slug}`} className="text-lg font-medium hover:underline">
                  {submission.problems.title}
                </Link>
              </div>
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
              <div className="pt-2">
                <Button asChild size="sm" className="w-full">
                  <Link href={`/problems/${submission.problems.slug}`}>View Problem</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contest Info */}
          {submission.contests && (
            <Card>
              <CardHeader>
                <CardTitle>Contest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Link href={`/contests/${submission.contests.slug}`} className="text-lg font-medium hover:underline">
                    {submission.contests.title}
                  </Link>
                </div>
                <div className="pt-2">
                  <Button asChild size="sm" variant="outline" className="w-full bg-transparent">
                    <Link href={`/contests/${submission.contests.slug}`}>View Contest</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild size="sm" className="w-full">
                <Link href={`/problems/${submission.problems.slug}`}>Try Again</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full bg-transparent">
                <Link href="/submissions">View All Submissions</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
