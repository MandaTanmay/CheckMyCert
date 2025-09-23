"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, Upload, BarChart3, Users, Settings, QrCode, FileStack, LogOut, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"

export default function RoleBasedNavigation() {
  const pathname = usePathname()
  const { user, userProfile, logout } = useAuth()

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
          {userProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">{userProfile.displayName}</p>
                    <Badge variant="secondary" className="text-xs">
                      {userProfile.role.toUpperCase()}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
