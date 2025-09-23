import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const { batchId } = params

    // Mock status based on batch age (simulate processing)
    const batchTimestamp = Number.parseInt(batchId.split("_")[1]) || Date.now()
    const ageInSeconds = (Date.now() - batchTimestamp) / 1000

    let status = "processing"
    let processedCertificates = 0
    let successfulVerifications = 0
    let failedVerifications = 0
    const totalCertificates = 5 // Mock total

    if (ageInSeconds > 30) {
      status = "completed"
      processedCertificates = totalCertificates
      successfulVerifications = 4
      failedVerifications = 1
    } else if (ageInSeconds > 10) {
      processedCertificates = Math.min(Math.floor(ageInSeconds / 5), totalCertificates)
      successfulVerifications = Math.floor(processedCertificates * 0.8)
      failedVerifications = processedCertificates - successfulVerifications
    }

    return NextResponse.json({
      id: batchId,
      status,
      total_certificates: totalCertificates,
      processed_certificates: processedCertificates,
      successful_verifications: successfulVerifications,
      failed_verifications: failedVerifications,
      created_at: new Date(batchTimestamp).toISOString(),
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Batch status error:", error)
    return NextResponse.json({ error: "Failed to get batch status" }, { status: 500 })
  }
}
