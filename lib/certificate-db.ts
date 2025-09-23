// Simple in-memory database simulation for generated certificates
// In production, replace with actual database (MongoDB, PostgreSQL, etc.)

interface GeneratedCertificate {
  id: string
  verificationToken: string
  studentName: string
  course: string
  institution: string
  graduationDate: string
  grade: string
  certificateNumber: string
  issuedBy: string
  additionalNotes: string
  createdBy: string
  createdAt: string
  isValid: boolean
  qrData: string
  checksum: string
}

// In-memory storage (replace with real database in production)
const certificateDatabase = new Map<string, GeneratedCertificate>()

export class CertificateDB {
  static storeCertificate(certificate: GeneratedCertificate): void {
    certificateDatabase.set(certificate.verificationToken, certificate)
    console.log(`Certificate stored: ${certificate.verificationToken}`)
  }

  static getCertificate(verificationToken: string): GeneratedCertificate | null {
    return certificateDatabase.get(verificationToken) || null
  }

  static verifyCertificate(verificationToken: string): {
    isValid: boolean
    certificate?: GeneratedCertificate
    error?: string
  } {
    const certificate = certificateDatabase.get(verificationToken)
    
    if (!certificate) {
      return {
        isValid: false,
        error: "Certificate not found in CheckMyCert database"
      }
    }

    if (!certificate.isValid) {
      return {
        isValid: false,
        error: "Certificate has been revoked or is no longer valid"
      }
    }

    return {
      isValid: true,
      certificate
    }
  }

  static getAllCertificates(): GeneratedCertificate[] {
    return Array.from(certificateDatabase.values())
  }

  static revokeCertificate(verificationToken: string): boolean {
    const certificate = certificateDatabase.get(verificationToken)
    if (certificate) {
      certificate.isValid = false
      certificateDatabase.set(verificationToken, certificate)
      return true
    }
    return false
  }

  static validateChecksum(certificate: GeneratedCertificate, expectedChecksum: string): boolean {
    // Recreate checksum and compare
    const str = `${certificate.studentName}${certificate.course}${certificate.institution}${certificate.certificateNumber}`
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    const computedChecksum = Math.abs(hash).toString(36)
    
    return computedChecksum === expectedChecksum
  }
}

export type { GeneratedCertificate }