"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, X, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QRScanner, type QRScanResult, extractQRToken } from "@/lib/qr-scanner"

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (token: string) => void
  title?: string
  description?: string
}

export default function QRScannerDialog({
  open,
  onOpenChange,
  onScan,
  title = "QR Code Scanner",
  description = "Position the QR code within the frame to scan automatically",
}: QRScannerDialogProps) {
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannerReady, setScannerReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scannerRef = useRef<QRScanner | null>(null)

  useEffect(() => {
    if (open && !scannerRef.current) {
      initializeScanner()
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stopScanning()
      }
    }
  }, [open])

  const initializeScanner = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsInitializing(true)
    setError(null)

    try {
      scannerRef.current = new QRScanner()

      await scannerRef.current.startScanning(videoRef.current, canvasRef.current, handleScanResult, handleScanError)

      setScannerReady(true)
    } catch (err) {
      handleScanError(err instanceof Error ? err.message : "Failed to initialize scanner")
    } finally {
      setIsInitializing(false)
    }
  }

  const handleScanResult = (result: QRScanResult) => {
    const token = extractQRToken(result.data)

    if (token) {
      onScan(token)
      onOpenChange(false)
    } else {
      setError("Invalid QR code format. Please scan a valid certificate QR code.")
    }
  }

  const handleScanError = (errorMessage: string) => {
    setError(errorMessage)
    setIsInitializing(false)
    setScannerReady(false)
  }

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning()
      scannerRef.current = null
    }
    setScannerReady(false)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {title}
            </span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-destructive/50 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative">
            {isInitializing && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Initializing camera...</p>
                </div>
              </div>
            )}

            <video ref={videoRef} className="w-full h-64 bg-black rounded-lg" autoPlay playsInline muted />

            <canvas ref={canvasRef} className="hidden" />

            {/* QR Code Overlay */}
            <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none">
              {/* Corner markers */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary"></div>

              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 border border-primary/70 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
              </div>

              {/* Scanning animation */}
              {scannerReady && (
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            {scannerReady && <p className="text-xs text-success">Scanner active - point camera at QR code</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            {error && (
              <Button onClick={initializeScanner} className="flex-1">
                Retry
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
