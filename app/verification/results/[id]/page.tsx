"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Share2,
  Eye,
  MapPin,
  Calendar,
  User,
  GraduationCap,
  ZoomIn,
  X as CloseIcon,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

interface ExtractedField {
  field: string
  value: string
  confidence: number
  coordinates: { x: number; y: number; width: number; height: number }
}

interface TamperIssue {
  type: string
  severity: "low" | "medium" | "high"
  description: string
  coordinates: { x: number; y: number; width: number; height: number }
}

interface DatabaseVerificationResult {
  database_match: boolean
  matched_record: any
  matched_institution: any
  comparison_details: Array<{
    field: string
    extracted_value: string
    database_value: string
    confidence: number
    is_match: boolean
  }>
  confidence_score: number
  verification_status: 'valid' | 'unverified' | 'tampered'
}

interface VerificationResult {
  id: string
  status: "valid" | "tampered" | "unverified"
  overallConfidence: number
  extractedFields: ExtractedField[]
  tamperIssues: TamperIssue[]
  signatureValid: boolean
  databaseMatch: boolean
  databaseVerification?: DatabaseVerificationResult | null
  qrToken: string
  processedAt: string
  extractedText?: string
  ocrResult?: any
  certificateImage?: string | null
  certificateFilename?: string | null
  certificateMimetype?: string | null
  wordCoordinates?: Array<{
    text: string
    bbox: {
      x: number
      y: number
      width: number
      height: number
    }
    confidence: number
  }>
  lineCoordinates?: Array<{
    text: string
    bbox: {
      x: number
      y: number
      width: number
      height: number
    }
    word_count: number
  }>
}

function normalizeExtractedFields(raw: any): ExtractedField[] {
  if (Array.isArray(raw)) {
    return raw
  }

  if (!raw || typeof raw !== "object") {
    return []
  }

  return Object.entries(raw as Record<string, any>)
    .filter(([field]) => !field.startsWith("_"))
    .map(([field, value]) => {
    if (value && typeof value === "object") {
      return {
        field,
        value: String(value.value ?? ""),
        confidence: Number(value.confidence ?? 0),
        coordinates: value.coordinates ?? { x: 0, y: 0, width: 0, height: 0 },
      }
    }

    return {
      field,
      value: String(value ?? ""),
      confidence: 0,
      coordinates: { x: 0, y: 0, width: 0, height: 0 },
    }
  })
}

