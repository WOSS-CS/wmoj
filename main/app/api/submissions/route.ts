import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { judgeSubmission, LANGUAGE_CONFIGS } from "@/lib/judge"

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

    // Validate language
    if (!LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS]) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 })
    }

    // Create submission record (pending)
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        problem_id: problemId,
        contest_id: contestId || null,
        user_id: user.id,
        language,
        code,
        status: "running",
      })
      .select()
      .single()

    if (submissionError || !submission) {
      console.error("Submission error:", submissionError)
      return NextResponse.json({ error: "Failed to create submission" }, { status: 500 })
    }

    // Judge synchronously (serverless-safe)
    const judgeResult = await judgeSubmission(language, code, problemId)

    // Update submission with results
    const { data: updatedSubmission, error: updateError } = await supabase
      .from("submissions")
      .update({
        status: judgeResult.status,
        runtime: judgeResult.runtime,
        memory_used: judgeResult.memoryUsed,
        test_cases_passed: judgeResult.testCasesPassed,
        total_test_cases: judgeResult.totalTestCases,
        score: judgeResult.score,
        error_message: judgeResult.errorMessage,
        test_case_results: judgeResult.testCaseResults,
      })
      .eq("id", submission.id)
      .select()
      .single()

    if (updateError) {
      console.error("Submission update error:", updateError)
    }

    // Update user problem stats
    try {
      if (judgeResult.status === "accepted") {
        await supabase.from("user_problem_stats").upsert({
          user_id: user.id,
          problem_id: problemId,
          status: "solved",
          best_submission_id: submission.id,
          first_solved_at: new Date().toISOString(),
          attempts: 1,
          updated_at: new Date().toISOString(),
        })
      } else {
        await supabase.from("user_problem_stats").upsert({
          user_id: user.id,
          problem_id: problemId,
          status: "attempted",
          attempts: 1,
          updated_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error("Stats update error:", e)
    }

    return NextResponse.json({ submission: updatedSubmission || submission })
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
