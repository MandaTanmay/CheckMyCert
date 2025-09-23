"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Building,
  BarChart3,
  Settings,
  Plus,
  Eye,
  MoreHorizontal,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Download,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import Link from "next/link"

interface AdminStats {
  totalUsers: number
  totalInstitutions: number
  dailyVerifications: number
  systemHealth: number
  pendingApprovals: number
  flaggedCertificates: number
}

interface SystemActivity {
  id: string
  type: "user_registration" | "institution_approval" | "verification" | "system" | "security"
  description: string
  timestamp: string
  status: "success" | "warning" | "error" | "info"
  user?: string
}

interface PendingApproval {
  id: string
  type: "institution" | "user" | "certificate"
  name: string
  email?: string
  institution?: string
  submittedAt: string
  status: "pending" | "reviewing"
}

export default function AdminPage() {
  const [user] = useState({
    id: "admin-1",
    name: "Admin User",
    email: "admin@checkmycert.com",
    role: "admin" as const,
  })

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalInstitutions: 0,
    dailyVerifications: 0,
    systemHealth: 0,
    pendingApprovals: 0,
    flaggedCertificates: 0,
  })

  const [activities, setActivities] = useState<SystemActivity[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call to fetch admin data
    setTimeout(() => {
      setStats({
        totalUsers: 1234,
        totalInstitutions: 89,
        dailyVerifications: 456,
        systemHealth: 98.5,
        pendingApprovals: 7,
        flaggedCertificates: 12,
      })

      setActivities([
        {
          id: "1",
          type: "institution_approval",
          description: "New institution 'MIT' registered and approved",
          timestamp: "2024-01-15T10:30:00Z",
          status: "success",
          user: "admin@checkmycert.com",
        },
        {
          id: "2",
          type: "verification",
          description: "Bulk verification completed for 150 certificates",
          timestamp: "2024-01-15T09:15:00Z",
          status: "info",
        },
        {
          id: "3",
          type: "security",
          description: "Suspicious verification pattern detected",
          timestamp: "2024-01-15T08:45:00Z",
          status: "warning",
        },
        {
          id: "4",
          type: "system",
          description: "System maintenance completed successfully",
          timestamp: "2024-01-15T07:00:00Z",
          status: "success",
        },
        {
          id: "5",
          type: "user_registration",
          description: "User account suspended for policy violation",
          timestamp: "2024-01-14T16:20:00Z",
          status: "error",
          user: "john.doe@example.com",
        },
      ])

      setPendingApprovals([
        {
          id: "1",
          type: "institution",
          name: "Harvard University",
          email: "admin@harvard.edu",
          submittedAt: "2024-01-14T14:30:00Z",
          status: "pending",
        },
        {
          id: "2",
          type: "institution",
          name: "Oxford University",
          email: "registrar@ox.ac.uk",
          submittedAt: "2024-01-14T12:15:00Z",
          status: "reviewing",
        },
        {
          id: "3",
          type: "user",
          name: "Jane Smith",
          email: "jane.smith@example.com",
          institution: "Stanford University",
          submittedAt: "2024-01-14T10:45:00Z",
          status: "pending",
        },
      ])

      setLoading(false)
    }, 1000)
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_registration":
        return <Users className="h-4 w-4" />
      case "institution_approval":
        return <Building className="h-4 w-4" />
      case "verification":
        return <UserCheck className="h-4 w-4" />
      case "system":
        return <Settings className="h-4 w-4" />
      case "security":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-success"
      case "warning":
        return "text-warning"
      case "error":
        return "text-destructive"
      case "info":
        return "text-primary"
      default:
        return "text-muted-foreground"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">System overview and administrative controls</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Institutions</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInstitutions}</div>
              <p className="text-xs text-muted-foreground">+3 new this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Verifications</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dailyVerifications}</div>
              <p className="text-xs text-muted-foreground">+18% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.systemHealth}%</div>
              <Progress value={stats.systemHealth} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals
              {stats.pendingApprovals > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {stats.pendingApprovals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>System Activity</CardTitle>
                  <CardDescription>Recent system events and operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className={`mt-1 ${getStatusColor(activity.status)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
                            {activity.user && (
                              <Badge variant="outline" className="text-xs">
                                {activity.user}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                  <CardDescription>Important notifications requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <div>
                          <p className="text-sm font-medium">Pending Approvals</p>
                          <p className="text-xs text-muted-foreground">{stats.pendingApprovals} items need review</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <div>
                          <p className="text-sm font-medium">Flagged Certificates</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.flaggedCertificates} certificates flagged
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Investigate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pending Approvals</CardTitle>
                    <CardDescription>Review and approve pending requests</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Search approvals..." className="w-64" />
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          {approval.type === "institution" ? (
                            <Building className="h-5 w-5 text-primary" />
                          ) : (
                            <Users className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{approval.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="capitalize">
                              {approval.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{approval.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{formatDate(approval.submittedAt)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success border-success hover:bg-success hover:text-success-foreground bg-transparent"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Activity Log</CardTitle>
                    <CardDescription>Detailed system events and user actions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Log
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 ${getStatusColor(activity.status)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="capitalize text-xs">
                              {activity.type.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</span>
                            {activity.user && <span className="text-xs text-muted-foreground">by {activity.user}</span>}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Export Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/admin/users/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add User
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Institution Management</CardTitle>
                  <CardDescription>Manage educational institutions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/admin/institutions">
                      <Building className="mr-2 h-4 w-4" />
                      Manage Institutions
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/admin/institutions/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Institution
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Operations</CardTitle>
                  <CardDescription>System settings and maintenance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/admin/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/admin/reports">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Generate Reports
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