function normalizeVerificationResult(payload: any): VerificationResult {
  const extractedFields = normalizeExtractedFields(payload?.extractedFields ?? payload?.extracted_fields)

  const tamperIssues = Array.isArray(payload?.tamperIssues)
    ? payload.tamperIssues
    : Array.isArray(payload?.tamper_issues)
      ? payload.tamper_issues
      : []

  const wordCoordinates = Array.isArray(payload?.wordCoordinates)
    ? payload.wordCoordinates
    : Array.isArray(payload?.word_coordinates)
      ? payload.word_coordinates
      : []

  const lineCoordinates = Array.isArray(payload?.lineCoordinates)
    ? payload.lineCoordinates
    : Array.isArray(payload?.line_coordinates)
      ? payload.line_coordinates
      : []

  const normalizedLineCoordinates = lineCoordinates
    .filter((line: any) => line && typeof line === "object")
    .map((line: any) => {
      const rawBbox = line.bbox && typeof line.bbox === "object" ? line.bbox : null
      const x = Number(rawBbox?.x ?? line.x ?? 0)
      const y = Number(rawBbox?.y ?? line.y ?? 0)
      const width = Number(rawBbox?.width ?? line.width ?? 0)
      const height = Number(rawBbox?.height ?? line.height ?? 0)

      return {
        text: String(line.text ?? ""),
        bbox: {
          x,
          y,
          width,
          height,
        },
        word_count: Number(line.word_count ?? line.wordCount ?? 0),
      }
    })

  const rawDatabaseVerification = payload?.databaseVerification ?? payload?.database_verification
  const hasFlatDatabaseMatch =
    payload?.databaseMatch !== undefined ||
    payload?.database_match !== undefined ||
    payload?.matched_record !== undefined ||
    payload?.matched_institution !== undefined

  const normalizedDatabaseVerification = rawDatabaseVerification
    ? {
        ...rawDatabaseVerification,
        confidence_score: Number(rawDatabaseVerification?.confidence_score ?? 0),
        verification_status: (rawDatabaseVerification?.verification_status ?? payload?.status ?? 'unverified') as
          | 'valid'
          | 'unverified'
          | 'tampered',
      }
    : hasFlatDatabaseMatch
      ? {
          database_match: Boolean(payload?.databaseMatch ?? payload?.database_match ?? false),
          matched_record: payload?.matched_record ?? null,
          matched_institution: payload?.matched_institution ?? null,
          comparison_details: [],
          confidence_score: Number(payload?.overallConfidence ?? payload?.overall_confidence ?? 0),
          verification_status: (payload?.status ?? 'unverified') as 'valid' | 'unverified' | 'tampered',
        }
      : null

  return {
    id: String(payload?.id || ""),
    status: payload?.status || "unverified",
    overallConfidence: Number(payload?.overallConfidence ?? payload?.overall_confidence ?? 0),
    extractedFields,
    tamperIssues,
    signatureValid: Boolean(payload?.signatureValid ?? payload?.signature_valid ?? false),
    databaseMatch: Boolean(
      payload?.databaseMatch ??
        payload?.database_match ??
        normalizedDatabaseVerification?.database_match ??
        false,
    ),
    databaseVerification: normalizedDatabaseVerification,
    qrToken: payload?.qrToken || payload?.qr_token || "",
    processedAt: payload?.processedAt || payload?.processed_at || payload?.created_at || new Date().toISOString(),
    extractedText: payload?.extractedText || payload?.extracted_text || "",
    ocrResult: payload?.ocrResult ?? payload?.ocr_result,
    certificateImage: payload?.certificateImage ?? payload?.certificate_image ?? null,
    certificateFilename:
      payload?.certificateFilename ?? payload?.certificate_filename ?? payload?.certificate?.original_filename ?? null,
    certificateMimetype: payload?.certificateMimetype ?? payload?.certificate_mimetype ?? payload?.certificate?.file_type ?? null,
    wordCoordinates,
    lineCoordinates: normalizedLineCoordinates,
  }
}

