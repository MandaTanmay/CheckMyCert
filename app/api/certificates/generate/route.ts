import { type NextRequest, NextResponse } from "next/server"
import { jsPDF } from "jspdf"
import QRCode from "qrcode"
import { proxyToDjango } from "@/lib/proxy"

interface CertificateData {
  studentName: string
  course: string
  institution: string
  graduationDate: string
  grade: string
  certificateNumber: string
  issuedBy: string
  additionalNotes: string
  verificationToken: string
  createdBy: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const certificateData: CertificateData = await request.json()

    // Generate invisible QR code
    const qrData = {
      token: certificateData.verificationToken,
      system: "CheckMyCert",
      timestamp: certificateData.timestamp,
      certNumber: certificateData.certificateNumber,
      checksum: generateChecksum(certificateData)
    }

    // Create QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 100,
      margin: 0,
      color: {
        dark: '#FFFFFF01', // Almost transparent (invisible)
        light: '#FFFFFF00' // Completely transparent
      }
    })

    // Create PDF certificate
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    // Set up the certificate design
    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 0, 297, 210, 'F')

    // Add border
    pdf.setDrawColor(0, 100, 200)
    pdf.setLineWidth(2)
    pdf.rect(10, 10, 277, 190)

    // Add inner border
    pdf.setLineWidth(0.5)
    pdf.rect(15, 15, 267, 180)

    // Title
    pdf.setFontSize(32)
    pdf.setTextColor(0, 50, 100)
    pdf.text('CERTIFICATE OF COMPLETION', 148.5, 50, { align: 'center' })

    // Subtitle
    pdf.setFontSize(16)
    pdf.setTextColor(100, 100, 100)
    pdf.text('This is to certify that', 148.5, 70, { align: 'center' })

    // Student name
    pdf.setFontSize(28)
    pdf.setTextColor(0, 0, 0)
    pdf.text(certificateData.studentName, 148.5, 90, { align: 'center' })

    // Course details
    pdf.setFontSize(16)
    pdf.setTextColor(50, 50, 50)
    pdf.text(`has successfully completed the course`, 148.5, 110, { align: 'center' })
    
    pdf.setFontSize(20)
    pdf.setTextColor(0, 50, 100)
    pdf.text(certificateData.course, 148.5, 125, { align: 'center' })

    // Institution
    pdf.setFontSize(16)
    pdf.setTextColor(50, 50, 50)
    pdf.text(`at ${certificateData.institution}`, 148.5, 140, { align: 'center' })

    // Date and grade
    pdf.setFontSize(12)
    pdf.text(`Date of Graduation: ${new Date(certificateData.graduationDate).toLocaleDateString()}`, 50, 165)
    if (certificateData.grade) {
      pdf.text(`Grade: ${certificateData.grade}`, 50, 175)
    }

    // Certificate number
    pdf.text(`Certificate No: ${certificateData.certificateNumber}`, 200, 165)
    
    // Issued by
    pdf.text(`Issued by: ${certificateData.issuedBy}`, 200, 175)

    // Add invisible QR code (bottom right corner)
    try {
      // Convert QR code data URL to image and add to PDF
      const qrImage = qrCodeDataUrl.split(',')[1] // Remove data URL prefix
      pdf.addImage(qrCodeDataUrl, 'PNG', 250, 170, 30, 30, undefined, 'NONE')
    } catch (qrError) {
      console.error('QR code embedding error:', qrError)
    }

    // Add security watermark text (very light)
    pdf.setFontSize(8)
    pdf.setTextColor(240, 240, 240)
    pdf.text(`Verified by CheckMyCert System | Token: ${certificateData.verificationToken}`, 20, 195)

    // Generate PDF as buffer
    const pdfBuffer = pdf.output('arraybuffer')

    // Persist generated certificate artifact in Django so no token state is kept in Next.js memory.
    const uploadFormData = new FormData()
    const fileName = `${certificateData.certificateNumber || certificateData.verificationToken}.pdf`
    const pdfFile = new File([pdfBuffer], fileName, { type: "application/pdf" })
    uploadFormData.append("file", pdfFile)
    uploadFormData.append("ocr_language", "eng")
    uploadFormData.append("translate_enabled", "false")

    const persistResponse = await proxyToDjango(request, {
      djangoPath: "/api/certificates/upload/",
      method: "POST",
      body: uploadFormData,
      requireAuth: true,
    })

    if (!persistResponse.ok) {
      return persistResponse
    }

    const persistPayload = await persistResponse.json()

    // Return PDF as downloadable file
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
    const downloadUrl = `data:application/pdf;base64,${pdfBase64}`

    return NextResponse.json({
      success: true,
      downloadUrl,
      verificationToken: certificateData.verificationToken,
      checksum: qrData.checksum,
      job_id: persistPayload?.job_id,
      message: "Certificate generated successfully with invisible QR code"
    })

  } catch (error) {
    console.error("Certificate generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    )
  }
}

function generateChecksum(data: CertificateData): string {
  // Simple checksum for validation
  const str = `${data.studentName}${data.course}${data.institution}${data.certificateNumber}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}