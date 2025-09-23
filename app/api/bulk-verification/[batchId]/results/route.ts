import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const { batchId } = params

    // Mock results
    const mockResults = [
      {
        id: "1",
        filename: "certificate_001.pdf",
        status: "verified",
        confidence: 98.5,
        tamperScore: 2.1,
        studentName: "John Smith",
        institution: "Stanford University",
      },
      {
        id: "2",
        filename: "certificate_002.jpg",
        status: "suspicious",
        confidence: 76.3,
        tamperScore: 8.7,
        studentName: "Jane Doe",
        institution: "MIT",
      },
      {
        id: "3",
        filename: "certificate_003.pdf",
        status: "verified",
        confidence: 94.2,
        tamperScore: 1.8,
        studentName: "Bob Johnson",
        institution: "Harvard",
      },
      {
        id: "4",
        filename: "certificate_004.png",
        status: "failed",
        confidence: 45.1,
        tamperScore: 15.3,
        error: "Unable to extract text from image",
      },
      {
        id: "5",
        filename: "certificate_005.pdf",
        status: "verified",
        confidence: 99.1,
        tamperScore: 0.9,
        studentName: "Alice Brown",
        institution: "UC Berkeley",
      },
    ]

    return NextResponse.json({
      batch_id: batchId,
      results: mockResults,
      summary: {
        total: mockResults.length,
        verified: mockResults.filter((r) => r.status === "verified").length,
        suspicious: mockResults.filter((r) => r.status === "suspicious").length,
        failed: mockResults.filter((r) => r.status === "failed").length,
      },
    })
  } catch (error) {
    console.error("Batch results error:", error)
    return NextResponse.json({ error: "Failed to get batch results" }, { status: 500 })
  }
}
