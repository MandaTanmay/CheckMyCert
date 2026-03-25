"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, QrCode, Shield, Loader2 } from "lucide-react"
import RoleBasedNavigation from "@/components/role-based-nav"
import { useUser } from "@/components/role-guard"

interface CertificateData {
  studentName: string
  course: string
  institution: string
  graduationDate: string
  grade: string
  certificateNumber: string
  issuedBy: string
  additionalNotes: string
}

export default function GeneratePage() {
  const { user } = useUser()
  const [certificateData, setCertificateData] = useState<CertificateData>({
    studentName: "",
    course: "",
    institution: "",
    graduationDate: "",
    grade: "",
    certificateNumber: "",
    issuedBy: "",
    additionalNotes: "",
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [verificationToken, setVerificationToken] = useState<string | null>(null)

  const handleInputChange = (field: keyof CertificateData, value: string) => {
    setCertificateData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateCertificate = async () => {
    setIsGenerating(true)
    
    try {
      // Generate unique verification token
      const token = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const response = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...certificateData,
          verificationToken: token,
          createdBy: user?.id,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate certificate")
      }

      const result = await response.json()
      setGeneratedUrl(result.downloadUrl)
      setVerificationToken(token)
    } catch (error) {
      console.error("Generation error:", error)
      alert("Failed to generate certificate. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadCertificate = () => {
    if (generatedUrl) {
      const link = document.createElement("a")
      link.href = generatedUrl
      link.download = `certificate_${certificateData.certificateNumber}.pdf`
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Generate Certificate</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create secure certificates with invisible QR codes for verification through our system
          </p>
        </div>

        {!generatedUrl ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Certificate Information
              </CardTitle>
              <CardDescription>
                Fill in the details for the certificate. An invisible QR code will be embedded for verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentName">Student Name *</Label>
                  <Input
                    id="studentName"
                    value={certificateData.studentName}
                    onChange={(e) => handleInputChange("studentName", e.target.value)}
                    placeholder="Full name of the student"
                  />
                </div>
                <div>
                  <Label htmlFor="course">Course/Degree *</Label>
                  <Input
                    id="course"
                    value={certificateData.course}
                    onChange={(e) => handleInputChange("course", e.target.value)}
                    placeholder="e.g., Bachelor of Science in Computer Science"
                  />
                </div>
                <div>
                  <Label htmlFor="institution">Institution *</Label>
                  <Input
                    id="institution"
                    value={certificateData.institution}
                    onChange={(e) => handleInputChange("institution", e.target.value)}
                    placeholder="Name of the educational institution"
                  />
                </div>
                <div>
                  <Label htmlFor="graduationDate">Graduation Date *</Label>
                  <Input
                    id="graduationDate"
                    type="date"
                    value={certificateData.graduationDate}
                    onChange={(e) => handleInputChange("graduationDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Grade/GPA</Label>
                  <Input
                    id="grade"
                    value={certificateData.grade}
                    onChange={(e) => handleInputChange("grade", e.target.value)}
                    placeholder="e.g., 3.85 GPA, First Class"
                  />
                </div>
                <div>
                  <Label htmlFor="certificateNumber">Certificate Number *</Label>
                  <Input
                    id="certificateNumber"
                    value={certificateData.certificateNumber}
                    onChange={(e) => handleInputChange("certificateNumber", e.target.value)}
                    placeholder="Unique certificate identifier"
                  />
                </div>
                <div>
                  <Label htmlFor="issuedBy">Issued By *</Label>
                  <Input
                    id="issuedBy"
                    value={certificateData.issuedBy}
                    onChange={(e) => handleInputChange("issuedBy", e.target.value)}
                    placeholder="Name of the issuing authority"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  value={certificateData.additionalNotes}
                  onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                  placeholder="Any additional information or achievements"
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={generateCertificate}
                  disabled={isGenerating || !certificateData.studentName || !certificateData.course}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Certificate...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate Certificate with QR
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Shield className="h-5 w-5" />
                Certificate Generated Successfully
              </CardTitle>
              <CardDescription>
                Your certificate has been created with an embedded invisible QR code for verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Certificate Details:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>Student:</strong> {certificateData.studentName}</div>
                  <div><strong>Course:</strong> {certificateData.course}</div>
                  <div><strong>Institution:</strong> {certificateData.institution}</div>
                  <div><strong>Certificate #:</strong> {certificateData.certificateNumber}</div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold mb-2 text-blue-800">Verification Information:</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Verification Token:</strong> 
                    <Badge variant="secondary" className="ml-2">{verificationToken}</Badge>
                  </div>
                  <div className="text-blue-600">
                    ✓ Invisible QR code embedded for secure verification
                  </div>
                  <div className="text-blue-600">
                    ✓ Only verifiable through this CheckMyCert system
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={downloadCertificate} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Certificate
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setGeneratedUrl(null)
                    setVerificationToken(null)
                    setCertificateData({
                      studentName: "",
                      course: "",
                      institution: "",
                      graduationDate: "",
                      grade: "",
                      certificateNumber: "",
                      issuedBy: "",
                      additionalNotes: "",
                    })
                  }}
                >
                  Generate Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}