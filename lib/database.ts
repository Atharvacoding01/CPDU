import { connectToDatabase } from "./mongodb"
import type { ChargingEvent, ChargingSession, SystemLog, Command, ESP32Response } from "./models"

class DatabaseService {
  private static instance: DatabaseService

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  async logEvent(event: Omit<ChargingEvent, "_id">): Promise<string> {
    try {
      const { db } = await connectToDatabase()
      const result = await db.collection("events").insertOne({
        ...event,
        timestamp: new Date(),
      })

      await this.logActivity(
        "info",
        `Event logged: ${event.eventType} for charger ${event.chargerId} at ${event.stationName}`,
        "database",
      )
      return result.insertedId.toString()
    } catch (error) {
      await this.logActivity("error", `Failed to log event: ${error}`, "database")
      throw error
    }
  }

  async getEvents(chargerId?: string, limit = 100): Promise<ChargingEvent[]> {
    try {
      const { db } = await connectToDatabase()
      const query = chargerId ? { chargerId } : {}
      const events = await db.collection("events").find(query).sort({ timestamp: -1 }).limit(limit).toArray()

      return events.map((event) => ({
        ...event,
        _id: event._id.toString(),
      }))
    } catch (error) {
      await this.logActivity("error", `Failed to get events: ${error}`, "database")
      return []
    }
  }

  async createSession(session: Omit<ChargingSession, "_id">): Promise<string> {
    try {
      const { db } = await connectToDatabase()
      const result = await db.collection("sessions").insertOne({
        ...session,
        startTime: new Date(),
        lastUpdated: new Date(),
      })

      await this.logActivity(
        "info",
        `Session created: ${session.sessionId} for charger ${session.chargerId}`,
        "database",
      )
      return result.insertedId.toString()
    } catch (error) {
      await this.logActivity("error", `Failed to create session: ${error}`, "database")
      throw error
    }
  }

  async updateSession(sessionId: string, updates: Partial<ChargingSession>): Promise<void> {
    try {
      const { db } = await connectToDatabase()
      await db.collection("sessions").updateOne({ sessionId }, { $set: { ...updates, lastUpdated: new Date() } })

      await this.logActivity("info", `Session updated: ${sessionId}`, "database")
    } catch (error) {
      await this.logActivity("error", `Failed to update session: ${error}`, "database")
      throw error
    }
  }

  async getSessions(chargerId?: string, limit = 50): Promise<ChargingSession[]> {
    try {
      const { db } = await connectToDatabase()
      const query = chargerId ? { chargerId } : {}
      const sessions = await db.collection("sessions").find(query).sort({ startTime: -1 }).limit(limit).toArray()

      return sessions.map((session) => ({
        ...session,
        _id: session._id.toString(),
      }))
    } catch (error) {
      await this.logActivity("error", `Failed to get sessions: ${error}`, "database")
      return []
    }
  }

  async logActivity(level: SystemLog["level"], message: string, source: string, data?: any): Promise<void> {
    try {
      const { db } = await connectToDatabase()
      await db.collection("logs").insertOne({
        level,
        message,
        timestamp: new Date(),
        source,
        data,
      })
    } catch (error) {
      console.error("Failed to log activity:", error)
    }
  }

  async getLogs(level?: string, limit = 100): Promise<SystemLog[]> {
    try {
      const { db } = await connectToDatabase()
      const query = level ? { level } : {}
      const logs = await db.collection("logs").find(query).sort({ timestamp: -1 }).limit(limit).toArray()

      return logs.map((log) => ({
        ...log,
        _id: log._id.toString(),
      }))
    } catch (error) {
      console.error("Failed to get logs:", error)
      return []
    }
  }

  async saveCommand(command: Omit<Command, "_id">): Promise<string> {
    try {
      const { db } = await connectToDatabase()
      const result = await db.collection("commands").insertOne({
        ...command,
        timestamp: new Date(),
        executed: false,
      })

      await this.logActivity(
        "info",
        `Command saved: ${command.command} for charger ${command.chargerId} at ${command.stationName}`,
        "database",
      )
      return result.insertedId.toString()
    } catch (error) {
      await this.logActivity("error", `Failed to save command: ${error}`, "database")
      throw error
    }
  }

  async getLatestCommand(chargerId: string): Promise<Command | null> {
    try {
      const { db } = await connectToDatabase()
      const command = await db
        .collection("commands")
        .findOne({ chargerId, executed: false }, { sort: { timestamp: -1 } })

      if (command) {
        return {
          ...command,
          _id: command._id.toString(),
        }
      }
      return null
    } catch (error) {
      await this.logActivity("error", `Failed to get latest command: ${error}`, "database")
      return null
    }
  }

  async markCommandExecuted(commandId: string, response?: Command["response"]): Promise<void> {
    try {
      const { db } = await connectToDatabase()
      await db
        .collection("commands")
        .updateOne({ _id: commandId }, { $set: { executed: true, response, executedAt: new Date() } })
    } catch (error) {
      await this.logActivity("error", `Failed to mark command executed: ${error}`, "database")
    }
  }

  async processESP32Response(esp32Response: ESP32Response): Promise<void> {
    try {
      // Log the ESP32 response as an event
      await this.logEvent({
        eventId: crypto.randomUUID(),
        chargerId: esp32Response.chargerId,
        stationName: esp32Response.stationName,
        eventType: esp32Response.status === "stopped" ? "stop" : "status_update",
        timestamp: new Date(),
        data: {
          status: esp32Response.status as any,
          duration: esp32Response.duration,
          costPerUnit: esp32Response.costPerUnit,
          costPerMinute: esp32Response.costPerMinute,
          totalCost: esp32Response.totalCost,
        },
      })

      // If it's a stop command, update the session
      if (esp32Response.status === "stopped" && esp32Response.duration) {
        const sessions = await this.getSessions(esp32Response.chargerId, 1)
        if (sessions.length > 0 && sessions[0].status === "active") {
          await this.updateSession(sessions[0].sessionId, {
            status: "completed",
            endTime: new Date(),
            duration: esp32Response.duration,
            totalCost: esp32Response.totalCost,
            costPerUnit: esp32Response.costPerUnit,
            costPerMinute: esp32Response.costPerMinute,
          })
        }
      }

      await this.logActivity(
        "info",
        `ESP32 response processed for charger ${esp32Response.chargerId}`,
        "esp32",
        esp32Response,
      )
    } catch (error) {
      await this.logActivity("error", `Failed to process ESP32 response: ${error}`, "esp32")
      throw error
    }
  }
}

export const logEvent = async (event: Omit<ChargingEvent, "_id">): Promise<string> => {
  return DatabaseService.getInstance().logEvent(event)
}

export const logToDatabase = async (
  level: SystemLog["level"],
  message: string,
  source: string,
  data?: any,
): Promise<void> => {
  return DatabaseService.getInstance().logActivity(level, message, source, data)
}

export const logActivity = async (
  level: SystemLog["level"],
  message: string,
  source: string,
  data?: any,
): Promise<void> => {
  return DatabaseService.getInstance().logActivity(level, message, source, data)
}

export default DatabaseService
