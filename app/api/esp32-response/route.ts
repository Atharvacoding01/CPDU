import { NextResponse } from "next/server"
import DatabaseService, { logActivity } from "@/lib/database"
import type { ESP32Response } from "@/lib/models"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { chargerId, stationName, status, duration, costPerUnit, costPerMinute, totalCost, commandId } = body

    if (!chargerId || !stationName || !status) {
      return NextResponse.json(
        {
          message: "Missing required fields: chargerId, stationName, status",
        },
        { status: 400 },
      )
    }

    const esp32Response: ESP32Response = {
      chargerId,
      stationName,
      status,
      duration,
      costPerUnit,
      costPerMinute,
      totalCost,
      timestamp: Date.now(),
    }

    const db = DatabaseService.getInstance()

    // Process the ESP32 response (log event, update session)
    await db.processESP32Response(esp32Response)

    // Mark command as executed if commandId provided
    if (commandId) {
      await db.markCommandExecuted(commandId, {
        status,
        duration,
        costPerUnit,
        costPerMinute,
        totalCost,
        message: "Command executed successfully",
      })
    }

    await logActivity("info", `ESP32 response received from charger ${chargerId}`, "esp32", esp32Response)

    return NextResponse.json(
      {
        message: "ESP32 response processed successfully",
        received: esp32Response,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("ESP32 Response API Error:", error)
    await logActivity("error", `Failed to process ESP32 response: ${error}`, "esp32")
    return NextResponse.json({ message: "Error processing ESP32 response." }, { status: 500 })
  }
}
