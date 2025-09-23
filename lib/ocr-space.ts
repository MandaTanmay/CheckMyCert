interface OCRSpaceResponse {
  ParsedResults: Array<{
    TextOverlay: {
      Lines: Array<{
        LineText: string
        Words: Array<{
          WordText: string
          Left: number
          Top: number
          Height: number
          Width: number
        }>
      }>
    }
    TextOrientation: string
    FileParseExitCode: number
    ParsedText: string
    ErrorMessage?: string
    ErrorDetails?: string
  }>
  OCRExitCode: number
  IsErroredOnProcessing: boolean
  ProcessingTimeInMilliseconds: string
  SearchablePDFURL?: string
}

interface OCRResult {
  text: string
  confidence: number
  words: Array<{
    text: string
    bbox: {
      x: number
      y: number
      width: number
      height: number
    }
    confidence: number
  }>
  language: string
  error?: string
  extractedFields?: Record<string, any>
}

export class OCRSpaceClient {
  private apiKey: string
  private baseUrl = "https://api.ocr.space/parse/image"

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("OCR.space API key is required")
    }
    this.apiKey = apiKey
  }

  async processImage(
    imageFile: File | string,
    options: {
      language?: string
      isOverlayRequired?: boolean
      detectOrientation?: boolean
      isTable?: boolean
      scale?: boolean
    } = {},
  ): Promise<OCRResult> {
    try {
      const formData = new FormData()

      if (typeof imageFile === "string") {
        formData.append("url", imageFile)
      } else {
        formData.append("file", imageFile)
      }

      formData.append("apikey", this.apiKey)
      formData.append("language", options.language || "eng")
      formData.append("isOverlayRequired", options.isOverlayRequired ? "true" : "false")
      formData.append("detectOrientation", options.detectOrientation ? "true" : "false")
      formData.append("isTable", options.isTable ? "true" : "false")
      formData.append("scale", options.scale ? "true" : "false")
      formData.append("OCREngine", "2") // Use OCR Engine 2 for better accuracy

      const response = await fetch(this.baseUrl, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`OCR.space API error: ${response.status} ${response.statusText}`)
      }

      const data: OCRSpaceResponse = await response.json()

      if (data.IsErroredOnProcessing) {
        throw new Error(`OCR processing failed: ${data.ParsedResults?.[0]?.ErrorMessage || "Unknown error"}`)
      }

      const parsedResult = data.ParsedResults?.[0]
      if (!parsedResult) {
        throw new Error("No OCR results returned")
      }

      // Extract text and word-level information
      const text = parsedResult.ParsedText || ""
      const words: OCRResult["words"] = []

      if (parsedResult.TextOverlay?.Lines) {
        parsedResult.TextOverlay.Lines.forEach((line) => {
          line.Words?.forEach((word) => {
            words.push({
              text: word.WordText,
              bbox: {
                x: word.Left,
                y: word.Top,
                width: word.Width,
                height: word.Height,
              },
              confidence: 85, // OCR.space doesn't provide word-level confidence, use default
            })
          })
        })
      }

      // Calculate overall confidence based on text quality
      const confidence = this.calculateConfidence(text, words)

      return {
        text: text.trim(),
        confidence,
        words,
        language: options.language || "eng",
      }
    } catch (error) {
      console.error("OCR.space processing error:", error)
      return {
        text: "",
        confidence: 0,
        words: [],
        language: options.language || "eng",
        error: error instanceof Error ? error.message : "OCR processing failed",
      }
    }
  }

  private calculateConfidence(text: string, words: Array<any>): number {
    if (!text || text.length === 0) return 0

    // Basic confidence calculation based on text characteristics
    let confidence = 70 // Base confidence

    // Boost confidence for longer text
    if (text.length > 100) confidence += 10
    if (text.length > 500) confidence += 5

    // Boost confidence for proper sentence structure
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    if (sentences.length > 1) confidence += 5

    // Boost confidence for proper capitalization
    const capitalizedWords = text.match(/\b[A-Z][a-z]+/g) || []
    if (capitalizedWords.length > 0) confidence += 5

    // Reduce confidence for too many special characters
    const specialChars = text.match(/[^a-zA-Z0-9\s.,!?-]/g) || []
    if (specialChars.length > text.length * 0.1) confidence -= 10

    // Ensure confidence is within bounds
    return Math.max(0, Math.min(100, confidence))
  }

  // Extract structured fields from OCR text
  extractFields(text: string): Record<string, any> {
    const fields: Record<string, any> = {}

    // Common certificate field patterns
    const patterns = {
      studentName: [
        /(?:name|student|recipient)[:\s]+([A-Za-z\s]+?)(?:\n|$|[A-Z]{2,})/i,
        /this is to certify that\s+([A-Za-z\s]+?)(?:\s+has|$)/i,
        /awarded to\s+([A-Za-z\s]+?)(?:\n|$)/i,
      ],
      degree: [
        /(?:degree|diploma|certificate)[:\s]+([A-Za-z\s]+?)(?:\n|$)/i,
        /bachelor of\s+([A-Za-z\s]+?)(?:\n|$)/i,
        /master of\s+([A-Za-z\s]+?)(?:\n|$)/i,
        /doctor of\s+([A-Za-z\s]+?)(?:\n|$)/i,
      ],
      institution: [
        /(?:university|college|institute|school)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
        /^([A-Za-z\s]+?(?:University|College|Institute|School))/im,
      ],
      graduationDate: [
        /(?:date|graduated|conferred)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
        /(?:date|graduated|conferred)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
        /(\d{4})/i, // Year only
      ],
      gpa: [/(?:gpa|grade point average)[:\s]*(\d+\.?\d*)/i, /(\d\.\d{2})\s*(?:gpa|grade)/i],
    }

    for (const [fieldName, fieldPatterns] of Object.entries(patterns)) {
      for (const pattern of fieldPatterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
          const value = match[1].trim()
          if (value && value.length > 1) {
            fields[fieldName] = {
              value,
              confidence: this.calculateFieldConfidence(value, fieldName),
              pattern: pattern.source,
            }
            break
          }
        }
      }
    }

    return fields
  }

  private calculateFieldConfidence(value: string, fieldType: string): number {
    let confidence = 80

    switch (fieldType) {
      case "studentName":
        if (/^[A-Za-z\s]+$/.test(value) && value.split(" ").length >= 2) {
          confidence = Math.min(95, confidence + 15)
        }
        break
      case "graduationDate":
        if (/\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(value)) {
          confidence = Math.min(95, confidence + 15)
        }
        break
      case "gpa":
        try {
          const gpaVal = Number.parseFloat(value)
          if (gpaVal >= 0 && gpaVal <= 4.0) {
            confidence = Math.min(95, confidence + 15)
          }
        } catch {
          // Invalid GPA format
        }
        break
    }

    return confidence
  }
}

// Export singleton instance with proper error handling
let ocrSpaceClient: OCRSpaceClient
try {
  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) {
    throw new Error("OCR_SPACE_API_KEY environment variable is not set")
  }
  ocrSpaceClient = new OCRSpaceClient(apiKey)
} catch (error) {
  console.error("Failed to initialize OCR.space client:", error)
  // Create a dummy client for development
  ocrSpaceClient = new OCRSpaceClient("dummy-key")
}

export { ocrSpaceClient }
