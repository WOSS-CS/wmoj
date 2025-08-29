import { type NextRequest, NextResponse } from "next/server"
import { customJudgeService } from "@/lib/judge/customJudge"

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      services: {}
    }

    // Test custom judge API
    if (process.env.CUSTOM_JUDGE_API_URL) {
      try {
        const customResult = await customJudgeService.testConnection()
        results.services.customJudge = {
          enabled: true,
          endpoint: customResult.endpoint,
          connected: customResult.connected,
          error: customResult.error,
          supportedLanguages: customResult.supportedLanguages
        }
      } catch (error) {
        results.services.customJudge = {
          enabled: true,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    } else {
      results.services.customJudge = {
        enabled: false,
        reason: 'CUSTOM_JUDGE_API_URL not configured'
      }
    }

    // Determine overall health
    const customJudgeWorking = results.services.customJudge.enabled && results.services.customJudge.connected
    
    results.healthy = customJudgeWorking
    results.fallbackMode = !customJudgeWorking

    const status = customJudgeWorking ? 200 : 503

    return NextResponse.json(results, { status })
  } catch (error) {
    console.error("Judge health check error:", error)
    return NextResponse.json(
      { 
        healthy: false,
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}
