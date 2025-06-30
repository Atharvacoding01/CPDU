"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Loader2, AlertTriangleIcon, CheckCircle, MapPin, Zap, ArrowLeft } from "lucide-react"
import { Label } from "@/components/ui/label"
import Image from "next/image"

type PaymentStatus = "idle" | "processing" | "success" | "error"



export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [sessionInfo, setSessionInfo] = useState<{
    chargerId: string
    stationId: string
    stationName: string
    city: string
    chargerStatus: string
    chargerPower: string
  } | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)


  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);


  // Memoize the session info extraction to prevent unnecessary re-renders
  const extractSessionInfo = useCallback(() => {
    const chargerId = searchParams.get("chargerId")
    const stationId = searchParams.get("stationId")
    const stationName = searchParams.get("stationName")
    const city = searchParams.get("city")
    const chargerStatus = searchParams.get("chargerStatus")
    const chargerPower = searchParams.get("chargerPower")

    if (chargerId && stationId && stationName && city) {
      return {
        chargerId,
        stationId,
        stationName: decodeURIComponent(stationName),
        city: decodeURIComponent(city),
        chargerStatus: chargerStatus || "",
        chargerPower: chargerPower || "",
      }
    }

    return null
  }, [searchParams])

  useEffect(() => {
    if (!isInitialized) {
      const info = extractSessionInfo()
      if (info) {
        setSessionInfo(info)
        setPaymentStatus("idle")
        setFeedbackMessage("")
      } else {
        setPaymentStatus("error")
        setFeedbackMessage("Error: Session information missing.")
      }
      setIsInitialized(true)
    }
  }, [extractSessionInfo, isInitialized])

  const handlePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!sessionInfo) {
      setFeedbackMessage("Error: Session information is missing. Cannot proceed.")
      setPaymentStatus("error")
      return
    }

    setPaymentStatus("processing")
    setFeedbackMessage(`Processing payment for ${sessionInfo.stationName} - Charger ${sessionInfo.chargerId}...`)

    await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate payment delay

    try {
      const response = await fetch("/api/set-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: "start",
          chargerId: sessionInfo.chargerId,
          stationId: sessionInfo.stationId,
          stationName: sessionInfo.stationName,
          city: sessionInfo.city,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to send start command to server.")
      }

      const result = await response.json()
      setFeedbackMessage(`Payment successful! Starting charging session...`)
      setPaymentStatus("success")

      setTimeout(() => {
        router.push(
          `/charging-status?chargerId=${sessionInfo.chargerId}&stationId=${sessionInfo.stationId}&stationName=${encodeURIComponent(sessionInfo.stationName)}&city=${encodeURIComponent(sessionInfo.city)}`,
        )
      }, 1000)
    } catch (error: any) {
      setPaymentStatus("error")
      setFeedbackMessage(error.message || "An error occurred during payment processing.")
      console.error("Payment/Command Error:", error)
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

  if (!isInitialized || (!sessionInfo && paymentStatus !== "error")) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-sky-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading session information...</p>
        </div>
      </div>
    )
  }
   const openRazorpayCheckout = async () => {
  if (!sessionInfo) return;
  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100 }), // Replace 100 with your dynamic amount if needed
  });
  const data = await res.json();

  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    amount: data.amount,
    currency: "INR",
    name: "EV Charging",
    description: "Charger Payment",
    order_id: data.id,
    handler: function (response: any) {
      // Optionally: Save payment to DB
      fetch("/api/save-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      setFeedbackMessage("Payment successful! Starting charging session...");
      setPaymentStatus("success");
      setTimeout(() => {
        router.push(
          `/charging-status?chargerId=${sessionInfo.chargerId}&stationId=${sessionInfo.stationId}&stationName=${encodeURIComponent(sessionInfo.stationName)}&city=${encodeURIComponent(sessionInfo.city)}`
        );
      }, 1000);
    },
    theme: { color: "#528FF0" },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
};
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      {/* Header with Logo */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image src="/images/nt-power-logo.png" alt="NT Power" width={120} height={40} className="h-10 w-auto" />
          </div>
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800"
            disabled={paymentStatus === "processing"}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-sky-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-sky-100 rounded-full">
                <CreditCard className="w-8 h-8 text-sky-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">Secure Payment</CardTitle>
            {sessionInfo && (
              <CardDescription className="text-gray-600 space-y-1">
                <div className="flex items-center justify-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {sessionInfo.stationName}, {sessionInfo.city}
                </div>
                <div className="flex items-center justify-center">
                  <Zap className="w-4 h-4 mr-1" />
                  Charger {sessionInfo.chargerId} ({sessionInfo.chargerPower})
                </div>
              </CardDescription>
            )}
          </CardHeader>
          <form onSubmit={handlePayment}>
            <CardContent className="space-y-6">
              {/* Session Summary */}
              {sessionInfo && (
                <div className="bg-sky-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Charging Session</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Station: {sessionInfo.stationName}</div>
                    <div>Location: {sessionInfo.city}</div>
                    <div>
                      Charger: {sessionInfo.chargerId} ({sessionInfo.chargerPower})
                    </div>
                    <div className="font-medium text-sky-700">Rate: ₹8.00 per kWh</div>
                  </div>
                </div>
              )}

              {feedbackMessage && (
                <div
                  className={`mt-4 p-3 rounded-md text-sm flex items-center justify-center ${paymentStatus === "error" ? "bg-red-50 text-red-700 border border-red-200" : ""} ${paymentStatus === "success" ? "bg-green-50 text-green-700 border border-green-200" : ""} ${paymentStatus === "processing" ? "bg-blue-50 text-blue-700 border border-blue-200" : ""}`}
                >
                  {paymentStatus === "processing" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {paymentStatus === "error" && <AlertTriangleIcon className="h-4 w-4 mr-2" />}
                  {paymentStatus === "success" && <CheckCircle className="h-4 w-4 mr-2" />}
                  {feedbackMessage}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                className="w-full text-lg py-6 bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 text-white"
                onClick={openRazorpayCheckout}
                disabled={!sessionInfo}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Pay & Start Charging
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>

      <footer className="text-center p-4 text-sm text-gray-500 bg-white/50">
        © {new Date().getFullYear()} NT Power - EV Charging Solutions
      </footer>
    </div>
  )
}
