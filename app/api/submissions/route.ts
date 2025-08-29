import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { problemId, contestId, language, code } = body

    if (!problemId || !language || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        problem_id: problemId,
        contest_id: contestId || null,
        user_id: user.id,
        language,
        code,
        status: "pending",
      })
      .select()
      .single()

    if (submissionError) {
      console.error("Submission error:", submissionError)
      return NextResponse.json({ error: "Failed to create submission" }, { status: 500 })
    }

    // Simulate judge processing (in real app, this would be handled by a separate judge service)
    setTimeout(async () => {
      const isAccepted = Math.random() > 0.3 // 70% acceptance rate for demo
      const status = isAccepted
        ? "accepted"
        : ["wrong_answer", "runtime_error", "time_limit_exceeded"][Math.floor(Math.random() * 3)]
      const runtime = isAccepted ? Math.floor(Math.random() * 1000) + 50 : null
      const memoryUsed = isAccepted ? Math.floor(Math.random() * 50000) + 10000 : null
      const testCasesPassed = isAccepted ? 10 : Math.floor(Math.random() * 8)
      const totalTestCases = 10
      const score = isAccepted ? 100 : 0

      await supabase
        .from("submissions")
        .update({
          status,
          runtime,
          memory_used: memoryUsed,
          test_cases_passed: testCasesPassed,
          total_test_cases: totalTestCases,
          score,
          error_message: !isAccepted ? "Test case failed: expected output does not match actual output" : null,
        })
        .eq("id", submission.id)
    }, 2000)

    return NextResponse.json({ submission })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const problemId = searchParams.get("problemId")
    const contestId = searchParams.get("contestId")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    let query = supabase
      .from("submissions")
      .select(`
        *,
        problems (title, slug)
      `)
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(limit)

    if (problemId) {
      query = query.eq("problem_id", problemId)
    }

    if (contestId) {
      query = query.eq("contest_id", contestId)
    }

    const { data: submissions, error } = await query

    if (error) {
      console.error("Query error:", error)
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
    }

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