export default function VerificationResultsPage({ params }: { params: { id: string } }) {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [activeTab, setActiveTab] = useState("fields")
  const [selectedField, setSelectedField] = useState<ExtractedField | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<TamperIssue | null>(null)
  const [loading, setLoading] = useState(true)
  const [databaseLoading, setDatabaseLoading] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showTextHighlights, setShowTextHighlights] = useState(true)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const maxAttempts = 20
        let response: Response | null = null

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          response = await fetch(`/api/verification/results/${params.id}`)
          if (response.ok) {
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        if (response?.ok) {
          const data = await response.json()
          const normalized = normalizeVerificationResult(data)
          setResult(normalized)

          // If we have result data but no database verification, try to fetch it
          if (!normalized.databaseVerification && normalized.extractedFields.length > 0) {
            fetchDatabaseVerification(normalized)
          }
        } else {
          console.error("Failed to fetch results after retries")
          setResult(null)
        }
      } catch (error) {
        console.error("Error fetching results:", error)
        setResult(null)
      } finally {
        setLoading(false)
      }
    }

    const fetchDatabaseVerification = async (resultData: VerificationResult) => {
      setDatabaseLoading(true)
      try {
        console.log('Fetching database verification for result:', resultData.id)
        
        // Prepare certificate data for database verification
        const certificateData = {
          student_name: resultData.extractedFields.find(f => 
            f.field.toLowerCase().includes('name') || 
            f.field.toLowerCase().includes('student')
          )?.value || '',
          certificate_type: resultData.extractedFields.find(f => 
            f.field.toLowerCase().includes('degree') || 
            f.field.toLowerCase().includes('certificate') ||
            f.field.toLowerCase().includes('course')
          )?.value || '',
          institution_name: resultData.extractedFields.find(f => 
            f.field.toLowerCase().includes('institution') || 
            f.field.toLowerCase().includes('university') ||
            f.field.toLowerCase().includes('college')
          )?.value || '',
          graduation_date: resultData.extractedFields.find(f => 
            f.field.toLowerCase().includes('date') || 
            f.field.toLowerCase().includes('year')
          )?.value || '',
          certificate_number: resultData.extractedFields.find(f => 
            f.field.toLowerCase().includes('number') || 
            f.field.toLowerCase().includes('id')
          )?.value || '',
          extracted_text: resultData.extractedText || ''
        }

        console.log('Sending certificate data for verification:', certificateData)

        const dbResponse = await fetch('/api/database/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(certificateData)
        })

        if (dbResponse.ok) {
          const dbVerification = await dbResponse.json()
          console.log('Database verification result:', dbVerification)
          
          // Update the result with database verification
          setResult(prev => prev ? {
            ...prev,
            databaseVerification: dbVerification,
            databaseMatch: dbVerification.database_match,
            status: dbVerification.verification_status || prev.status
          } : null)
        } else {
          console.error('Database verification failed:', dbResponse.statusText)
          const errorText = await dbResponse.text()
          console.error('Error details:', errorText)
        }
      } catch (error) {
        console.error('Error during database verification:', error)
      } finally {
        setDatabaseLoading(false)
      }
    }

    fetchResults()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Processing verification results...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-medium">Verification results not found</p>
          <Link href="/upload" className="text-primary hover:underline">
            Upload a new certificate
          </Link>
        </div>
      </div>
    )
  }

  const getStatusIcon = () => {
    switch (result.status) {
      case "valid":
        return <CheckCircle className="h-6 w-6 text-success" />
      case "tampered":
        return <XCircle className="h-6 w-6 text-destructive" />
      case "unverified":
        return <AlertTriangle className="h-6 w-6 text-warning" />
    }
  }

  const getStatusColor = () => {
    switch (result.status) {
      case "valid":
        return "bg-success text-success-foreground"
      case "tampered":
        return "bg-destructive text-destructive-foreground"
      case "unverified":
        return "bg-warning text-warning-foreground"
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-success"
    if (confidence >= 70) return "text-warning"
    return "text-destructive"
  }

  const isLiveOCRFallbackMode =
    result.signatureValid === false &&
    result.tamperIssues.some(
      (issue) =>
        issue.type === "processing_unavailable" ||
        issue.type === "ocr_unavailable" ||
        issue.type === "ocr_error",
    )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">CheckMyCert</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Button variant="outline" size="sm">
              Sign Out
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Status Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {getStatusIcon()}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Verification Results</h1>
              <p className="text-muted-foreground">Certificate ID: {result.id}</p>
              {isLiveOCRFallbackMode && (
                <Badge className="mt-2 bg-amber-100 text-amber-800 border border-amber-300">
                  LIVE OCR FALLBACK MODE
                </Badge>
              )}
            </div>
            <div className="ml-auto">
              <Badge className={getStatusColor()}>{result.status.toUpperCase()}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>
              Overall Confidence:{" "}
              <span className={`font-medium ${getConfidenceColor(result.overallConfidence)}`}>
                {result.overallConfidence}%
              </span>
            </span>
            <span>Processed: {new Date(result.processedAt).toLocaleString()}</span>
            <span>Digital Signature: {result.signatureValid ? "✓ Valid" : "✗ Invalid"}</span>
            <span>
              Database Match: {result.databaseMatch ? (
                <span className="text-success">✓ Found ({result.databaseVerification?.confidence_score?.toFixed(1) || 0}%)</span>
              ) : (
                <span className="text-destructive">✗ Not Found</span>
              )}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share Results
          </Button>
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            View QR Code
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Certificate Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Certificate Analysis</CardTitle>
                <CardDescription>
                  Click on highlighted areas to view extracted data and tamper detection results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-muted/30 rounded-lg p-4 border-2 border-dashed border-border">
                  {/* Display actual uploaded certificate */}
                  {result.certificateImage && !imageError ? (
                    <div className="relative w-full">
                      {/* Check if it's a PDF file */}
                      {result.certificateMimetype === 'application/pdf' ? (
                        <div className="w-full bg-white rounded shadow-lg border p-4">
                          <div className="text-center mb-4">
                            <FileText className="h-16 w-16 text-blue-600 mx-auto mb-2" />
                            <h3 className="text-lg font-medium">PDF Certificate</h3>
                            <p className="text-sm text-gray-600">{result.certificateFilename}</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Extracted Text:</strong>
                            </p>
                            <div className="bg-white p-3 rounded border text-sm">
                              {result.extractedText || 'No text extracted'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="relative cursor-pointer group"
                          onClick={() => setShowFullscreen(true)}
                        >
                          <img
                            src={`data:${result.certificateMimetype || 'image/jpeg'};base64,${result.certificateImage}`}
                            alt={result.certificateFilename || "Uploaded Certificate"}
                            className="w-full h-auto max-w-full max-h-screen rounded shadow-lg border bg-white object-contain transition-transform group-hover:scale-[1.02]"
                            onError={(e) => {
                              console.error("Image failed to load with base64 data URL:", {
                                mimetype: result.certificateMimetype,
                                filename: result.certificateFilename,
                                imageLength: result.certificateImage?.length,
                                base64Preview: result.certificateImage?.substring(0, 50) + "..."
                              })
                              setImageError(true)
                            }}
                            onLoad={(e) => {
                              console.log("Certificate image loaded successfully:", {
                                filename: result.certificateFilename,
                                naturalWidth: (e.target as HTMLImageElement).naturalWidth,
                                naturalHeight: (e.target as HTMLImageElement).naturalHeight
                              })
                              const img = e.target as HTMLImageElement
                              setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                            }}
                          />
                          
                          {/* Zoom overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
                              <ZoomIn className="h-6 w-6 text-gray-700" />
                            </div>
                          </div>
                        </div>
                      )}
                        
                        {/* Text highlighting overlay - temporarily disabled due to inline style restrictions */}
                        {false && showTextHighlights && result?.wordCoordinates && imageSize && (
                          <div className="absolute inset-0 pointer-events-none">
                            <p className="text-center p-4 bg-yellow-100 text-yellow-800 rounded">
                              Text highlighting will be available once CSS restrictions are resolved.
                              {result?.wordCoordinates?.length || 0} words detected.
                            </p>
                          </div>
                        )}
                      
                      {/* Certificate info overlay */}
                      <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
                        <div className="font-medium">{result.certificateFilename}</div>
                        <div className="text-xs opacity-90">
                          {result.certificateMimetype} • Confidence: {result.overallConfidence}%
                        </div>
                        {result.wordCoordinates && result.wordCoordinates.length > 0 && (
                          <div className="text-xs opacity-90 mt-1">
                            {result.wordCoordinates.length} words detected
                          </div>
                        )}
                        {result.lineCoordinates && result.lineCoordinates.length > 0 && (
                          <div className="text-xs opacity-90 mt-1">
                            {result.lineCoordinates.length} stitched lines
                          </div>
                        )}
                      </div>

                      {/* Text highlighting toggle */}
                      {result.wordCoordinates && result.wordCoordinates.length > 0 && (
                        <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowTextHighlights(!showTextHighlights)
                            }}
                            className="flex items-center gap-2 hover:bg-white/20 p-1 rounded transition-colors"
                            title={showTextHighlights ? "Hide text highlights" : "Show text highlights"}
                          >
                            <Eye className={`h-4 w-4 ${showTextHighlights ? 'text-green-300' : 'text-gray-300'}`} />
                            <span className="font-medium">
                              {showTextHighlights ? 'Hide' : 'Show'} Text Highlights
                            </span>
                          </button>
                          <div className="text-xs opacity-90 mt-1">
                            Click words to see details
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Fallback document preview when image fails or unavailable
                    <div className="bg-white rounded shadow-lg p-8 min-h-[400px] flex flex-col justify-center border-2 border-dashed border-gray-300">
                      <div className="text-center mb-8">
                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                          {result.certificateFilename || "Certificate Document"}
                        </h2>
                        <p className="text-gray-600">
                          {imageError ? "Image preview unavailable - showing extracted data" : "Document processed successfully"}
                        </p>
                        <div className="mt-4 text-sm text-gray-500">
                          {result.certificateMimetype} • Confidence: {result.overallConfidence}%
                        </div>
                      </div>

                      <div className="space-y-6 text-gray-800">
                        {result.extractedFields.length > 0 ? (
                          result.extractedFields.map((field, index) => (
                            <div
                              key={index}
                              className="text-center border-2 border-primary/20 bg-primary/5 p-3 rounded cursor-pointer hover:bg-primary/10 transition-colors"
                              onClick={() => setSelectedField(field)}
                            >
                              <div className="font-medium text-sm text-gray-600">{field.field}</div>
                              <div className="text-lg">{field.value}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center p-6 bg-gray-50 rounded">
                            <p className="text-gray-600">
                              {result.extractedText || "No text could be extracted from this document"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Panel */}
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="words">Words</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="tamper">Tamper</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Extracted Fields</CardTitle>
                    <CardDescription>OCR extracted data with confidence scores</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.extractedFields.map((field, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedField?.field === field.field
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedField(field)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">{field.field}</span>
                          <span className={`text-xs font-medium ${getConfidenceColor(field.confidence)}`}>
                            {field.confidence}%
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{field.value}</p>
                        <Progress value={field.confidence} className="h-1 mt-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="words" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detected Words</CardTitle>
                    <CardDescription>
                      All words detected by OCR with their positions and confidence scores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result.lineCoordinates && result.lineCoordinates.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Stitched Lines</p>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                          {result.lineCoordinates.map((line, index) => (
                            <div
                              key={`line-${index}`}
                              className={`p-2 rounded border cursor-pointer transition-colors ${
                                selectedLine === line.text
                                  ? "border-emerald-500 bg-emerald-50"
                                  : "border-border hover:border-emerald-400 hover:bg-accent/30"
                              }`}
                              onClick={() => setSelectedLine(selectedLine === line.text ? null : line.text)}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm truncate">{line.text || `Line ${index + 1}`}</span>
                                <span className="text-xs text-muted-foreground">{line.word_count} words</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Position: ({line.bbox.x}, {line.bbox.y}) • Size: {line.bbox.width}×{line.bbox.height}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.wordCoordinates && result.wordCoordinates.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                        {result.wordCoordinates.map((word, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded border cursor-pointer transition-colors ${
                              selectedWord === word.text
                                ? "border-blue-500 bg-blue-50"
                                : "border-border hover:border-primary/50 hover:bg-accent/30"
                            }`}
                            onClick={() => setSelectedWord(selectedWord === word.text ? null : word.text)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm">{word.text}</span>
                              <span className={`text-xs font-medium ${getConfidenceColor(word.confidence)}`}>
                                {word.confidence}%
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Position: ({word.bbox.x}, {word.bbox.y}) • Size: {word.bbox.width}×{word.bbox.height}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">
                          {result.lineCoordinates && result.lineCoordinates.length > 0
                            ? "Word coordinates unavailable, but stitched line coordinates are available above"
                            : "No word coordinates available"}
                        </p>
                        {(!result.lineCoordinates || result.lineCoordinates.length === 0) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reprocess this certificate to generate OCR overlay coordinates
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Raw Extracted Text</CardTitle>
                    <CardDescription>Complete OCR extracted text from the certificate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result.extractedText ? (
                      <div className="bg-muted/30 p-4 rounded-lg border">
                        <pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
                          {result.extractedText}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">No extracted text available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tamper" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tamper Detection</CardTitle>
                    <CardDescription>AI-detected potential issues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result.tamperIssues.length === 0 ? (
                      <div className="text-center py-6">
                        <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                        <p className="text-success font-medium">No tampering detected</p>
                        <p className="text-sm text-muted-foreground">Certificate appears authentic</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {result.tamperIssues.map((issue, index) => (
                          <Alert
                            key={index}
                            className={`cursor-pointer transition-colors ${
                              selectedIssue?.type === issue.type
                                ? "border-warning bg-warning/5"
                                : "hover:border-warning/50"
                            }`}
                            onClick={() => setSelectedIssue(issue)}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-sm">{issue.type}</span>
                                <Badge
                                  variant={
                                    issue.severity === "high"
                                      ? "destructive"
                                      : issue.severity === "medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                >
                                  {issue.severity}
                                </Badge>
                              </div>
                              <AlertDescription className="text-xs">{issue.description}</AlertDescription>
                            </div>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="database" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Database Verification</CardTitle>
                    <CardDescription>Institution record matching</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.databaseVerification ? (
                      <>
                        {/* Database Match Status */}
                        <div className={`flex items-center gap-3 p-3 border rounded-lg ${
                          result.databaseVerification.database_match 
                            ? 'bg-success/5 border-success/20' 
                            : 'bg-destructive/5 border-destructive/20'
                        }`}>
                          {result.databaseVerification.database_match ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {result.databaseVerification.database_match ? 'Record Found' : 'No Record Found'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {result.databaseVerification.database_match 
                                ? `Verified against ${result.databaseVerification.matched_institution?.name || 'institutional'} database`
                                : 'No matching record found in institutional databases'
                              }
                            </p>
                          </div>
                          <div className="ml-auto">
                            <Badge variant={
                              result.databaseVerification.confidence_score >= 90 ? 'default' :
                              result.databaseVerification.confidence_score >= 70 ? 'secondary' : 'destructive'
                            }>
                              {result.databaseVerification.confidence_score.toFixed(1)}% match
                            </Badge>
                          </div>
                        </div>

                        {/* Matched Record Details */}
                        {result.databaseVerification.database_match && result.databaseVerification.matched_record ? (
                          <div className="space-y-3 text-sm">
                            <h4 className="font-medium text-foreground mb-2">Matched Record Details:</h4>
                            
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Student:</span>
                              <span>{result.databaseVerification.matched_record.student_name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Degree:</span>
                              <span>
                                {result.databaseVerification.matched_record.certificate_type}
                                {result.databaseVerification.matched_record.degree_program && 
                                  ` in ${result.databaseVerification.matched_record.degree_program}`
                                }
                              </span>
                            </div>
                            
                            {result.databaseVerification.matched_record.graduation_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Graduated:</span>
                                <span>{new Date(result.databaseVerification.matched_record.graduation_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Institution:</span>
                              <span>{result.databaseVerification.matched_institution?.name}</span>
                            </div>

                            {result.databaseVerification.matched_record.certificate_number && (
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Certificate Number:</span>
                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                  {result.databaseVerification.matched_record.certificate_number}
                                </span>
                              </div>
                            )}

                            {result.databaseVerification.matched_record.gpa && (
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">GPA:</span>
                                <span>{result.databaseVerification.matched_record.gpa}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">No Database Record Found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              This certificate could not be verified against institutional databases.
                              This may indicate:
                            </p>
                            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                              <li>• The certificate is from an institution not in our database</li>
                              <li>• The certificate information is incomplete or unclear</li>
                              <li>• The certificate may be forged or invalid</li>
                            </ul>
                          </div>
                        )}

                        {/* Verification Status Summary */}
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Overall Verification Status:</span>
                            <Badge variant={
                              result.databaseVerification.verification_status === 'valid' ? 'default' :
                              result.databaseVerification.verification_status === 'unverified' ? 'secondary' : 'destructive'
                            }>
                              {result.databaseVerification.verification_status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {result.databaseVerification.verification_status === 'valid' && 
                              'This certificate has been successfully verified against institutional records.'}
                            {result.databaseVerification.verification_status === 'unverified' && 
                              'This certificate could not be fully verified due to insufficient database matches.'}
                            {result.databaseVerification.verification_status === 'tampered' && 
                              'This certificate shows signs of tampering or forgery based on database comparison.'}
                          </p>
                        </div>
                      </>
                    ) : databaseLoading ? (
                      /* Loading Database Verification */
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-foreground font-medium">Verifying against database...</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Comparing certificate data with institutional records
                        </p>
                      </div>
                    ) : (
                      /* No Database Verification Available */
                      <div className="text-center py-6">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">Database Verification Unavailable</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Unable to verify this certificate against institutional databases.
                        </p>
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (result && result.extractedFields && result.extractedFields.length > 0) {
                                const certificateData = {
                                  student_name: result.extractedFields.find(f => 
                                    f.field.toLowerCase().includes('name') || 
                                    f.field.toLowerCase().includes('student')
                                  )?.value || '',
                                  certificate_type: result.extractedFields.find(f => 
                                    f.field.toLowerCase().includes('degree') || 
                                    f.field.toLowerCase().includes('certificate') ||
                                    f.field.toLowerCase().includes('course')
                                  )?.value || '',
                                  institution_name: result.extractedFields.find(f => 
                                    f.field.toLowerCase().includes('institution') || 
                                    f.field.toLowerCase().includes('university') ||
                                    f.field.toLowerCase().includes('college')
                                  )?.value || '',
                                  graduation_date: result.extractedFields.find(f => 
                                    f.field.toLowerCase().includes('date') || 
                                    f.field.toLowerCase().includes('year')
                                  )?.value || '',
                                  certificate_number: result.extractedFields.find(f => 
                                    f.field.toLowerCase().includes('number') || 
                                    f.field.toLowerCase().includes('id')
                                  )?.value || '',
                                  extracted_text: result.extractedText || ''
                                }
                                
                                setDatabaseLoading(true)
                                fetch('/api/database/verify', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(certificateData)
                                })
                                .then(res => res.ok ? res.json() : Promise.reject(res))
                                .then(dbVerification => {
                                  setResult(prev => prev ? {
                                    ...prev,
                                    databaseVerification: dbVerification,
                                    databaseMatch: dbVerification.database_match,
                                    status: dbVerification.verification_status || prev.status
                                  } : null)
                                })
                                .catch(error => console.error('Manual verification failed:', error))
                                .finally(() => setDatabaseLoading(false))
                              }
                            }}
                            disabled={!result?.extractedFields?.length}
                          >
                            Retry Verification
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF Report
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Share2 className="mr-2 h-4 w-4" />
                  Generate Share Link
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Eye className="mr-2 h-4 w-4" />
                  Public QR Verification
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Fullscreen Certificate Modal */}
      {showFullscreen && result?.certificateImage && !imageError && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setShowFullscreen(false)}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
              title="Close fullscreen view"
              aria-label="Close fullscreen view"
            >
              <CloseIcon className="h-6 w-6" />
            </button>
            
            <img
              src={`data:${result.certificateMimetype || 'application/pdf'};base64,${result.certificateImage}`}
              alt={result.certificateFilename || "Uploaded Certificate"}
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
            />
            
            <div className="absolute bottom-4 left-4 bg-black/80 text-white px-4 py-3 rounded-lg backdrop-blur-sm">
              <div className="font-medium text-lg">{result.certificateFilename}</div>
              <div className="text-sm opacity-90">
                {result.certificateMimetype} • Confidence: {result.overallConfidence}% • Click outside to close
              </div>
            </div>
          </div>
          
          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setShowFullscreen(false)}
          />
        </div>
      )}
    </div>
  )
}
