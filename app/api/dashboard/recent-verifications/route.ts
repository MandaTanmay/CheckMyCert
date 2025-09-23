import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    // Mock recent verifications data
    const recentVerifications = [
      {
        id: "1",
        filename: "stanford_diploma.pdf",
        status: "valid",
        confidence: 94.5,
        uploadedAt: "2024-01-15T10:30:00Z",
        studentName: "John Smith",
        institution: "Stanford University",
      },
      {
        id: "2",
        filename: "mit_certificate.jpg",
        status: "processing",
        confidence: 0,
        uploadedAt: "2024-01-15T09:15:00Z",
        studentName: "Jane Doe",
        institution: "MIT",
      },
      {
        id: "3",
        filename: "harvard_degree.pdf",
        status: "tampered",
        confidence: 23.1,
        uploadedAt: "2024-01-14T16:45:00Z",
        studentName: "Bob Johnson",
        institution: "Harvard University",
      },
      {
        id: "4",
        filename: "berkeley_transcript.pdf",
        status: "valid",
        confidence: 97.8,
        uploadedAt: "2024-01-14T14:20:00Z",
        studentName: "Alice Brown",
        institution: "UC Berkeley",
      },
      {
        id: "5",
        filename: "caltech_diploma.jpg",
        status: "unverified",
        confidence: 67.2,
        uploadedAt: "2024-01-13T11:10:00Z",
        studentName: "Charlie Wilson",
        institution: "Caltech",
      },
    ]

    return NextResponse.json({ results: recentVerifications })
  } catch (error) {
    console.error("Recent verifications error:", error)
    return NextResponse.json({ error: "Failed to fetch recent verifications" }, { status: 500 })
  }
}
