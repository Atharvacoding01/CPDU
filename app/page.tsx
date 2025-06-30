"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, AlertCircle, MapPin } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

const stationOptions = [
  { id: "mumbai-1", name: "Mumbai Central Station", city: "Mumbai", address: "Central Mumbai, Maharashtra" },
  { id: "delhi-1", name: "Delhi Metro Station", city: "Delhi", address: "Connaught Place, New Delhi" },
  { id: "bangalore-1", name: "Bangalore Tech Park", city: "Bangalore", address: "Electronic City, Bangalore" },
  { id: "pune-1", name: "Pune IT Hub", city: "Pune", address: "Hinjewadi, Pune" },
  { id: "hyderabad-1", name: "Hyderabad HITEC City", city: "Hyderabad", address: "HITEC City, Hyderabad" },
  { id: "chennai-1", name: "Chennai OMR Station", city: "Chennai", address: "OMR, Chennai" },
]

export default function HomePage() {
  const router = useRouter()
  const [selectedStationId, setSelectedStationId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const handleProceed = () => {
    if (!selectedStationId) {
      setError("Please select a charging station before proceeding.")
      return
    }
    setError(null)
    const selectedStation = stationOptions.find((station) => station.id === selectedStationId)
    // Pass selected station info to the charger selection page
    router.push(
      `/charger-selection?stationId=${selectedStationId}&stationName=${encodeURIComponent(selectedStation?.name || "")}&city=${encodeURIComponent(selectedStation?.city || "")}`,
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
          <h1 className="text-xl font-semibold text-gray-800">EV Charging Network</h1>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-sky-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-sky-100 rounded-full">
                <Zap className="w-8 h-8 text-sky-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">EV Charging Service</CardTitle>
            <CardDescription className="text-gray-600">Select your preferred charging station to begin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="station-select" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Select Charging Station
              </label>
              <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                <SelectTrigger
                  id="station-select"
                  className="w-full bg-white border-sky-200 text-gray-800 focus:ring-sky-500 focus:border-sky-500"
                >
                  <SelectValue placeholder="Choose a station..." />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-800 border-sky-200">
                  {stationOptions.map((station) => (
                    <SelectItem key={station.id} value={station.id} className="focus:bg-sky-50">
                      <div className="flex flex-col">
                        <span className="font-medium">{station.name}</span>
                        <span className="text-sm text-gray-500">
                          {station.city} • {station.address}
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
              <h4 className="text-sm font-medium text-gray-700 mb-2">Station Status</h4>
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
              disabled={!selectedStationId}
            >
              <Zap className="mr-2 h-5 w-5" />
              Continue to Charger Selection
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
