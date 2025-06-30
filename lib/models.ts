export interface ChargingEvent {
  _id?: string
  eventId: string
  chargerId: string
  stationName: string
  eventType: "start" | "stop" | "error" | "status_update"
  timestamp: Date
  data: {
    voltage?: number
    current?: number
    power?: number
    energy?: number
    temperature?: number
    status: "starting" | "charging" | "stopped" | "error" | "idle"
    errorCode?: string
    errorMessage?: string
    duration?: number // in seconds (for stop events)
    costPerUnit?: number // cost per kWh from ESP32
    costPerMinute?: number // cost per minute from ESP32
    totalCost?: number // calculated total cost
    userId?: string
  }
  sessionId?: string
}

export interface ChargingSession {
  _id?: string
  sessionId: string
  chargerId: string
  stationName: string
  userId?: string
  startTime: Date
  endTime?: Date
  status: "active" | "completed" | "cancelled" | "error"
  duration?: number // in seconds
  totalEnergy?: number
  totalCost?: number
  costPerUnit?: number // from ESP32
  costPerMinute?: number // from ESP32
  paymentMethod?: string
  lastUpdated: Date
}

export interface SystemLog {
  _id?: string
  level: "info" | "warning" | "error" | "debug"
  message: string
  timestamp: Date
  source: string
  data?: any
}

export interface Command {
  _id?: string
  commandId: string
  chargerId: string
  stationName: string
  command: "start" | "stop" | "status" | "reset"
  timestamp: Date
  executed: boolean
  response?: {
    status: string
    duration?: number
    costPerUnit?: number
    costPerMinute?: number
    totalCost?: number
    message?: string
  }
  executedAt?: Date
}

export interface ESP32Response {
  chargerId: string
  stationName: string
  status: string
  duration?: number
  costPerUnit?: number
  costPerMinute?: number
  totalCost?: number
  timestamp: number
}
