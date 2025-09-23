"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Shield,
  Eye,
  Download,
  Search,
  Filter,
  Calendar,
  FileText,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

interface TamperReport {
  id: string
  certificateId: string
  studentName: string
  institution: string
  detectionDate: string
  severity: "low" | "medium" | "high" | "critical"
  tamperTypes: string[]
  confidenceScore: number
  status: "under-review" | "confirmed" | "false-positive" | "resolved"
  description: string
}

interface TamperStatistics {
  totalReports: number
  criticalIssues: number
  resolvedCases: number
  falsePositives: number
  detectionAccuracy: number
  monthlyTrend: number
}

export default function TamperReportPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedReport, setSelectedReport] = useState<TamperReport | null>(null)

  const statistics: TamperStatistics = {
    totalReports: 1247,
    criticalIssues: 23,
    resolvedCases: 1156,
    falsePositives: 68,
    detectionAccuracy: 94.5,
    monthlyTrend: 12.3,
  }

  const tamperReports: TamperReport[] = [
    {
      id: "TR-2024-001",
      certificateId: "CERT-789123",
      studentName: "Sarah Johnson",
      institution: "MIT",
      detectionDate: "2024-01-15T10:30:00Z",
      severity: "critical",
      tamperTypes: ["Digital Signature Forgery", "Text Alteration", "Seal Manipulation"],
      confidenceScore: 97.8,
      status: "confirmed",
      description:
        "Multiple sophisticated tampering attempts detected including forged digital signatures and altered graduation date.",
    },
    {
      id: "TR-2024-002",
      certificateId: "CERT-456789",
      studentName: "Michael Chen",
      institution: "Stanford University",
      detectionDate: "2024-01-14T15:45:00Z",
      severity: "high",
      tamperTypes: ["Font Inconsistency", "Layout Anomaly"],
      confidenceScore: 89.2,
      status: "under-review",
      description: "Font variations and layout inconsistencies suggest potential grade modification.",
    },
    {
      id: "TR-2024-003",
      certificateId: "CERT-321654",
      studentName: "Emily Rodriguez",
      institution: "Harvard University",
      detectionDate: "2024-01-13T09:15:00Z",
      severity: "medium",
      tamperTypes: ["Color Variation", "Resolution Mismatch"],
      confidenceScore: 76.5,
      status: "false-positive",
      description: "Color and resolution variations likely due to scanning quality rather than tampering.",
    },
    {
      id: "TR-2024-004",
      certificateId: "CERT-987321",
      studentName: "David Kim",
      institution: "UC Berkeley",
      detectionDate: "2024-01-12T14:20:00Z",
      severity: "low",
      tamperTypes: ["Minor Text Blur"],
      confidenceScore: 68.3,
      status: "resolved",
      description: "Minor text blurring detected, determined to be from document age and handling.",
    },
    {
      id: "TR-2024-005",
      certificateId: "CERT-654987",
      studentName: "Lisa Wang",
      institution: "Caltech",
      detectionDate: "2024-01-11T11:30:00Z",
      severity: "high",
      tamperTypes: ["Metadata Manipulation", "Timestamp Alteration"],
      confidenceScore: 92.1,
      status: "confirmed",
      description: "Document metadata shows signs of manipulation with altered creation timestamps.",
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive text-destructive-foreground"
      case "high":
        return "bg-orange-500 text-white"
      case "medium":
        return "bg-warning text-warning-foreground"
      case "low":
        return "bg-blue-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-destructive text-destructive-foreground"
      case "under-review":
        return "bg-warning text-warning-foreground"
      case "false-positive":
        return "bg-blue-500 text-white"
      case "resolved":
        return "bg-success text-success-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const filteredReports = tamperReports.filter((report) => {
    const matchesSearch =
      report.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.certificateId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = severityFilter === "all" || report.severity === severityFilter
    const matchesStatus = statusFilter === "all" || report.status === statusFilter

    return matchesSearch && matchesSeverity && matchesStatus
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">CheckMyCert</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              Admin Panel
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Button variant="outline" size="sm">
              Sign Out
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-8 w-8 text-warning" />
            <h1 className="text-3xl font-bold text-foreground">Tampering Detection Reports</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and analyze certificate tampering attempts detected by our AI system
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                      <p className="text-2xl font-bold text-foreground">{statistics.totalReports.toLocaleString()}</p>
                    </div>
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                      <p className="text-2xl font-bold text-destructive">{statistics.criticalIssues}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Resolved Cases</p>
                      <p className="text-2xl font-bold text-success">{statistics.resolvedCases.toLocaleString()}</p>
                    </div>
                    <Shield className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Detection Accuracy</p>
                      <p className="text-2xl font-bold text-primary">{statistics.detectionAccuracy}%</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Monthly Trend</p>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-success">+{statistics.monthlyTrend}%</p>
                        <TrendingUp className="h-4 w-4 text-success" />
                      </div>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Critical Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Critical Reports</CardTitle>
                <CardDescription>High-priority tampering attempts requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tamperReports
                    .filter((r) => r.severity === "critical" || r.severity === "high")
                    .slice(0, 3)
                    .map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <AlertTriangle
                            className={`h-6 w-6 ${report.severity === "critical" ? "text-destructive" : "text-orange-500"}`}
                          />
                          <div>
                            <p className="font-medium text-foreground">
                              {report.studentName} - {report.institution}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {report.tamperTypes.join(", ")} • Confidence: {report.confidenceScore}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getSeverityColor(report.severity)}>{report.severity.toUpperCase()}</Badge>
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <Eye className="mr-2 h-4 w-4" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, institution, or certificate ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="under-review">Under Review</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="false-positive">False Positive</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="bg-transparent">
                    <Filter className="mr-2 h-4 w-4" />
                    More Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reports Table */}
            <Card>
              <CardHeader>
                <CardTitle>Tampering Reports ({filteredReports.length})</CardTitle>
                <CardDescription>Detailed list of all tampering detection reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-4">
                          <AlertTriangle
                            className={`h-5 w-5 mt-1 ${
                              report.severity === "critical"
                                ? "text-destructive"
                                : report.severity === "high"
                                  ? "text-orange-500"
                                  : report.severity === "medium"
                                    ? "text-warning"
                                    : "text-blue-500"
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium text-foreground">{report.studentName}</h3>
                              <Badge className={getSeverityColor(report.severity)} variant="secondary">
                                {report.severity}
                              </Badge>
                              <Badge className={getStatusColor(report.status)} variant="secondary">
                                {report.status.replace("-", " ")}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {report.institution} • Certificate: {report.certificateId}
                            </p>
                            <p className="text-sm text-foreground mb-2">{report.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Detected: {new Date(report.detectionDate).toLocaleDateString()}</span>
                              <span>Confidence: {report.confidenceScore}%</span>
                              <span>Types: {report.tamperTypes.join(", ")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </Button>
                        </div>
                      </div>
                      <div className="ml-9">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">Confidence Score:</span>
                          <Progress value={report.confidenceScore} className="h-2 flex-1 max-w-[200px]" />
                          <span className="text-xs font-medium">{report.confidenceScore}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detection Trends</CardTitle>
                  <CardDescription>Monthly tampering detection statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Chart visualization would appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Severity Distribution</CardTitle>
                  <CardDescription>Breakdown of tampering severity levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-destructive rounded-full"></div>
                        <span className="text-sm">Critical</span>
                      </div>
                      <span className="text-sm font-medium">23 (1.8%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm">High</span>
                      </div>
                      <span className="text-sm font-medium">89 (7.1%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-warning rounded-full"></div>
                        <span className="text-sm">Medium</span>
                      </div>
                      <span className="text-sm font-medium">234 (18.8%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Low</span>
                      </div>
                      <span className="text-sm font-medium">901 (72.3%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detection Settings</CardTitle>
                <CardDescription>Configure tampering detection sensitivity and thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Detection Sensitivity</label>
                  <Select defaultValue="high">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Fewer false positives</SelectItem>
                      <SelectItem value="medium">Medium - Balanced detection</SelectItem>
                      <SelectItem value="high">High - Maximum security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Confidence Threshold</label>
                  <div className="flex items-center gap-4">
                    <Progress value={75} className="flex-1" />
                    <span className="text-sm font-medium">75%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reports below this confidence level will be marked for manual review
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button>Save Settings</Button>
                  <Button variant="outline" className="bg-transparent">
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
