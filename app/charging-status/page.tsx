"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, XCircle, Loader2, AlertTriangleIcon, HomeIcon, MapPin, ArrowLeft } from "lucide-react"
import Image from "next/image"

type ChargingUiStatus = "Unknown" | "Charging" | "Stopping" | "Stopped" | "Error"

type ChargingData = {
  power: number
  amountPaid: number
  duration: number // seconds
  status: ChargingUiStatus
  ratePerKwh: number
}

export default function ChargingStatusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [uiStatus, setUiStatus] = useState<ChargingUiStatus>("Charging")
  const [feedbackMessage, setFeedbackMessage] = useState("Vehicle is charging.")
  const [sessionInfo, setSessionInfo] = useState<{
    chargerId: string
    stationId: string
    stationName: string
    city: string
  } | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [chargingData, setChargingData] = useState<ChargingData>({
    power: 0,
    amountPaid: 0,
    duration: 0,
    status: "Charging",
    ratePerKwh: 8,
  })
  const [showPopup, setShowPopup] = useState(false)
  const [popupAmount, setPopupAmount] = useState(0)
  const [returningCountdown, setReturningCountdown] = useState(5)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize the session info extraction to prevent unnecessary re-renders
  const extractSessionInfo = useCallback(() => {
    const chargerId = searchParams.get("chargerId")
    const stationId = searchParams.get("stationId")
    const stationName = searchParams.get("stationName")
    const city = searchParams.get("city")

    if (chargerId && stationId && stationName && city) {
      return {
        chargerId,
        stationId,
        stationName: decodeURIComponent(stationName),
        city: decodeURIComponent(city),
      }
    }
    return null
  }, [searchParams])

  useEffect(() => {
    if (!isInitialized) {
      const info = extractSessionInfo()
      if (info) {
        setSessionInfo(info)
        setUiStatus("Charging")
        setFeedbackMessage(`Charger ${info.chargerId} at ${info.stationName}: Vehicle is charging.`)
      } else {
        setUiStatus("Error")
        setFeedbackMessage("Error: Session information not found.")
      }
      setIsInitialized(true)
    }
  }, [extractSessionInfo, isInitialized])

  // Polling for real-time charging data
  useEffect(() => {
    if (!sessionInfo) return
    const fetchChargingData = async () => {
      try {
        // Replace with your real API endpoint
        const res = await fetch(`/api/charging-status?chargerId=${sessionInfo.chargerId}&stationId=${sessionInfo.stationId}`)
        if (!res.ok) throw new Error("Failed to fetch charging data")
        const data = await res.json()
        setChargingData({
          power: data.power,
          amountPaid: data.amountPaid,
          duration: data.duration,
          status: data.status,
          ratePerKwh: data.ratePerKwh ?? 8,
        })
        setUiStatus(data.status)
      } catch {
        // fallback: keep previous data, maybe show error
      }
    }
    fetchChargingData()
    intervalRef.current = setInterval(fetchChargingData, 2000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sessionInfo])

  // Show popup and start countdown when stopped
  useEffect(() => {
    if (uiStatus === "Stopped") {
      setPopupAmount(chargingData.amountPaid)
      setShowPopup(true)
      setReturningCountdown(5)
      const timer = setInterval(() => {
        setReturningCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push("/")
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [uiStatus])

  const handleStopCharging = async () => {
    if (!sessionInfo) {
      setUiStatus("Error")
      setFeedbackMessage("Error: Session information missing. Cannot stop.")
      return
    }
    setUiStatus("Stopping")
    setFeedbackMessage(`Stopping charging session at ${sessionInfo.stationName}...`)

    try {
      const response = await fetch("/api/set-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "stop",
          chargerId: sessionInfo.chargerId,
          stationId: sessionInfo.stationId,
          stationName: sessionInfo.stationName,
          city: sessionInfo.city,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to send stop command.")
      }
      const result = await response.json()
      setUiStatus("Stopped")
      setFeedbackMessage(result.message || `Charging stopped at ${sessionInfo.stationName}.`)
      // popup will be handled by useEffect
    } catch (error: any) {
      setUiStatus("Error")
      setFeedbackMessage(error.message || `Error stopping charging session.`)
      console.error("Stop Command Error:", error)
    }
  }

  const handleBack = () => {
    if (sessionInfo) {
      router.push(
        `/charger-selection?stationId=${sessionInfo.stationId}&stationName=${encodeURIComponent(sessionInfo.stationName)}&city=${encodeURIComponent(sessionInfo.city)}`,
      )
    } else {
      router.push("/")
    }
  }

  if (!isInitialized || (!sessionInfo && uiStatus !== "Error")) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-sky-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading charging session...</p>
        </div>
      </div>
    )
  }

  // Format helpers
  const formatPower = (w: number) => w.toLocaleString()
  const formatAmount = (amt: number) => `₹${amt.toFixed(2)}`
  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":")
  }

  const getStatusVisual = () => {
    switch (uiStatus) {
      case "Charging":
        return <Zap className="w-24 h-24 text-green-500 mb-4 animate-pulse" />
      case "Stopping":
        return <Loader2 className="w-24 h-24 text-yellow-500 mb-4 animate-spin" />
      case "Stopped":
        return <XCircle className="w-24 h-24 text-red-500 mb-4" />
      case "Error":
        return <AlertTriangleIcon className="w-24 h-24 text-orange-500 mb-4" />
      default:
        return <Zap className="w-24 h-24 text-gray-500 mb-4" />
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      {/* Popup */}
      {showPopup && (
        <div className="fixed top-6 right-8 z-50">
          <div className="bg-white border-l-4 border-red-500 shadow-lg rounded-lg p-4 min-w-[260px]">
            <div className="font-semibold text-red-600 mb-1">Charging Stopped</div>
            <div className="text-gray-700 text-sm">
              Session ended. Total:{" "}
              <span className="font-bold">{formatAmount(popupAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header with Logo */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image src="/images/nt-power-logo.png" alt="NT Power" width={120} height={40} className="h-10 w-auto" />
          </div>
          <Button variant="ghost" onClick={handleBack} className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-sky-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-gray-800">
              Charger {sessionInfo?.chargerId}
            </CardTitle>
            <div className="text-center text-gray-500 text-sm">
              Real-time charging information
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-full">
                <div className="flex justify-between items-center bg-blue-50 rounded-lg px-4 py-2 mb-2">
                  <span className="text-gray-500 font-medium">Power</span>
                  <span className="text-blue-700 font-bold text-2xl">
                    {formatPower(chargingData.power)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">Watts</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 rounded-lg px-4 py-2 mb-2">
                  <span className="text-gray-500 font-medium">Charging Status</span>
                  <span className="flex items-center font-bold text-lg">
                    <span
                      className={
                        uiStatus === "Stopped"
                          ? "text-red-600"
                          : uiStatus === "Charging"
                            ? "text-green-600"
                            : "text-gray-600"
                      }
                    >
                      ●
                    </span>
                    <span className="ml-2">{uiStatus === "Stopped" ? "Stopped" : uiStatus}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center bg-orange-50 rounded-lg px-4 py-2 mb-2">
                  <span className="text-gray-500 font-medium">Amount Paid</span>
                  <span className="font-bold text-orange-700 text-xl">
                    {formatAmount(chargingData.amountPaid)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">₹{chargingData.ratePerKwh}/kWh</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2">
                  <span className="text-gray-500 font-medium">Duration</span>
                  <span className="font-mono text-gray-800 text-lg">
                    {formatDuration(chargingData.duration)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">HH:MM:SS</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            {uiStatus === "Charging" && (
              <Button
                onClick={handleStopCharging}
                className="w-full text-lg py-6 bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white"
                disabled={!sessionInfo}
              >
                <XCircle className="mr-2 h-5 w-5" />
               Stop Charging 
              </Button>
            )}
            {uiStatus === "Stopped" && (
              <Button
                onClick={() => router.push("/")}
                className="w-full text-lg py-6 bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 text-white"
              >
                <HomeIcon className="mr-2 h-5 w-5" />
                Go back to homepage
              </Button>
            )}
            {/* ...existing error button if needed... */}
          </CardFooter>
        </Card>
      </main>

      <div className="flex flex-col items-center mt-4">
        {uiStatus === "Stopped" && (
          <div className="text-gray-500 text-sm">
            Returning to homepage in {returningCountdown}s...
          </div>
        )}
        <div className="text-gray-400 text-xs mt-1">
          Session will auto stop after 4 hours.
        </div>
      </div>

      <footer className="text-center p-4 text-sm text-gray-500 bg-white/50">
        © {new Date().getFullYear()} NT Power - EV Charging Solutions
      </footer>
    </div>
  )
}
