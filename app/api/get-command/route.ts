import { NextResponse } from "next/server"
import { getChargerSpecificCommand } from "../set-command/route" // Assuming this is in `app/api/set-command/route.ts`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chargerId = searchParams.get("chargerId")

  if (!chargerId) {
    // Still require chargerId in the request from ESP32 for this approach
    return NextResponse.json({ error: "chargerId_missing" }, { status: 400 })
  }

  try {
    const chargerData = getChargerSpecificCommand(chargerId) // This function returns { command: "start" | "stop" | "none", timestamp: number }

    let commandToSend = "none"
    if (chargerData) {
      commandToSend = chargerData.command
    }

    const responseObject = {
      chargerId: chargerId, // Include the requested chargerId in the response
      command: commandToSend, // The command for that charger
      timestamp: chargerData ? chargerData.timestamp : Date.now(), // Include timestamp
    }

    console.log(`API (get-command): For Charger ${chargerId}, sending JSON:`, responseObject)
    return NextResponse.json(responseObject, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error(`API Error (get-command for Charger ${chargerId}):`, error)
    return NextResponse.json({ error: "error_fetching_command", chargerId: chargerId }, { status: 500 })
  }
}
