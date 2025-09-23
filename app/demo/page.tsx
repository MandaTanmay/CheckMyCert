"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function DemoPage() {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const demoScenarios = [
    {
      id: "valid-cert",
      title: "Valid Certificate",
      description: "Demonstrates successful verification of an authentic certificate",
      result: { status: "verified", confidence: 98.5, tamperScore: 1.2 },
    },
    {
      id: "tampered-cert",
      title: "Tampered Certificate",
      description: "Shows detection of a certificate with altered information",
      result: { status: "suspicious", confidence: 67.3, tamperScore: 8.9 },
    },
    {
      id: "fake-cert",
      title: "Fake Certificate",
      description: "Identifies a completely fabricated certificate",
      result: { status: "failed", confidence: 23.1, tamperScore: 15.7 },
    },
  ]

  const runDemo = (demoId: string) => {
    setSelectedDemo(demoId)
    setIsProcessing(true)
    setProgress(0)

    // Simulate processing
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsProcessing(false)
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  const selectedScenario = demoScenarios.find((s) => s.id === selectedDemo)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Demo Mode</h1>
          <p className="text-muted-foreground">
            Experience CheckMyCert's verification capabilities with sample certificates
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demo Scenarios</CardTitle>
                <CardDescription>
                  Select a scenario to see how CheckMyCert handles different certificate types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {demoScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDemo === scenario.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => runDemo(scenario.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{scenario.title}</h3>
                        <p className="text-sm text-muted-foreground">{scenario.description}</p>
                      </div>
                      <Button variant="outline" size="sm" disabled={isProcessing}>
                        {isProcessing && selectedDemo === scenario.id ? "Processing..." : "Run Demo"}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demo Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-success rounded-full" />
                    <span className="text-sm text-foreground">OCR text extraction simulation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-success rounded-full" />
                    <span className="text-sm text-foreground">Tamper detection analysis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-success rounded-full" />
                    <span className="text-sm text-foreground">Database verification matching</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-success rounded-full" />
                    <span className="text-sm text-foreground">Confidence scoring</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {selectedDemo && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {isProcessing ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Analyzing certificate...</span>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                      <div className="text-sm text-muted-foreground">
                        {progress < 30 && "Extracting text with OCR..."}
                        {progress >= 30 && progress < 60 && "Analyzing for tampering..."}
                        {progress >= 60 && progress < 90 && "Checking database records..."}
                        {progress >= 90 && "Generating final report..."}
                      </div>
                    </div>
                  ) : (
                    selectedScenario && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-foreground">Verification Complete</h3>
                          <Badge
                            variant={
                              selectedScenario.result.status === "verified"
                                ? "default"
                                : selectedScenario.result.status === "suspicious"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {selectedScenario.result.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">Confidence Score</p>
                            <p className="text-2xl font-bold text-foreground">{selectedScenario.result.confidence}%</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Tamper Score</p>
                            <p className="text-2xl font-bold text-foreground">{selectedScenario.result.tamperScore}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {selectedScenario.result.status === "verified" &&
                              "Certificate appears authentic with high confidence. All verification checks passed."}
                            {selectedScenario.result.status === "suspicious" &&
                              "Certificate shows signs of potential tampering. Manual review recommended."}
                            {selectedScenario.result.status === "failed" &&
                              "Certificate failed verification. High probability of forgery detected."}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Ready to Get Started?</CardTitle>
                <CardDescription>Create an account to verify your own certificates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button className="w-full">Sign Up Free</Button>
                  <Button variant="outline" className="w-full bg-transparent">
                    Contact Sales
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Free tier includes 10 verifications per month
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
