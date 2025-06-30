import { NextResponse } from "next/server"
import DatabaseService, { logActivity } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chargerId = searchParams.get("chargerId")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const db = DatabaseService.getInstance()
    const events = await db.getEvents(chargerId || undefined, limit)

    // Transform events for ESP32 compatibility (if needed)
    const transformedEvents = events.map((event) => ({
      eventId: event.eventId,
      chargerId: event.chargerId,
      stationName: event.stationName,
      command: event.eventType === "start" ? "start" : event.eventType === "stop" ? "stop" : "status",
      timestamp: event.timestamp.getTime(),
      data: event.data,
    }))

    await logActivity("info", `Retrieved ${events.length} events`, "api")

    return NextResponse.json(
      {
        events: transformedEvents,
        count: events.length,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Get Events API Error:", error)
    await logActivity("error", `Failed to get events: ${error}`, "api")
    return NextResponse.json(
      {
        message: "Error fetching events.",
        events: [],
      },
      { status: 500 },
    )
  }
}
