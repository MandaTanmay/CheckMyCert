"use client"

import { useState, useEffect } from "react"
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Download,
  Eye,
  MoreHorizontal,
  Plus,
  Users,
  Building,
  Settings,
  BarChart3,
  FileStack,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import RoleBasedNavigation from "@/components/role-based-nav"
import RoleGuard, { useUser, RoleContent, MultiRoleContent } from "@/components/role-guard"
import { type UserRole } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface DashboardStats {
  totalCertificates: number
  validCertificates: number
  tamperedCertificates: number
  pendingVerifications: number
  successRate: number
}

interface AdminStats extends DashboardStats {
  totalUsers: number
  totalInstitutions: number
  systemHealth: number
  dailyVerifications: number
}

interface RecentVerification {
  id: string
  filename: string
  status: "valid" | "tampered" | "unverified" | "processing"
  confidence: number
  uploadedAt: string
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser()

  const [stats, setStats] = useState<DashboardStats>({
    totalCertificates: 0,
    validCertificates: 0,
    tamperedCertificates: 0,
    pendingVerifications: 0,
    successRate: 0,
  })

  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalCertificates: 0,
    validCertificates: 0,
    tamperedCertificates: 0,
    pendingVerifications: 0,
    successRate: 0,
    totalUsers: 0,
    totalInstitutions: 0,
    systemHealth: 0,
    dailyVerifications: 0,
  })

  const [recentVerifications, setRecentVerifications] = useState<RecentVerification[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      // Load data asynchronously without blocking the UI
      fetchDashboardData()
    }
  }, [user?.id, user?.role])

  const fetchDashboardData = async () => {
    try {
      // Load mock data immediately (no artificial delays)
      loadMockData()
      setDataLoading(false)
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      loadMockData()
      setDataLoading(false)
    }
  }

  const loadMockData = () => {
    if (user?.role === "admin") {
      setAdminStats({
        totalCertificates: 2847,
        validCertificates: 2542,
        tamperedCertificates: 203,
        pendingVerifications: 102,
        successRate: 89.3,
        totalUsers: 1234,
        totalInstitutions: 89,
        systemHealth: 98.5,
        dailyVerifications: 456,
      })
    } else {
      setStats({
        totalCertificates: 47,
        validCertificates: 42,
        tamperedCertificates: 3,
        pendingVerifications: 2,
        successRate: 89.4,
      })
    }
    setRecentVerifications(getMockVerifications())
  }

  const getMockVerifications = (): RecentVerification[] => [
    {
      id: "1",
      filename: "stanford_diploma.pdf",
      status: "valid",
      confidence: 94.5,
      uploadedAt: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      filename: "mit_certificate.jpg",
      status: "processing",
      confidence: 0,
      uploadedAt: "2024-01-15T09:15:00Z",
    },
    {
      id: "3",
      filename: "harvard_degree.pdf",
      status: "tampered",
      confidence: 23.1,
      uploadedAt: "2024-01-14T16:45:00Z",
    },
    {
      id: "4",
      filename: "berkeley_transcript.pdf",
      status: "valid",
      confidence: 97.8,
      uploadedAt: "2024-01-14T14:20:00Z",
    },
    {
      id: "5",
      filename: "caltech_diploma.jpg",
      status: "unverified",
      confidence: 67.2,
      uploadedAt: "2024-01-13T11:10:00Z",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-success" />
      case "tampered":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "unverified":
        return <AlertTriangle className="h-4 w-4 text-warning" />
      case "processing":
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      valid: "bg-success text-success-foreground",
      tampered: "bg-destructive text-destructive-foreground",
      unverified: "bg-warning text-warning-foreground",
      processing: "bg-primary text-primary-foreground",
    }

    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-muted text-muted-foreground"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderStatsCards = () => {
    if (dataLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Admin-specific stats */}
        <RoleContent role="admin">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Institutions</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats.totalInstitutions}</div>
              <p className="text-xs text-muted-foreground">+3 new this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Verifications</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats.dailyVerifications}</div>
              <p className="text-xs text-muted-foreground">+18% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{adminStats.systemHealth}%</div>
              <Progress value={adminStats.systemHealth} className="mt-2" />
            </CardContent>
          </Card>
        </RoleContent>

        {/* User and HR stats */}
        <MultiRoleContent roles={["user", "hr"]}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCertificates}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valid Certificates</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.validCertificates}</div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tampered Detected</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.tamperedCertificates}</div>
              <p className="text-xs text-muted-foreground">-2% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <Progress value={stats.successRate} className="mt-2" />
            </CardContent>
          </Card>
        </MultiRoleContent>
      </div>
    )
  }

  const renderQuickActions = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            <RoleContent role="admin">System management and oversight</RoleContent>
            <MultiRoleContent roles={["user", "hr"]}>Common tasks and shortcuts</MultiRoleContent>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Admin actions */}
          <RoleContent role="admin">
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/admin">
                <Users className="mr-2 h-4 w-4" />
                Admin Panel
              </Link>
            </Button>
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                System Settings
              </Link>
            </Button>
          </RoleContent>

          {/* HR actions */}
          <RoleContent role="hr">
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/bulk-verify">
                <FileStack className="mr-2 h-4 w-4" />
                Bulk Verification
              </Link>
            </Button>
          </RoleContent>

          {/* Common user actions */}
          <MultiRoleContent roles={["user", "hr", "admin"]}>
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Certificate
              </Link>
            </Button>
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/generate">
                <FileText className="mr-2 h-4 w-4" />
                Generate Certificate
              </Link>
            </Button>
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/qr-verify">
                <Eye className="mr-2 h-4 w-4" />
                QR Verification
              </Link>
            </Button>
          </MultiRoleContent>

          {/* User-only actions */}
          <MultiRoleContent roles={["user", "hr"]}>
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/history">
                <Calendar className="mr-2 h-4 w-4" />
                View History
              </Link>
            </Button>
          </MultiRoleContent>
        </CardContent>
      </Card>
    )
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["user", "hr", "admin"]}>
      <div className="min-h-screen bg-background">
        <RoleBasedNavigation />

        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, {user?.firstName || "User"}!</h1>
            <p className="text-muted-foreground">
              <RoleContent role="admin">System overview and administrative controls</RoleContent>
              <RoleContent role="hr">HR dashboard with bulk verification tools</RoleContent>
              <RoleContent role="user">Here's an overview of your certificate verification activity</RoleContent>
            </p>
          </div>

          {renderStatsCards()}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Verifications */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        <RoleContent role="admin">System Activity</RoleContent>
                        <MultiRoleContent roles={["user", "hr"]}>Recent Verifications</MultiRoleContent>
                      </CardTitle>
                      <CardDescription>
                        <RoleContent role="admin">Latest system-wide verification activity</RoleContent>
                        <MultiRoleContent roles={["user", "hr"]}>
                          Your latest certificate verification results
                        </MultiRoleContent>
                      </CardDescription>
                    </div>
                    <Button asChild size="sm">
                      <Link href="/upload">
                        <Plus className="mr-2 h-4 w-4" />
                        New Verification
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dataLoading ? (
                      // Skeleton loading for verifications
                      [...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 border border-border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-2" />
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-3 w-20" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-6 w-6" />
                          </div>
                        </div>
                      ))
                    ) : (
                      recentVerifications.map((verification) => (
                      <div
                        key={verification.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {getStatusIcon(verification.status)}
                          <div>
                            <p className="font-medium text-foreground">{verification.filename}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(verification.status)}
                              {verification.status !== "processing" && (
                                <span className="text-sm text-muted-foreground">
                                  {verification.confidence}% confidence
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{formatDate(verification.uploadedAt)}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Results
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download Report
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Info */}
            <div className="space-y-6">
              {renderQuickActions()}

              {/* Account Status - Hide for admin */}
              <MultiRoleContent roles={["user", "hr"]}>
                <Card>
                  <CardHeader>
                    <CardTitle>Account Status</CardTitle>
                    <CardDescription>Your current plan and usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Monthly Verifications</span>
                          <span>
                            {stats.totalCertificates}/{user?.role === "hr" ? "1000" : "100"}
                          </span>
                        </div>
                        <Progress value={(stats.totalCertificates / (user?.role === "hr" ? 1000 : 100)) * 100} />
                      </div>
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-medium mb-2">{user?.role === "hr" ? "HR Plan" : "Free Plan"}</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          {(user?.role === "hr" ? 1000 : 100) - stats.totalCertificates} verifications remaining this
                          month
                        </p>
                        <Button size="sm" className="w-full">
                          Upgrade Plan
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </MultiRoleContent>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
