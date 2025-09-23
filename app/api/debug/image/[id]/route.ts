import { type NextRequest, NextResponse } from "next/server"
import { ResultsStorage } from "@/lib/results-storage"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id
    const result = ResultsStorage.get(jobId)
    
    if (!result || !result.certificate_image) {
      return NextResponse.json({ error: "No image found" }, { status: 404 })
    }

    // Convert base64 back to buffer and serve as image
    const imageBuffer = Buffer.from(result.certificate_image, 'base64')
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': result.certificate_mimetype || 'application/pdf',
        'Content-Length': imageBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Image serve error:", error)
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 })
  }
}