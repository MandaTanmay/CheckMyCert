import { type NextRequest, NextResponse } from "next/server"
import { ResultsStorage } from "@/lib/results-storage"

export async function GET(request: NextRequest) {
  try {
    const allResults = ResultsStorage.getAll()
    
    const debugInfo = allResults.map(result => ({
      job_id: result.job_id,
      filename: result.certificate_filename,
      mimetype: result.certificate_mimetype,
      has_image: !!result.certificate_image,
      image_length: result.certificate_image?.length || 0,
      image_preview: result.certificate_image?.substring(0, 50) + '...' || 'No image',
      text_length: result.extracted_text?.length || 0,
      word_count: result.word_coordinates?.length || 0,
      timestamp: result.timestamp
    }))

    return NextResponse.json({
      total_results: allResults.length,
      results: debugInfo
    })
  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json({ error: "Debug failed" }, { status: 500 })
  }
}