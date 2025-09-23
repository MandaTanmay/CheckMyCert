import { type NextRequest, NextResponse } from "next/server"
import { ResultsStorage } from "@/lib/results-storage"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id
    console.log(`Results API: Looking for job_id: ${jobId}`)

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    // Get stored verification results
    const storedResult = ResultsStorage.get(jobId)
    console.log(`Results API: Found stored result:`, !!storedResult)
    
    if (storedResult) {
      console.log(`Results API: Result details:`, {
        job_id: storedResult.job_id,
        status: storedResult.status,
        has_text: !!storedResult.extracted_text,
        confidence: storedResult.confidence,
        has_image: !!storedResult.certificate_image,
        image_length: storedResult.certificate_image?.length || 0,
        filename: storedResult.certificate_filename,
        mimetype: storedResult.certificate_mimetype
      })
    }

    if (!storedResult) {
      console.log(`Results API: No results found for job_id: ${jobId}`)
      // Let's see what's actually stored
      const allResults = ResultsStorage.getAll()
      console.log(`Results API: All stored results:`, allResults.map(r => ({ 
        job_id: r.job_id, 
        timestamp: r.timestamp 
      })))
      return NextResponse.json({ error: "Verification results not found" }, { status: 404 })
    }

    // Convert OCR results to display format
    const extractedFields = []
    
    if (storedResult.extracted_fields) {
      for (const [fieldName, fieldData] of Object.entries(storedResult.extracted_fields)) {
        if (fieldData && typeof fieldData === 'object' && 'value' in fieldData) {
          extractedFields.push({
            field: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1'),
            value: (fieldData as any).value,
            confidence: (fieldData as any).confidence || 85,
            coordinates: { x: 100, y: 100, width: 200, height: 25 }
          })
        }
      }
    }

    // If no structured fields, add the raw text
    if (extractedFields.length === 0 && storedResult.extracted_text) {
      extractedFields.push({
        field: "Extracted Text",
        value: storedResult.extracted_text,
        confidence: storedResult.confidence,
        coordinates: { x: 50, y: 50, width: 400, height: 300 }
      })
    }

    // Perform database verification if we have extracted fields
    let databaseVerification = null
    if (storedResult.extracted_fields || storedResult.extracted_text) {
      try {
        databaseVerification = await performDatabaseVerification(storedResult.extracted_fields || {}, jobId)
      } catch (error) {
        console.error("Database verification failed:", error)
        // Continue without database verification
      }
    }

    const result = {
      id: jobId,
      status: storedResult.confidence > 80 ? "valid" : "unverified",
      overallConfidence: storedResult.confidence,
      extractedFields: extractedFields,
      tamperIssues: [],
      signatureValid: true,
      databaseMatch: databaseVerification?.database_match || false,
      databaseVerification: databaseVerification,
      qrToken: `qr_${jobId}`,
      processedAt: storedResult.timestamp,
      extractedText: storedResult.extracted_text,
      ocrResult: storedResult.ocr_result,
      certificateImage: storedResult.certificate_image,
      certificateFilename: storedResult.certificate_filename,
      certificateMimetype: storedResult.certificate_mimetype,
      wordCoordinates: storedResult.word_coordinates || []
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Results fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch verification results" },
      { status: 500 }
    )
  }
}

async function performDatabaseVerification(extractedFields: any, jobId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/database/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        extractedFields,
        jobId
      })
    })

    if (!response.ok) {
      throw new Error(`Database verification API failed: ${response.status}`)
    }

    const result = await response.json()
    return result.verification_result
  } catch (error) {
    console.error("Failed to call database verification API:", error)
    return null
  }
}