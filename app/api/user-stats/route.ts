import { createClient } from "@/lib/supabase/server"
import { updateUserProblemStats } from "@/lib/supabase/queries"
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
    const { problemId, status } = body

    if (!problemId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await updateUserProblemStats(user.id, problemId, status)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
