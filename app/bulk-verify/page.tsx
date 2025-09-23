"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react"

interface BulkResult {
  id: string
  filename: string
  status: "verified" | "suspicious" | "failed" | "processing"
  confidence: number
  tamperScore: number
  studentName?: string
  institution?: string
  error?: string
}

interface BulkJob {
  id: string
  name: string
  status: "pending" | "processing" | "completed" | "failed"
  totalFiles: number
  processedFiles: number
  successfulVerifications: number
  failedVerifications: number
  createdAt: string
}

export default function BulkVerifyPage() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentJob, setCurrentJob] = useState<BulkJob | null>(null)
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [jobHistory, setJobHistory] = useState<BulkJob[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
    setError(null)

    // Validate file types and sizes
    const validFiles = fileArray.filter((file) => {
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
      const maxSize = 10 * 1024 * 1024 // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize
    })

    if (validFiles.length !== fileArray.length) {
      setError("Some files were rejected. Only PDF, JPG, and PNG files under 10MB are allowed.")
      return
    }

    // Start processing
    await processBulkUpload(validFiles)
  }

  const processBulkUpload = async (files: File[]) => {
    setIsProcessing(true)
    setUploadProgress(0)

    try {
      // Create FormData for bulk upload
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`files`, file)
      })
      formData.append("name", `Bulk Job ${new Date().toLocaleString()}`)
      formData.append("description", `Processing ${files.length} certificates`)

      // Upload files and create bulk job
      const response = await fetch("/api/bulk-verification", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to start bulk verification")
      }

      const jobData = await response.json()

      const newJob: BulkJob = {
        id: jobData.batch_id,
        name: `Bulk Job ${new Date().toLocaleString()}`,
        status: "processing",
        totalFiles: files.length,
        processedFiles: 0,
        successfulVerifications: 0,
        failedVerifications: 0,
        createdAt: new Date().toISOString(),
      }

      setCurrentJob(newJob)

      // Poll for progress updates
      pollJobProgress(jobData.batch_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setIsProcessing(false)
    }
  }

  const pollJobProgress = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/bulk-verification/${jobId}/status`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to get job status")
        }

        const jobStatus = await response.json()

        setCurrentJob((prev) =>
          prev
            ? {
                ...prev,
                status: jobStatus.status,
                processedFiles: jobStatus.processed_certificates,
                successfulVerifications: jobStatus.successful_verifications,
                failedVerifications: jobStatus.failed_verifications,
              }
            : null,
        )

        const progress = Math.round((jobStatus.processed_certificates / jobStatus.total_certificates) * 100)
        setUploadProgress(progress)

        if (jobStatus.status === "completed" || jobStatus.status === "failed") {
          clearInterval(pollInterval)
          setIsProcessing(false)

          // Fetch detailed results
          await fetchJobResults(jobId)

          // Add to history
          setJobHistory((prev) => [jobStatus, ...prev])
        }
      } catch (err) {
        console.error("Polling error:", err)
        clearInterval(pollInterval)
        setIsProcessing(false)
      }
    }, 2000)
  }

  const fetchJobResults = async (jobId: string) => {
    try {
      const response = await fetch(`/api/bulk-verification/${jobId}/results`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const results = await response.json()
        setBulkResults(results.results || [])
      }
    } catch (err) {
      console.error("Failed to fetch results:", err)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const input = fileInputRef.current
      if (input) {
        const dt = new DataTransfer()
        files.forEach((file) => dt.items.add(file))
        input.files = dt.files
        handleFileUpload({ target: input } as React.ChangeEvent<HTMLInputElement>)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Bulk Certificate Verification</h1>
          <p className="text-muted-foreground">Upload multiple certificates for batch processing</p>
        </div>

        {error && (
          <Alert className="mb-6 border-destructive/50 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Certificates</CardTitle>
                <CardDescription>
                  Select multiple certificate files (PDF, JPG, PNG) for batch verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Drop files here or click to browse</h3>
                  <p className="text-sm text-muted-foreground mb-4">Supports PDF, JPG, PNG files up to 10MB each</p>

                  {selectedFiles.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-foreground mb-2">{selectedFiles.length} files selected:</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {selectedFiles.slice(0, 3).map((file, index) => (
                          <div key={index} className="flex items-center justify-center gap-2">
                            <FileText className="h-3 w-3" />
                            <span>{file.name}</span>
                          </div>
                        ))}
                        {selectedFiles.length > 3 && <p>... and {selectedFiles.length - 3} more files</p>}
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="bulk-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="bulk-upload">
                    <Button variant="outline" className="cursor-pointer bg-transparent" disabled={isProcessing}>
                      {isProcessing ? "Processing..." : "Select Files"}
                    </Button>
                  </label>
                </div>

                {isProcessing && currentJob && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Processing {currentJob.name}...</span>
                      <span className="text-sm text-muted-foreground">
                        {currentJob.processedFiles}/{currentJob.totalFiles} files ({uploadProgress}%)
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>✓ {currentJob.successfulVerifications} verified</span>
                      <span>✗ {currentJob.failedVerifications} failed</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Priority Level</label>
                    <select className="w-full mt-1 p-2 border border-input rounded-md bg-background">
                      <option>Standard (2-4 hours)</option>
                      <option>High (30-60 minutes)</option>
                      <option>Urgent (5-15 minutes)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Notification Method</label>
                    <select className="w-full mt-1 p-2 border border-input rounded-md bg-background">
                      <option>Email + Dashboard</option>
                      <option>Dashboard Only</option>
                      <option>Email Only</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Verification Results</CardTitle>
                <CardDescription>
                  {currentJob ? `Results for ${currentJob.name}` : "Latest batch processing results"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bulkResults.length > 0 ? (
                  <div className="space-y-4">
                    {bulkResults.map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {result.status === "verified" && <CheckCircle className="h-8 w-8 text-success" />}
                            {result.status === "suspicious" && <AlertTriangle className="h-8 w-8 text-warning" />}
                            {result.status === "failed" && <XCircle className="h-8 w-8 text-destructive" />}
                            {result.status === "processing" && (
                              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{result.filename}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.studentName && `${result.studentName} • `}
                              {result.institution && `${result.institution} • `}
                              Confidence: {result.confidence}% | Tamper Score: {result.tamperScore}
                            </p>
                            {result.error && <p className="text-sm text-destructive">{result.error}</p>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              result.status === "verified"
                                ? "default"
                                : result.status === "suspicious"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {result.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No results yet. Upload files to see verification results here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing History</CardTitle>
                <CardDescription>Previous bulk verification jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {jobHistory.length > 0 ? (
                  <div className="space-y-4">
                    {jobHistory.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{job.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()} • {job.totalFiles} files
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="flex space-x-2">
                              <Badge variant="default">{job.successfulVerifications} verified</Badge>
                              {job.failedVerifications > 0 && (
                                <Badge variant="destructive">{job.failedVerifications} failed</Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Download Report
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No previous jobs found. Your bulk verification history will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
