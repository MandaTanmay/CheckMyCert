"use client"

import { Shield, Upload, CheckCircle, Users, FileText, Zap, Globe, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation variant="landing" />

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-8">
            <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-5xl font-bold text-foreground mb-6 text-balance">CheckMyCert</h1>
            <p className="text-2xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
              Verify Certificates with Trust
            </p>
            <p className="text-lg text-muted-foreground mb-8 text-pretty max-w-3xl mx-auto">
              Advanced AI-powered certificate verification with OCR, tamper detection, and digital signature validation.
              Trusted by universities, employers, and institutions worldwide for secure document authentication.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-6">
              <Link href="/upload">
                <Zap className="mr-2 h-5 w-5" />
                Upload
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 bg-transparent">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose CheckMyCert?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with robust security measures to provide the most
              reliable certificate verification solution.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-border/50 hover:border-primary/20 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>OCR + Tamper Detection</CardTitle>
                <CardDescription>
                  Advanced OCR technology combined with AI-powered tamper detection to identify document forgeries and
                  alterations with high accuracy.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-colors">
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Digital Signature Validation</CardTitle>
                <CardDescription>
                  Validate cryptographic signatures and certificate chains for digitally-issued documents with
                  blockchain verification.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-colors">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-Time QR</CardTitle>
                <CardDescription>
                  Generate secure QR codes for instant public verification without exposing sensitive information or
                  requiring accounts.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-colors">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Bulk Verification</CardTitle>
                <CardDescription>
                  Process hundreds of certificates simultaneously with detailed reporting and analytics for HR
                  departments and institutions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-colors">
              <CardHeader>
                <Globe className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Multi-language OCR</CardTitle>
                <CardDescription>
                  Extract and verify text from certificates in multiple languages with automatic translation
                  capabilities and regional format support.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-colors">
              <CardHeader>
                <Wallet className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Secure Certificate Wallet</CardTitle>
                <CardDescription>
                  Store and manage verified certificates securely with encrypted cloud storage and easy sharing
                  capabilities.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, secure, and reliable certificate verification in three easy steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">1. Upload Certificate</h3>
              <p className="text-muted-foreground">
                Drag and drop your certificate or select from your device. Supports PDF, JPG, PNG formats.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">2. AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI analyzes the document for tampering, extracts key information, and validates signatures.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">3. Get Results</h3>
              <p className="text-muted-foreground">
                Receive detailed verification results with confidence scores and tamper detection reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Verify Your Certificates?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of institutions and professionals who trust CheckMyCert for secure certificate verification.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-6">
              <Link href="/register">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 bg-transparent">
              <Link href="/qr-verify">Try QR Scan</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">CheckMyCert</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Secure certificate verification platform powered by AI and trusted by institutions worldwide.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/features" className="hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-foreground transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/qr-verify" className="hover:text-foreground transition-colors">
                    QR Verification
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Social</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    LinkedIn
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-foreground transition-colors">
                    Security
                  </Link>
                </li>
                <li>
                  <Link href="/compliance" className="hover:text-foreground transition-colors">
                    Compliance
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 CheckMyCert. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
