import { NextResponse } from "next/server"
import DatabaseService, { logActivity } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chargerId = searchParams.get("chargerId")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const db = DatabaseService.getInstance()
    const sessions = await db.getSessions(chargerId || undefined, limit)

    await logActivity("info", `Retrieved ${sessions.length} sessions`, "api")

    return NextResponse.json(
      {
        sessions,
        count: sessions.length,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Get Sessions API Error:", error)
    await logActivity("error", `Failed to get sessions: ${error}`, "api")
    return NextResponse.json(
      {
        message: "Error fetching sessions.",
        sessions: [],
      },
      { status: 500 },
    )
  }
}
