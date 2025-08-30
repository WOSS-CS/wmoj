import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SubmissionList } from "@/components/submissions/submission-list"
import { SubmissionFilters } from "@/components/submissions/submission-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Clock, Code } from "lucide-react"

interface SubmissionsPageProps {
  searchParams: {
    status?: string
    language?: string
    problem?: string
  }
}

export default async function SubmissionsPage({ searchParams }: SubmissionsPageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Build query based on filters
  let query = supabase
    .from("submissions")
    .select(`
      *,
      problems (title, slug, difficulty)
    `)
    .eq("user_id", data.user.id)
    .order("submitted_at", { ascending: false })

  // status filter removed (status column dropped)

  if (searchParams.language) {
    query = query.eq("language", searchParams.language)
  }

  if (searchParams.problem) {
    query = query.eq("problem_id", searchParams.problem)
  }

  const { data: submissions } = await query

  const stats = {
    total: submissions?.length || 0,
    accepted: submissions?.filter((s: any) => (s.total_test_cases && s.test_cases_passed === s.total_test_cases) || s.score === 100).length || 0,
    rejected: submissions?.filter((s: any) => !((s.total_test_cases && s.test_cases_passed === s.total_test_cases) || s.score === 100)).length || 0,
    pending: 0,
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Submissions</h1>
        <p className="text-muted-foreground">Track your coding submission history and results</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0}% acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SubmissionFilters />
        </div>
        <div className="lg:col-span-3">
          <SubmissionList submissions={submissions || []} />
        </div>
      </div>
    </div>
  )
}
