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
    const { language, code, input = "", timeLimit, memoryLimit } = body

    if (!language || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log('Code execution request:', {
      language,
      codeLength: code.length,
      hasInput: !!input,
      timeLimit,
      memoryLimit,
      userId: user.id
    })

    // Execute code with optional limits
    const result = await executeCode(
      language, 
      code, 
      input, 
      timeLimit || 5, 
      memoryLimit || 128000
    )

    console.log('Code execution result:', {
      passed: result.passed,
      hasOutput: !!result.output,
      hasError: !!result.error,
      runtime: result.runtime,
      memory: result.memory
    })

    return NextResponse.json({
      success: result.passed || result.error === null,
      output: result.output,
      error: result.error,
      runtime: result.runtime,
      memory: result.memory,
      status: result.status || 'Unknown',
      details: result.details || {},
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Code execution error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error",
        output: "",
        runtime: 0,
        memory: 0,
        status: 'Error',
        details: {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        },
        timestamp: new Date().toISOString(),
      }, 
      { status: 500 }
    )
  }
}
