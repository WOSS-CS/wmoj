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
    const { problemId, contestId, contestSlug, language, code } = body

    if (!problemId || !language || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate language
    if (!LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS]) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 })
    }

    // Resolve contest UUID if a slug was passed from the client
    let contestUuid: string | null = null
    const maybeContest = (contestId || contestSlug) as string | undefined
    const isUuid = (v: string) => /^(\{)?[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[1-5][0-9a-fA-F]{3}\-[89abAB][0-9a-fA-F]{3}\-[0-9a-fA-F]{12}(\})?$/.test(v)
    if (maybeContest) {
      try {
        if (isUuid(maybeContest)) {
          contestUuid = maybeContest
        } else {
          const { data: c } = await supabase.from('contests').select('id').eq('slug', maybeContest).single()
          contestUuid = c?.id || null
        }
      } catch {
        contestUuid = null
      }
    }

    // Judge synchronously (serverless-safe) BEFORE inserting
    const judgeResult = await judgeSubmission(language, code, problemId)

    // Insert final submission with judged fields
    const { data: submission, error: submissionInsertError } = await supabase
      .from("submissions")
      .insert({
        problem_id: problemId,
        contest_id: contestUuid,
        user_id: user.id,
        language,
        code,
        // no status column anymore; store final metrics only
        runtime: judgeResult.runtime,
        memory_used: judgeResult.memoryUsed,
        test_cases_passed: judgeResult.testCasesPassed,
        total_test_cases: judgeResult.totalTestCases,
        score: judgeResult.score,
        error_message: judgeResult.errorMessage,
        test_case_results: judgeResult.testCaseResults,
      })
      .select()
      .single()

    if (submissionInsertError || !submission) {
      console.error("Submission insert error:", submissionInsertError)
      return NextResponse.json({ error: "Failed to save submission" }, { status: 500 })
    }

    // Update user problem stats
    try {
      if (judgeResult.status === "accepted" || judgeResult.score === 100 || (judgeResult.testCasesPassed === judgeResult.totalTestCases)) {
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
