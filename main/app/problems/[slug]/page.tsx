import { notFound, redirect } from "next/navigation"
import { getProblem } from "@/lib/supabase/queries"
import { createClient } from "@/lib/supabase/server"
import { CodeEditor } from "@/components/problems/code-editor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Database } from "lucide-react"

interface ProblemPageProps {
  params: {
    slug: string
  }
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const problem = await getProblem(params.slug)

  if (!problem) {
    notFound()
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Problem Description */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-2xl font-bold">{problem.title}</h1>
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

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {problem.time_limit}ms
              </div>
              <div className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                {problem.memory_limit}MB
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {problem.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Problem Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{problem.description}</p>
              </div>
            </CardContent>
          </Card>

          {problem.input_format && (
            <Card>
              <CardHeader>
                <CardTitle>Input Format</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{problem.input_format}</p>
              </CardContent>
            </Card>
          )}

          {problem.output_format && (
            <Card>
              <CardHeader>
                <CardTitle>Output Format</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{problem.output_format}</p>
              </CardContent>
            </Card>
          )}

          {problem.constraints && (
            <Card>
              <CardHeader>
                <CardTitle>Constraints</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm font-mono">{problem.constraints}</p>
              </CardContent>
            </Card>
          )}

          {/* Sample input/output section removed; authors can include examples inside description */}
        </div>

        {/* Code Editor */}
        <div className="space-y-6">
          <CodeEditor 
            problemId={problem.id} 
            problem={{
              title: problem.title,
              time_limit: problem.time_limit,
              memory_limit: problem.memory_limit,
            }}
          />
        </div>
      </div>
    </div>
  )
}
