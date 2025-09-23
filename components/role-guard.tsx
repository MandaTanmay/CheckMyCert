"use client"

import type { ReactNode } from "react"
import { Shield, Lock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useAuth, type UserRole } from "@/contexts/auth-context"

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Array<UserRole>
  fallback?: ReactNode
  requireAuth?: boolean
}

export default function RoleGuard({ children, allowedRoles, fallback, requireAuth = true }: RoleGuardProps) {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    )
  }

  // Not authenticated and auth is required
  if (!user && requireAuth) {
    return (
      fallback || (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You need to be logged in to access this feature</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    )
  }

  // User doesn't have required role
  if (user && userProfile && !allowedRoles.includes(userProfile.role)) {
    return (
      fallback || (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this feature</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-destructive/50 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This feature requires {allowedRoles.join(" or ")} role access. Your current role is:{" "}
                <strong>{userProfile.role}</strong>
              </AlertDescription>
            </Alert>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Contact your administrator to request access or upgrade your account.
              </p>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    )
  }

  return <>{children}</>
}

export function useUser() {
  const { user, userProfile, loading } = useAuth()

  // Don't wait for profile if we have a user - create a minimal user object
  const minimalUser = user ? {
    id: user.uid,
    email: user.email || "",
    role: (userProfile?.role || "user") as UserRole,
    firstName: (userProfile?.displayName || user.displayName || "").split(" ")[0] || "",
    lastName: (userProfile?.displayName || user.displayName || "").split(" ").slice(1).join(" ") || "",
  } : null

  return {
    user: minimalUser,
    loading: loading && !user, // Only show loading if we don't have a user yet
  }
}

// Component for role-specific content
interface RoleContentProps {
  role: UserRole
  children: ReactNode
}

export function RoleContent({ role, children }: RoleContentProps) {
  const { userProfile } = useAuth()

  if (!userProfile || userProfile.role !== role) {
    return null
  }

  return <>{children}</>
}

// Component for multi-role content
interface MultiRoleContentProps {
  roles: Array<UserRole>
  children: ReactNode
}

export function MultiRoleContent({ roles, children }: MultiRoleContentProps) {
  const { userProfile } = useAuth()

  if (!userProfile || !roles.includes(userProfile.role)) {
    return null
  }

  return <>{children}</>
}
