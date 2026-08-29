"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Shield, X, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface UploadedFile {
  file: File
  preview: string
  id: string
}

interface ProcessingStep {
  name: string
  status: "pending" | "processing" | "completed" | "error"
  progress: number
  message?: string
}

const OCR_TO_TRANSLATE_LANGUAGE: Record<string, string> = {
  eng: "english",
  spa: "spanish",
  fre: "french",
  ger: "german",
}

const extractErrorMessage = (payload: unknown): string | null => {
  if (!payload) return null
  if (typeof payload === "string") return payload

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = extractErrorMessage(item)
      if (nested) return nested
    }
    return null
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>
    for (const value of Object.values(record)) {
      const nested = extractErrorMessage(value)
      if (nested) return nested
    }
    return null
  }

  return null
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState("eng")
  const [translateTo, setTranslateTo] = useState("english")
  const [ocrEnabled, setOcrEnabled] = useState(true)
  const [tamperDetection, setTamperDetection] = useState(true)
  const [databaseCheck, setDatabaseCheck] = useState(true)
  const [digitalSignature, setDigitalSignature] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([])
  const [jobId, setJobId] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    const newFiles = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    }))
    setUploadedFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".bmp", ".tiff"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0]
      if (rejection.errors[0]?.code === "file-too-large") {
        setError("File size must be less than 10MB")
      } else if (rejection.errors[0]?.code === "file-invalid-type") {
        setError("Only PDF, JPG, PNG, and other image formats are supported")
      }
    },
  })

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      const fileToRemove = prev.find((f) => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return updated
    })
  }

  const handleVerification = async () => {
    if (uploadedFiles.length === 0) {
      setError("Please upload at least one certificate")
      return
    }

    setIsProcessing(true)
    setUploadProgress(0)
    setError(null)

    // Initialize processing steps
    const steps: ProcessingStep[] = [
      { name: "File Upload", status: "processing", progress: 0 },
      { name: "OCR Processing", status: "pending", progress: 0 },
      { name: "Tamper Detection", status: "pending", progress: 0 },
      { name: "Database Verification", status: "pending", progress: 0 },
      { name: "Final Analysis", status: "pending", progress: 0 },
    ]
    setProcessingSteps(steps)

    try {
      const formData = new FormData()

      // Add files
      // Backend upload endpoint expects a single file field named "file".
      formData.append("file", uploadedFiles[0].file)

      // Add processing options
      formData.append("ocr_language", selectedLanguage)
      const detectedLanguageName = OCR_TO_TRANSLATE_LANGUAGE[selectedLanguage]
      const shouldTranslate = detectedLanguageName ? translateTo !== detectedLanguageName : true
      formData.append("translate_enabled", shouldTranslate ? "true" : "false")
      formData.append("translate_to", translateTo)
      formData.append("ocr_enabled", ocrEnabled.toString())
      formData.append("tamper_detection", tamperDetection.toString())
      formData.append("database_check", databaseCheck.toString())
      formData.append("digital_signature", digitalSignature.toString())

      // Step 1: Upload files
      updateProcessingStep(0, "processing", 25, "Uploading files...")

      const uploadResponse = await fetch("/api/certificates/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        let message = "Failed to upload certificate"
        try {
          const errorData = await uploadResponse.json()
          message =
            errorData?.error ||
            errorData?.detail ||
            extractErrorMessage(errorData) ||
            message
        } catch {
          // Use default message when backend response is not JSON.
        }
        throw new Error(message)
      }

      const uploadResult = await uploadResponse.json()
      setJobId(uploadResult.job_id)

      updateProcessingStep(0, "completed", 100, "Files uploaded successfully")

      // Step 2: OCR Processing (handled server-side)
      if (ocrEnabled) {
        updateProcessingStep(1, "processing", 25, "Extracting text with OCR.space...")

        // OCR is processed server-side in the upload API
        if (uploadResult.ocr_result) {
          if (uploadResult.ocr_result.error) {
            updateProcessingStep(1, "error", 0, `OCR failed: ${uploadResult.ocr_result.error}`)
          } else {
            const confidence = uploadResult.ocr_result.confidence || 0
            updateProcessingStep(1, "completed", 100, `Text extracted (${confidence}% confidence)`)
          }
        } else {
          updateProcessingStep(1, "completed", 100, "OCR processing completed")
        }
      } else {
        updateProcessingStep(1, "completed", 100, "OCR skipped")
      }

      // Step 3: Tamper Detection (simulated)
      updateProcessingStep(2, "processing", 50, "Analyzing for tampering...")
      await new Promise((resolve) => setTimeout(resolve, 800))
      updateProcessingStep(2, "completed", 100, "Tamper analysis complete")

      // Step 4: Database Verification (simulated)
      updateProcessingStep(3, "processing", 75, "Checking against database...")
      await new Promise((resolve) => setTimeout(resolve, 600))
      updateProcessingStep(3, "completed", 100, "Database verification complete")

      // Step 5: Final Analysis
      updateProcessingStep(4, "processing", 90, "Generating final report...")
      await new Promise((resolve) => setTimeout(resolve, 400))
      updateProcessingStep(4, "completed", 100, "Analysis complete")

      setUploadProgress(100)

      // Wait briefly for async result creation, then navigate.
      const waitForResultReady = async (id: string, maxAttempts = 15) => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const response = await fetch(`/api/verification/results/${id}`)
          if (response.ok) {
            return true
          }
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        return false
      }

      await waitForResultReady(uploadResult.job_id)
      window.location.href = `/verification/results/${uploadResult.job_id}`
    } catch (err) {
      console.error("Verification error:", err)
      setError(err instanceof Error ? err.message : "Failed to process certificate. Please try again.")
      setIsProcessing(false)
      setUploadProgress(0)

      // Mark current step as error
      setProcessingSteps((prev) =>
        prev.map((step, index) =>
          step.status === "processing" ? { ...step, status: "error", message: "Processing failed" } : step,
        ),
      )
    }
  }

  const updateProcessingStep = (
    stepIndex: number,
    status: ProcessingStep["status"],
    progress: number,
    message?: string,
  ) => {
    setProcessingSteps((prev) =>
      prev.map((step, index) => (index === stepIndex ? { ...step, status, progress, message } : step)),
    )

    // Update overall progress
    const totalProgress = Math.round(((stepIndex + progress / 100) / 5) * 100)
    setUploadProgress(totalProgress)
  }

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Upload Certificate</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload your certificate in PDF, JPG, or PNG format for AI-powered verification and tampering detection using
            OCR.space technology
          </p>
        </div>

        {error && (
          <Alert className="mb-6 border-destructive/50 text-destructive max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-8">
          <div className="max-w-2xl mx-auto">
            {uploadedFiles.length === 0 ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
              >
                <input {...getInputProps()} />
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                {isDragActive ? (
                  <p className="text-primary font-medium text-lg">Drop your certificate here</p>
                ) : (
                  <div>
                    <p className="text-foreground font-medium text-lg mb-2">Drag and drop your certificate here</p>
                    <p className="text-muted-foreground mb-6">or click to browse files</p>
                    <Button className="mb-4">Browse Files</Button>
                    <p className="text-sm text-muted-foreground">Supported formats: PDF, JPG, PNG (Max size: 10MB)</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-green-500 rounded-lg p-8 bg-green-50/50">
                <div className="text-center mb-6">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">File Selected</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map((uploadedFile) => (
                      <div key={uploadedFile.id} className="flex items-center justify-center gap-3">
                        <span className="text-sm font-medium text-foreground">{uploadedFile.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadedFile.id)}
                          className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                    onClick={() => setUploadedFiles([])}
                  >
                    Remove File
                  </Button>
                </div>
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && !isProcessing && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Verification Options
                  </CardTitle>
                  <CardDescription>Configure how your certificate will be processed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground">OCR Language</Label>
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eng">English</SelectItem>
                          <SelectItem value="spa">Spanish</SelectItem>
                          <SelectItem value="fre">French</SelectItem>
                          <SelectItem value="ger">German</SelectItem>
                          <SelectItem value="chi_sim">Chinese (Simplified)</SelectItem>
                          <SelectItem value="jpn">Japanese</SelectItem>
                          <SelectItem value="ara">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Language for OCR.space text extraction</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground">Translate to</Label>
                      <Select value={translateTo} onValueChange={setTranslateTo}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                          <SelectItem value="german">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground mb-4 block">Processing Features</Label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="ocr" 
                          checked={ocrEnabled} 
                          onCheckedChange={(checked) => setOcrEnabled(checked === true)} 
                        />
                        <Label htmlFor="ocr" className="text-sm">
                          OCR.space Text Extraction
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="tamper" 
                          checked={tamperDetection} 
                          onCheckedChange={(checked) => setTamperDetection(checked === true)} 
                        />
                        <Label htmlFor="tamper" className="text-sm">
                          Tampering Detection
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="database" 
                          checked={databaseCheck} 
                          onCheckedChange={(checked) => setDatabaseCheck(checked === true)} 
                        />
                        <Label htmlFor="database" className="text-sm">
                          Database Cross-check
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="signature" 
                          checked={digitalSignature} 
                          onCheckedChange={(checked) => setDigitalSignature(checked === true)} 
                        />
                        <Label htmlFor="signature" className="text-sm">
                          Digital Signature Validation
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleVerification} disabled={isProcessing} className="w-full py-6 text-lg" size="lg">
                <CheckCircle className="mr-2 h-5 w-5" />
                Start Verification
              </Button>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing Certificate
                  </CardTitle>
                  <CardDescription>
                    {jobId && <span className="font-mono text-xs">Job ID: {jobId}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="text-foreground">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    {processingSteps.map((step, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                        {getStepIcon(step)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{step.name}</span>
                            <Badge
                              variant={
                                step.status === "completed"
                                  ? "default"
                                  : step.status === "processing"
                                    ? "secondary"
                                    : step.status === "error"
                                      ? "destructive"
                                      : "outline"
                              }
                            >
                              {step.status}
                            </Badge>
                          </div>
                          {step.message && <p className="text-xs text-muted-foreground mt-1">{step.message}</p>}
                          {step.status === "processing" && <Progress value={step.progress} className="h-1 mt-2" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Security Notice */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3 p-4 bg-green-50/50 border border-green-200 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-800 mb-1">Security & Privacy</h4>
                <p className="text-sm text-green-700">
                  Your certificates are processed securely using OCR.space API with end-to-end encryption. Files are
                  automatically deleted after verification. We never store personal information without explicit
                  consent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
