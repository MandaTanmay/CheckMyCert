"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, Upload, BarChart3, Users, Settings, QrCode, FileStack, LogOut, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

export default function RoleBasedNavigation() {
  const pathname = usePathname()
  const { user, userProfile, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isAuthenticated = Boolean(user || userProfile)
  const displayName = userProfile?.displayName || user?.displayName || user?.email || "Account"
  const roleLabel = userProfile?.role ? userProfile.role.toUpperCase() : "USER"

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = "/login"
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { href: "/upload", label: "Upload Certificate", icon: Upload },
      { href: "/generate", label: "Generate Certificate", icon: FileText },
      { href: "/qr-verify", label: "QR Verify", icon: QrCode },
    ]

    if (!userProfile) {
      return baseItems
    }

    const userItems = [...baseItems, { href: "/dashboard", label: "Dashboard", icon: BarChart3 }]

    const hrItems = [...userItems, { href: "/bulk-verify", label: "Bulk Verify", icon: FileStack }]

    const adminItems = [
      ...hrItems,
      { href: "/admin", label: "Admin Panel", icon: Users },
      { href: "/admin/settings", label: "System Settings", icon: Settings },
    ]

    switch (userProfile.role) {
      case "admin":
        return adminItems
      case "hr":
        return hrItems
      default:
        return userItems
    }
  }

  const navigationItems = getNavigationItems()

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">CheckMyCert</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div
              className="relative"
              onMouseEnter={() => setShowUserMenu(true)}
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-medium">{displayName}</p>
                  <Badge variant="secondary" className="text-xs">
                    {roleLabel}
                  </Badge>
                </div>
              </Button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border border-border bg-popover p-2 shadow-md z-50">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm text-destructive hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden" aria-hidden="true" />
          )}
        </div>
      </div>
    </header>
  )
}
