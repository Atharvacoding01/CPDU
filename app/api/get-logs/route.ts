import { NextResponse } from "next/server"
import DatabaseService from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const db = DatabaseService.getInstance()
    const logs = await db.getLogs(level || undefined, limit)

    return NextResponse.json(
      {
        logs,
        count: logs.length,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Get Logs API Error:", error)
    return NextResponse.json(
      {
        message: "Error fetching logs.",
        logs: [],
      },
      { status: 500 },
    )
  }
}
