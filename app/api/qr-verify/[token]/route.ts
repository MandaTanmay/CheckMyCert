import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params

    // Mock QR verification based on token
    if (token.includes("invalid")) {
      return NextResponse.json({ error: "Invalid QR token" }, { status: 404 })
    }

    if (token.includes("expired")) {
      return NextResponse.json({ error: "QR token has expired" }, { status: 410 })
    }

    // Mock successful verification
    const mockVerification = {
      status: "valid",
      certificate_data: {
        student_name: "John Michael Smith",
        degree: "Bachelor of Science in Computer Science",
        institution: "Stanford University",
        graduation_date: "June 15, 2023",
      },
      public_info: {
        institution_verified: true,
        digital_signature: true,
        tamper_detected: false,
      },
      verification_date: new Date().toISOString(),
      qr_token: token,
    }

    return NextResponse.json(mockVerification)
  } catch (error) {
    console.error("QR verification error:", error)
    return NextResponse.json({ error: "Failed to verify QR token" }, { status: 500 })
  }
}
