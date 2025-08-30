import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getRecentActivity } from "@/lib/supabase/queries"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "10")

    const activities = await getRecentActivity(user.id, limit)

    return NextResponse.json(activities)
  } catch (error) {
    console.error("Error fetching recent activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
