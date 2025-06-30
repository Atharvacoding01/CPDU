import { NextResponse } from "next/server"

// In-memory store for the latest command.
// WARNING: This is not persistent and will reset on serverless function cold starts or redeployments.
// For a production app, use a database (Vercel KV, Supabase, Neon, etc.)
let latestCommand: string | null = null
let lastCommandTimestamp: number = Date.now()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const command = body.command

    if (command === "start" || command === "stop") {
      latestCommand = command
      lastCommandTimestamp = Date.now()
      console.log(`API: Received command: ${command}`)
      return NextResponse.json({ message: `Command '${command}' received and stored.` }, { status: 200 })
    } else {
      return NextResponse.json({ message: "Invalid command." }, { status: 400 })
    }
  } catch (error) {
    console.error("API Error (POST):", error)
    return NextResponse.json({ message: "Error processing request." }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // This endpoint is for the ESP32 to poll for commands
  try {
    // Optional: Implement a simple long-polling mechanism or just return the latest command.
    // For simplicity, just returning the latest command.
    // You might want to add a timestamp check to avoid sending old commands repeatedly.

    // Example: Only send command if it's new (e.g., within last 30 seconds)
    // const espLastCheckTimestamp = Number(request.headers.get('X-ESP-Last-Check')) || 0;
    // if (latestCommand && lastCommandTimestamp > espLastCheckTimestamp) {
    //   return NextResponse.json({ command: latestCommand, timestamp: lastCommandTimestamp }, { status: 200 });
    // }

    if (latestCommand) {
      const commandToSend = latestCommand
      // Optional: Clear the command after sending it to the ESP32 to ensure it's processed once.
      // latestCommand = null;
      return NextResponse.json({ command: commandToSend, timestamp: lastCommandTimestamp }, { status: 200 })
    } else {
      return NextResponse.json({ command: null, message: "No new command." }, { status: 200 }) // Or 204 No Content
    }
  } catch (error) {
    console.error("API Error (GET):", error)
    return NextResponse.json({ message: "Error fetching command." }, { status: 500 })
  }
}
