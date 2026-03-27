"use client"

import { useState, useRef, useEffect } from "react"
import { QrCode, CheckCircle, XCircle, AlertTriangle, Loader2, Shield, Eye, Download, Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"

interface QRVerificationResult {
  id: string
  status: "valid" | "invalid" | "expired"
  certificateData: {
    studentName: string
    degree: string
    institution: string
    graduationDate: string
    verificationDate: string
  }
  publicInfo: {
    institutionVerified: boolean
    digitalSignature: boolean
    tamperDetected: boolean
  }
}

export default function QRVerifyPage() {
  const [qrToken, setQrToken] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<QRVerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      setStream(mediaStream)
      setShowScanner(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch (err) {
      setError("Camera access denied or not available")
      console.error("Camera error:", err)
    }
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for QR detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Use jsQR library for QR detection (would need to be installed)
    try {
      // This is a simplified version - in production you'd use jsQR or similar
      // const code = jsQR(imageData.data, imageData.width, imageData.height)
      // if (code) {
      //   setQrToken(code.data)
      //   stopCamera()
      //   handleVerification()
      // }

      // For demo purposes, simulate QR detection after 3 seconds
      setTimeout(() => {
        setQrToken("qr_demo_token_12345")
        stopCamera()
        handleVerification()
      }, 3000)
    } catch (err) {
      console.error("QR scanning error:", err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setShowScanner(false)
  }

  const handleVerification = async () => {
    if (!qrToken.trim()) {
      setError("Please enter a QR verification token")
      return
    }

    setIsVerifying(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/qr-verify/${encodeURIComponent(qrToken)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("QR token not found or invalid")
        } else if (response.status === 410) {
          throw new Error("QR token has expired")
        } else {
          throw new Error("Verification failed")
        }
      }

      const verificationData = await response.json()

      setResult({
        id: qrToken,
        status: verificationData.status,
        certificateData: {
          studentName: verificationData.certificate_data.student_name,
          degree: verificationData.certificate_data.degree,
          institution: verificationData.certificate_data.institution,
          graduationDate: verificationData.certificate_data.graduation_date,
          verificationDate: new Date().toLocaleDateString(),
        },
        publicInfo: {
          institutionVerified: verificationData.public_info.institution_verified,
          digitalSignature: verificationData.public_info.digital_signature,
          tamperDetected: verificationData.public_info.tamper_detected,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify QR token. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    let scanInterval: NodeJS.Timeout

    if (showScanner && videoRef.current) {
      scanInterval = setInterval(scanQRCode, 500) // Scan every 500ms
    }

    return () => {
      if (scanInterval) {
        clearInterval(scanInterval)
      }
    }
  }, [showScanner])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const getStatusIcon = () => {
    if (!result) return null

    switch (result.status) {
      case "valid":
        return <CheckCircle className="h-8 w-8 text-success" />
      case "invalid":
        return <XCircle className="h-8 w-8 text-destructive" />
      case "expired":
        return <AlertTriangle className="h-8 w-8 text-warning" />
    }
  }

  const getStatusColor = () => {
    if (!result) return ""

    switch (result.status) {
      case "valid":
        return "bg-success text-success-foreground"
      case "invalid":
        return "bg-destructive text-destructive-foreground"
      case "expired":
        return "bg-warning text-warning-foreground"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">CheckMyCert</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <QrCode className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">QR Certificate Verification</h1>
          <p className="text-muted-foreground">
            Instantly verify certificate authenticity using QR codes. No account required.
          </p>
        </div>

        {/* Verification Input */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Enter QR Verification Token</CardTitle>
            <CardDescription>
              Scan the QR code on the certificate or enter the verification token manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Enter QR token (e.g., qr_abc123def456)"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && handleVerification()}
              />
              <Button onClick={handleVerification} disabled={isVerifying || !qrToken.trim()} className="px-8">
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Verify
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert className="border-destructive/50 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Or scan QR code with your camera</p>
              <Button variant="outline" className="bg-transparent" onClick={startCamera}>
                <Camera className="mr-2 h-4 w-4" />
                Open Camera Scanner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Camera Scanner Dialog */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                QR Code Scanner
                <Button variant="ghost" size="sm" onClick={stopCamera}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <video ref={videoRef} className="w-full h-64 bg-black rounded-lg" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none">
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary"></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Position the QR code within the frame to scan automatically
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Verification Results */}
        {result && (
          <div className="space-y-6">
            {/* Status Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  {getStatusIcon()}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-foreground">Verification Result</h2>
                      <Badge className={getStatusColor()}>{result.status.toUpperCase()}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Token: {result.id} • Verified on {result.certificateData.verificationDate}
                    </p>
                  </div>
                </div>

                {result.status === "valid" && (
                  <Alert className="border-success/50 bg-success/5">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      This certificate has been verified as authentic and has not been tampered with.
                    </AlertDescription>
                  </Alert>
                )}

                {result.status === "invalid" && (
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      This certificate could not be verified. It may be fraudulent or the token is incorrect.
                    </AlertDescription>
                  </Alert>
                )}

                {result.status === "expired" && (
                  <Alert className="border-warning/50 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      This verification token has expired. Please request a new QR code from the certificate holder.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Certificate Information */}
            {result.status !== "invalid" && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Certificate Details</CardTitle>
                    <CardDescription>Public information from the verified certificate</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Student Name</label>
                      <p className="text-foreground font-medium">{result.certificateData.studentName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Degree</label>
                      <p className="text-foreground font-medium">{result.certificateData.degree}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Institution</label>
                      <p className="text-foreground font-medium">{result.certificateData.institution}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Graduation Date</label>
                      <p className="text-foreground font-medium">{result.certificateData.graduationDate}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Verification Status</CardTitle>
                    <CardDescription>Security checks and validation results</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Institution Verified</span>
                      {result.publicInfo.institutionVerified ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Digital Signature</span>
                      {result.publicInfo.digitalSignature ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tamper Detection</span>
                      {!result.publicInfo.tamperDetected ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          <span className="text-sm text-success">Clean</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-destructive" />
                          <span className="text-sm text-destructive">Issues Found</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="bg-transparent">
                    <Download className="mr-2 h-4 w-4" />
                    Download Verification Report
                  </Button>
                  <Button variant="outline" className="bg-transparent">
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate New QR Code
                  </Button>
                  <Button variant="outline" asChild className="bg-transparent">
                    <Link href="/upload">
                      <Shield className="mr-2 h-4 w-4" />
                      Verify Your Own Certificate
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* How it Works */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How QR Verification Works</CardTitle>
            <CardDescription>Understanding the security behind QR certificate verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-medium mb-2">Secure QR Generation</h4>
                <p className="text-muted-foreground">
                  Each certificate gets a unique, cryptographically secure QR token that expires after verification.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-medium mb-2">Real-time Validation</h4>
                <p className="text-muted-foreground">
                  Instant verification against our secure database without exposing sensitive information.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-medium mb-2">Public Verification</h4>
                <p className="text-muted-foreground">
                  Anyone can verify authenticity without needing an account or accessing private data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
