import { NextRequest, NextResponse } from "next/server"
import { customJudgeService } from "@/lib/judge/customJudge"

export async function GET() {
  try {
    const connectionTest = await customJudgeService.testConnection()
    
    return NextResponse.json({
      customAPI: connectionTest,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Custom API health check failed:', error)
    return NextResponse.json(
      {
        customAPI: {
          connected: false,
          endpoint: 'none',
          error: (error as Error).message
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
