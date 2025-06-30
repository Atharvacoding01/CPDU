"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, AlertCircle, MapPin, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

const chargerOptions = [
  { id: "1", name: "Charger 1", status: "available", power: "22kW AC" },
  { id: "2", name: "Charger 2", status: "in-use", power: "50kW DC" },
  { id: "3", name: "Charger 3", status: "available", power: "22kW AC" },
  { id: "4", name: "Charger 4", status: "offline", power: "50kW DC" },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "text-green-600 bg-green-100"
    case "in-use":
      return "text-yellow-600 bg-yellow-100"
    case "offline":
      return "text-red-600 bg-red-100"
    default:
      return "text-gray-600 bg-gray-100"
  }
}

const getStatusDot = (status: string) => {
  switch (status) {
    case "available":
      return "bg-green-500"
    case "in-use":
      return "bg-yellow-500"
    case "offline":
      return "bg-red-500"
    default:
      return "bg-gray-500"
  }
}

export default function ChargerSelectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedChargerId, setSelectedChargerId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [stationInfo, setStationInfo] = useState<{
    stationId: string
    stationName: string
    city: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stationId = searchParams.get("stationId")
    const stationName = searchParams.get("stationName")
    const city = searchParams.get("city")

    if (stationId && stationName && city) {
      setStationInfo((prevInfo) => {
        const newInfo = {
          stationId,
          stationName: decodeURIComponent(stationName),
          city: decodeURIComponent(city),
        }

        if (
          !prevInfo ||
          prevInfo.stationId !== newInfo.stationId ||
          prevInfo.stationName !== newInfo.stationName ||
          prevInfo.city !== newInfo.city
        ) {
          return newInfo
        }
        return prevInfo
      })
    }
    setIsLoading(false)
  }, [searchParams])

  const handleProceed = () => {
    if (!selectedChargerId) {
      setError("Please select an available charger before proceeding.")
      return
    }

    const selectedCharger = chargerOptions.find((charger) => charger.id === selectedChargerId)
    if (selectedCharger?.status !== "available") {
      setError("Please select an available charger.")
      return
    }

    setError(null)
    // Pass all info to payment page
    const params = new URLSearchParams({
      chargerId: selectedChargerId,
      stationId: stationInfo?.stationId || "",
      stationName: stationInfo?.stationName || "",
      city: stationInfo?.city || "",
      chargerStatus: selectedCharger?.status || "",
      chargerPower: selectedCharger?.power || "",
    })
    router.push(`/payment?${params.toString()}`)
  }

  const handleBack = () => {
    router.push("/")
  }

  if (isLoading || !stationInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading station information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      {/* Header with Logo */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image src="/images/nt-power-logo.png" alt="NT Power" width={120} height={40} className="h-10 w-auto" />
          </div>
          <Button variant="ghost" onClick={handleBack} className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stations
          </Button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-white/90 backdrop-blur-sm border-sky-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-sky-100 rounded-full">
                <Zap className="w-8 h-8 text-sky-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">Choose Your Charger</CardTitle>
            <CardDescription className="text-gray-600">
              <MapPin className="inline w-4 h-4 mr-1" />
              {stationInfo.stationName}, {stationInfo.city}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="charger-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select an available charging station to begin
              </label>
              <Select value={selectedChargerId} onValueChange={setSelectedChargerId}>
                <SelectTrigger
                  id="charger-select"
                  className="w-full bg-white border-sky-200 text-gray-800 focus:ring-sky-500 focus:border-sky-500"
                >
                  <SelectValue placeholder="Choose a charger..." />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-800 border-sky-200">
                  {chargerOptions.map((charger) => (
                    <SelectItem
                      key={charger.id}
                      value={charger.id}
                      className="focus:bg-sky-50"
                      disabled={charger.status !== "available"}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${getStatusDot(charger.status)}`}></div>
                          <div>
                            <span className="font-medium">{charger.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({charger.power})</span>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(charger.status)}`}>
                          {charger.status.replace("-", " ")}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Status Legend */}
            <div className="bg-sky-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Charger Status</h4>
              <div className="flex justify-between text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">In Use</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">Offline</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleProceed}
              className="w-full text-lg py-6 bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 text-white"
              disabled={
                !selectedChargerId || chargerOptions.find((c) => c.id === selectedChargerId)?.status !== "available"
              }
            >
              <Zap className="mr-2 h-5 w-5" />
              {selectedChargerId ? "Start Charging" : "Please select a charger to continue"}
            </Button>
          </CardFooter>
        </Card>
      </main>

      <footer className="text-center p-4 text-sm text-gray-500 bg-white/50">
        © {new Date().getFullYear()} NT Power - EV Charging Solutions
      </footer>
    </div>
  )
}
