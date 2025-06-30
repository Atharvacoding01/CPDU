import { NextResponse } from "next/server"
import DatabaseService, { logActivity } from "@/lib/database"

// In-memory store for quick ESP32 polling (backup to database)
const commandStore = new Map<
  string,
  {
    command: string
    stationName: string
    timestamp: number
  }
>()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { command, chargerId, stationName } = body

    if (!command || !chargerId || !stationName) {
      return NextResponse.json(
        {
          message: "Missing required fields: command, chargerId, stationName",
        },
        { status: 400 },
      )
    }

    if (!["start", "stop", "status", "reset"].includes(command)) {
      return NextResponse.json({ message: "Invalid command." }, { status: 400 })
    }

    const db = DatabaseService.getInstance()

    // Save command to database
    const commandId = await db.saveCommand({
      commandId: crypto.randomUUID(),
      chargerId,
      stationName,
      command,
      timestamp: new Date(),
      executed: false,
    })

    // Store in memory for quick ESP32 access
    commandStore.set(chargerId, {
      command,
      stationName,
      timestamp: Date.now(),
    })

    await logActivity("info", `Command '${command}' sent to charger ${chargerId} at ${stationName}`, "api")

    return NextResponse.json(
      {
        message: `Command '${command}' sent to charger ${chargerId} at ${stationName}`,
        commandId,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("API Error (POST):", error)
    await logActivity("error", `Failed to process command: ${error}`, "api")
    return NextResponse.json({ message: "Error processing request." }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chargerId = searchParams.get("chargerId")

    if (!chargerId) {
      return NextResponse.json({ message: "chargerId parameter required" }, { status: 400 })
    }

    const db = DatabaseService.getInstance()

    // Get latest command from database
    const command = await db.getLatestCommand(chargerId)

    if (command) {
      return NextResponse.json(
        {
          commandId: command.commandId,
          chargerId: command.chargerId,
          stationName: command.stationName,
          command: command.command,
          timestamp: command.timestamp.getTime(),
        },
        { status: 200 },
      )
    }

    // Fallback to in-memory store
    const memoryCommand = commandStore.get(chargerId)
    if (memoryCommand) {
      return NextResponse.json(
        {
          chargerId,
          stationName: memoryCommand.stationName,
          command: memoryCommand.command,
          timestamp: memoryCommand.timestamp,
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        message: "No commands found for this charger",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("API Error (GET):", error)
    await logActivity("error", `Failed to get command: ${error}`, "api")
    return NextResponse.json({ message: "Error fetching command." }, { status: 500 })
  }
}

// Function for backward compatibility
export function getChargerSpecificCommand(chargerId: string): { command: string | null; timestamp: number } {
  const memoryCommand = commandStore.get(chargerId)
  if (memoryCommand) {
    return {
      command: memoryCommand.command,
      timestamp: memoryCommand.timestamp,
    }
  }
  return { command: null, timestamp: 0 }
}
