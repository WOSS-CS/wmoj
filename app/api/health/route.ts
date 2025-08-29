import { NextRequest, NextResponse } from "next/server"
import { judge0Service } from "@/lib/judge/judge0"

export async function GET() {
  try {
    const connectionTest = await judge0Service.testConnection()
    
    return NextResponse.json({
      judge0: connectionTest,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Judge0 health check failed:', error)
    return NextResponse.json(
      {
        judge0: {
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
