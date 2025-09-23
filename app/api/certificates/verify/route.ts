import { type NextRequest, NextResponse } from "next/server"
import { CertificateDB } from "@/lib/certificate-db"

export async function POST(request: NextRequest) {
  try {
    const { verificationToken, qrData, checksum } = await request.json()

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      )
    }

    // Verify certificate in database
    const verificationResult = CertificateDB.verifyCertificate(verificationToken)

    if (!verificationResult.isValid) {
      return NextResponse.json({
        verified: false,
        error: verificationResult.error,
        status: "INVALID"
      })
    }

    const certificate = verificationResult.certificate!

    // Validate checksum if provided
    if (checksum && !CertificateDB.validateChecksum(certificate, checksum)) {
      return NextResponse.json({
        verified: false,
        error: "Certificate data has been tampered with",
        status: "TAMPERED"
      })
    }

    // Certificate is valid
    return NextResponse.json({
      verified: true,
      status: "AUTHENTIC",
      certificate: {
        studentName: certificate.studentName,
        course: certificate.course,
        institution: certificate.institution,
        graduationDate: certificate.graduationDate,
        grade: certificate.grade,
        certificateNumber: certificate.certificateNumber,
        issuedBy: certificate.issuedBy,
        createdAt: certificate.createdAt,
        verificationToken: certificate.verificationToken
      },
      verificationDetails: {
        isCheckMyCertDocument: true,
        verifiedAt: new Date().toISOString(),
        documentAge: Math.floor((Date.now() - new Date(certificate.createdAt).getTime()) / (1000 * 60 * 60 * 24)), // days
        integrityCheck: "PASSED",
        systemVerification: "AUTHENTIC"
      }
    })

  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      )
    }

    // Simple verification endpoint
    const verificationResult = CertificateDB.verifyCertificate(token)

    return NextResponse.json({
      verified: verificationResult.isValid,
      certificate: verificationResult.certificate,
      error: verificationResult.error
    })

  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 }
    )
  }
}