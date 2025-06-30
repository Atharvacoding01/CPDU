"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, Activity, Database, Zap, AlertCircle, Clock, DollarSign } from "lucide-react"

interface ChargingEvent {
  _id: string
  eventId: string
  chargerId: string
  stationName: string
  eventType: string
  timestamp: string
  data?: {
    status: string
    duration?: number
    costPerUnit?: number
    costPerMinute?: number
    totalCost?: number
    power?: number
    voltage?: number
  }
  sessionId?: string
}

interface ChargingSession {
  _id: string
  sessionId: string
  chargerId: string
  stationName: string
  userId?: string
  startTime: string
  endTime?: string
  status: string
  duration?: number
  totalEnergy?: number
  totalCost?: number
  costPerUnit?: number
  costPerMinute?: number
  paymentMethod?: string
  lastUpdated: string
}

interface SystemLog {
  _id: string
  level: string
  message: string
  timestamp: string
  source: string
  data?: any
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<ChargingEvent[]>([])
  const [sessions, setSessions] = useState<ChargingSession[]>([])
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = async () => {
    setLoading(true)
    try {
      const [eventsRes, sessionsRes, logsRes] = await Promise.all([
        fetch("/api/get-events?limit=50"),
        fetch("/api/get-sessions?limit=30"),
        fetch("/api/get-logs?limit=100"),
      ])

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(eventsData.events || [])
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setSessions(sessionsData.sessions || [])
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setLogs(logsData.logs || [])
      }

      setLastRefresh(new Date())
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "charging":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "cancelled":
      case "stopped":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "info":
        return "bg-blue-500"
      case "warning":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      case "debug":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  const totalRevenue = sessions
    .filter((s) => s.status === "completed" && s.totalCost)
    .reduce((sum, s) => sum + (s.totalCost || 0), 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">EV Charging Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor charging stations, sessions, and revenue</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">Last updated: {lastRefresh.toLocaleTimeString()}</p>
          <Button onClick={fetchData} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.filter((s) => s.status === "active").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Logs</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="sessions">Charging Sessions</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Recent Charging Events</CardTitle>
              <CardDescription>Latest events from all charging stations with ESP32 data</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{event.chargerId}</Badge>
                        <div>
                          <p className="font-medium">{event.stationName}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.eventType} • {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {event.data?.status && (
                          <Badge className={getStatusColor(event.data.status)}>{event.data.status}</Badge>
                        )}
                        {event.data?.duration && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(event.data.duration)}
                          </p>
                        )}
                        {event.data?.totalCost && (
                          <p className="text-sm font-medium">₹{event.data.totalCost.toFixed(2)}</p>
                        )}
                        {event.data?.costPerUnit && (
                          <p className="text-xs text-muted-foreground">₹{event.data.costPerUnit}/kWh</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && <p className="text-center text-muted-foreground py-8">No events found</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Charging Sessions</CardTitle>
              <CardDescription>Active and completed charging sessions with cost details</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{session.chargerId}</Badge>
                        <div>
                          <p className="font-medium">{session.stationName}</p>
                          <p className="text-sm text-muted-foreground">Session {session.sessionId.slice(0, 8)}...</p>
                          <p className="text-sm text-muted-foreground">
                            Started: {new Date(session.startTime).toLocaleString()}
                          </p>
                          {session.endTime && (
                            <p className="text-sm text-muted-foreground">
                              Ended: {new Date(session.endTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
                        {session.duration && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.duration)}
                          </p>
                        )}
                        {session.totalCost && <p className="text-sm font-medium">₹{session.totalCost.toFixed(2)}</p>}
                        {session.costPerUnit && (
                          <p className="text-xs text-muted-foreground">₹{session.costPerUnit}/kWh</p>
                        )}
                        {session.costPerMinute && (
                          <p className="text-xs text-muted-foreground">₹{session.costPerMinute}/min</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && <p className="text-center text-muted-foreground py-8">No sessions found</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>System activity, errors, and ESP32 communication logs</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log._id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge className={getLogLevelColor(log.level)}>{log.level}</Badge>
                      <div className="flex-1">
                        <p className="font-medium">{log.message}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{log.source}</span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        {log.data && (
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && <p className="text-center text-muted-foreground py-8">No logs found</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
