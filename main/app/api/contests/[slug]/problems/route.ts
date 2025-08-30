import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient()

    // Get contest ID first
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .select("id")
      .eq("slug", params.slug)
      .single()

    if (contestError || !contest) {
      return Response.json({ error: "Contest not found" }, { status: 404 })
    }

    // Get contest problems with problem details
    const { data: problems, error: problemsError } = await supabase
      .from("contest_problems")
      .select(`
        problem_id,
        points,
        order_index,
        problems (
          title,
          difficulty
        )
      `)
      .eq("contest_id", contest.id)
      .order("order_index")

    if (problemsError) {
      console.error("Problems error:", problemsError)
      return Response.json({ error: "Failed to fetch problems" }, { status: 500 })
    }

    // Format the response
    const formattedProblems = (problems || []).map((problem, idx) => {
      const indexChar = String.fromCharCode(65 + (problem.order_index ?? idx))
      return {
        problem_id: problem.problem_id,
        problem_index: indexChar,
        points: problem.points,
        order_index: problem.order_index,
        problem_title: problem.problems?.title || `Problem ${indexChar}`,
        problem_difficulty: problem.problems?.difficulty || null
      }
    })

    return Response.json(formattedProblems)
  } catch (error) {
    console.error("Database error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
