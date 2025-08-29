import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { executeCode } from "@/lib/judge"

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
    const { language, code, input = "" } = body

    if (!language || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Execute code
    const result = await executeCode(language, code, input)

    return NextResponse.json({
      success: result.passed || result.error === null,
      output: result.output,
      error: result.error,
      runtime: result.runtime,
      memory: result.memory,
    })
  } catch (error) {
    console.error("Code execution error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error",
        output: ""
      }, 
      { status: 500 }
    )
  }
}
