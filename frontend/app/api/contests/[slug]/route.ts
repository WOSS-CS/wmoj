import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient()

    // Get contest by slug
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .select(`
        *,
        contest_registrations(count)
      `)
      .eq("slug", params.slug)
      .single()

    if (contestError || !contest) {
      return Response.json({ error: "Contest not found" }, { status: 404 })
    }

    // Add participant count from the aggregated data
    const contestWithCount = {
      ...contest,
      participant_count: contest.contest_registrations?.[0]?.count || 0
    }

    // Remove the nested registration data
    delete contestWithCount.contest_registrations

    return Response.json(contestWithCount)
  } catch (error) {
    console.error("Database error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
