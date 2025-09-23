import { type NextRequest, NextResponse } from "next/server"
import { ocrSpaceClient } from "@/lib/ocr-space"
import { ResultsStorage } from "@/lib/results-storage"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const ocrLanguage = (formData.get("ocr_language") as string) || "eng"
    const translateEnabled = formData.get("translate_enabled") === "true"
    const translateTo = (formData.get("translate_to") as string) || "english"
    const ocrEnabled = formData.get("ocr_enabled") === "true"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Process first file with OCR.space if enabled
    let ocrResult = null
    let certificateImage = null
    let certificateFilename = null
    let certificateMimetype = null
    
    if (files[0]) {
      // Convert file to base64 for storage and display
      try {
        const fileBuffer = await files[0].arrayBuffer()
        const uint8Array = new Uint8Array(fileBuffer)
        const base64String = Buffer.from(uint8Array).toString('base64')
        
        // Validate base64 string
        if (base64String && base64String.length > 0) {
          certificateImage = base64String
          certificateFilename = files[0].name
          certificateMimetype = files[0].type || 'application/pdf'
          
          console.log(`Upload API: Certificate image processed successfully`)
          console.log(`Upload API: Filename: ${certificateFilename}`)
          console.log(`Upload API: MIME type: ${certificateMimetype}`)
          console.log(`Upload API: Base64 length: ${base64String.length}`)
          console.log(`Upload API: Base64 preview: ${base64String.substring(0, 50)}...`)
        } else {
          console.error("Base64 conversion resulted in empty string")
        }
      } catch (error) {
        console.error("Failed to convert certificate to base64:", error)
        certificateImage = null
        certificateFilename = files[0].name
        certificateMimetype = files[0].type
      }
      
      // Process with OCR if enabled
      if (ocrEnabled) {
        try {
          console.log("Starting OCR processing with OCR.space...")
          ocrResult = await ocrSpaceClient.processImage(files[0], {
            language: ocrLanguage,
            isOverlayRequired: true,
            detectOrientation: true,
            scale: true,
          })

          console.log("OCR processing completed:", {
            hasText: !!ocrResult.text,
            confidence: ocrResult.confidence,
            wordCount: ocrResult.words?.length || 0,
            error: ocrResult.error
          })

          // Extract structured fields
          if (ocrResult.text) {
            const extractedFields = ocrSpaceClient.extractFields(ocrResult.text)
            ocrResult.extractedFields = extractedFields
          }
        } catch (ocrError) {
          console.error("OCR processing failed:", ocrError)
          ocrResult = {
            error: ocrError instanceof Error ? ocrError.message : "OCR processing failed",
            text: "",
            confidence: 0,
            words: [],
            language: ocrLanguage,
          }
        }
      }
    }

    // In a real implementation, you would:
    // 1. Save files to storage (S3, local filesystem, etc.)
    // 2. Create database records
    // 3. Queue background processing jobs
    // 4. Return job ID for status tracking

    // Store results for display on results page
    const resultData = {
      job_id: jobId,
      status: "completed",
      extracted_text: ocrResult?.text || "No text extracted",
      extracted_fields: ocrResult?.extractedFields || {},
      confidence: ocrResult?.confidence || 0,
      timestamp: new Date().toISOString(),
      ocr_result: ocrResult,
      certificate_image: certificateImage,
      certificate_filename: certificateFilename,
      certificate_mimetype: certificateMimetype,
      word_coordinates: ocrResult?.words || []
    }
    
    console.log(`Upload API: Storing results for job_id: ${jobId}`)
    ResultsStorage.store(jobId, resultData)
    
    // Verify storage worked
    const storedCheck = ResultsStorage.get(jobId)
    console.log(`Upload API: Storage verification - found result:`, !!storedCheck)

    return NextResponse.json({
      job_id: jobId,
      status: "completed",
      message: "Certificate processed successfully",
      ocr_result: ocrResult,
      files_processed: files.length,
      processing_options: {
        ocr_language: ocrLanguage,
        translate_enabled: translateEnabled,
        translate_to: translateTo,
        ocr_enabled: ocrEnabled,
      },
      extracted_text: ocrResult?.text || null,
      extracted_fields: ocrResult?.extractedFields || null,
      confidence: ocrResult?.confidence || 0,
      verification_complete: true
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 })
  }
}
