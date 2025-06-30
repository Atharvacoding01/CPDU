"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PowerIcon, ZapIcon, ClockIcon, AlertTriangleIcon, CreditCardIcon, XCircleIcon } from "lucide-react"

type ChargingStatus = "Idle" | "Charging" | "Stopped" | "Error"

export default function ChargingSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chargerId = searchParams.get("charger") || "N/A"

  const [powerConsumption, setPowerConsumption] = useState(0) // Watts
  const [totalKWhConsumed, setTotalKWhConsumed] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0) // Rupees
  const [sessionDuration, setSessionDuration] = useState(0) // Seconds
  const [chargingStatus, setChargingStatus] = useState<ChargingStatus>("Idle")
  const [isModalOpen, setIsModalOpen] = useState(false)

  const KWH_RATE = 8 // ₹ per kWh

  const intervalRefs = useRef<{
    power?: NodeJS.Timeout
    duration?: NodeJS.Timeout
  }>({})

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  const startChargingSimulation = useCallback(() => {
    setChargingStatus("Charging")
    setSessionDuration(0)
    setTotalKWhConsumed(0)
    setAmountPaid(0)
    setPowerConsumption(Math.floor(Math.random() * (7000 - 1000 + 1) + 1000)) // Initial power

    intervalRefs.current.power = setInterval(() => {
      setPowerConsumption((prevPower) => {
        // Simulate power fluctuation
        const newPower = prevPower + Math.floor(Math.random() * 201) - 100 // Fluctuate by +/- 100W
        return Math.max(500, Math.min(7500, newPower)) // Keep within 0.5kW to 7.5kW
      })
    }, 1000) // Update power every second

    intervalRefs.current.duration = setInterval(() => {
      setSessionDuration((prev) => prev + 1)
      setTotalKWhConsumed((prevKWh) => {
        // Power is in Watts, duration interval is 1 second. Energy (Wh) = Power (W) * Time (h)
        // Energy in 1 sec (Wh) = currentPowerConsumption * (1/3600)
        // Energy in 1 sec (kWh) = (currentPowerConsumption / 1000) * (1/3600)
        const currentPowerInKW = powerConsumption / 1000
        const energyConsumedThisSecondKWh = currentPowerInKW * (1 / 3600)
        const newTotalKWh = prevKWh + energyConsumedThisSecondKWh
        setAmountPaid(newTotalKWh * KWH_RATE)
        return newTotalKWh
      })
    }, 1000) // Update duration and cost every second
  }, [powerConsumption]) // Include powerConsumption to get its latest value in the interval

  const stopChargingSimulation = useCallback((status: ChargingStatus = "Stopped") => {
    clearInterval(intervalRefs.current.power)
    clearInterval(intervalRefs.current.duration)
    intervalRefs.current.power = undefined
    intervalRefs.current.duration = undefined
    setChargingStatus(status)
    setPowerConsumption(0) // Reset power when stopped
  }, [])

  useEffect(() => {
    // Cleanup intervals on component unmount
    return () => {
      stopChargingSimulation()
    }
  }, [stopChargingSimulation])

  const handleStartCharging = () => {
    setIsModalOpen(true)
  }

  const handlePaymentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Simulate payment processing
    setIsModalOpen(false)
    startChargingSimulation()
  }

  const handleStopChargingButton = async () => {
    try {
      const response = await fetch("/api/stop-charging", { method: "GET" })
      if (response.ok) {
        // const data = await response.json();
        // console.log(data.message);
        stopChargingSimulation("Stopped")
      } else {
        console.error("Failed to stop charging via API")
        stopChargingSimulation("Error") // Still stop local simulation but show error
      }
    } catch (error) {
      console.error("Error calling stop-charging API:", error)
      stopChargingSimulation("Error")
    }
  }

  const getStatusColor = () => {
    switch (chargingStatus) {
      case "Charging":
        return "text-green-500"
      case "Stopped":
        return "text-red-500"
      case "Error":
        return "text-orange-500"
      case "Idle":
      default:
        return "text-gray-500"
    }
  }

  const getStatusIcon = () => {
    switch (chargingStatus) {
      case "Charging":
        return <ZapIcon className="mr-2 h-5 w-5 text-green-500" />
      case "Stopped":
        return <XCircleIcon className="mr-2 h-5 w-5 text-red-500" />
      case "Error":
        return <AlertTriangleIcon className="mr-2 h-5 w-5 text-orange-500" />
      case "Idle":
      default:
        return <PowerIcon className="mr-2 h-5 w-5 text-gray-500" />
    }
  }

  if (chargerId === "N/A") {
    // Or redirect, or show a specific message
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Charger Not Specified</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please select a charger first.</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              Go to Charger Selection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">EV Charging Station</h1>
          <span className="text-lg text-gray-600 dark:text-gray-300">Charger {chargerId}</span>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Power Consumption</CardTitle>
              <ZapIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(powerConsumption / 1000).toFixed(2)} kW</div>
              <p className="text-xs text-muted-foreground">{powerConsumption} Watts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{amountPaid.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {totalKWhConsumed.toFixed(3)} kWh @ ₹{KWH_RATE}/kWh
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session Duration</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(sessionDuration)}</div>
              <p className="text-xs text-muted-foreground">HH:MM:SS</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Charging Status</CardTitle>
              {getStatusIcon()}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getStatusColor()}`}>{chargingStatus}</div>
              <p className="text-xs text-muted-foreground">
                {chargingStatus === "Charging"
                  ? "Your EV is currently charging."
                  : chargingStatus === "Stopped"
                    ? "Charging session has ended."
                    : chargingStatus === "Error"
                      ? "An error occurred."
                      : "Ready to start charging."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 mt-8">
          {chargingStatus === "Idle" && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                  onClick={handleStartCharging}
                >
                  <PowerIcon className="mr-2 h-5 w-5" /> Start Charging
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Simulate Payment</DialogTitle>
                  <DialogDescription>
                    Enter dummy card details to start the charging session. This is for simulation only.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePaymentSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="card-number" className="text-right">
                        Card Number
                      </Label>
                      <Input id="card-number" defaultValue="4242 4242 4242 4242" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="expiry" className="text-right">
                        Expiry
                      </Label>
                      <Input id="expiry" defaultValue="12/28" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="cvc" className="text-right">
                        CVC
                      </Label>
                      <Input id="cvc" defaultValue="123" className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Pay & Start Charging</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {chargingStatus === "Charging" && (
            <Button size="lg" variant="destructive" className="w-full md:w-auto" onClick={handleStopChargingButton}>
              <XCircleIcon className="mr-2 h-5 w-5" /> Stop Charging
            </Button>
          )}
          {(chargingStatus === "Stopped" || chargingStatus === "Error") && (
            <Button size="lg" onClick={() => router.push("/")} className="w-full md:w-auto">
              Charge Another EV / Go Home
            </Button>
          )}
        </div>
      </main>

      <footer className="text-center p-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        © {new Date().getFullYear()} EV Charging Solutions Inc.
      </footer>
    </div>
  )
}
