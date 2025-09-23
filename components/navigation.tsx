"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, Menu, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

type UserRole = "user" | "admin" | "institution"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  institution?: string
}

interface NavigationProps {
  user?: User
  variant?: "default" | "landing"
  className?: string
}

interface NavItem {
  href: string
  label: string
  description?: string
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

export function Navigation({ user, variant = "default", className }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getNavigationItems = (): (NavItem | NavSection)[] => {
    if (!user) {
      // Landing page navigation
      return [
        { href: "#features", label: "Features" },
        { href: "#pricing", label: "Pricing" },
        { href: "/docs", label: "Docs" },
        { href: "/contact", label: "Contact" },
      ]
    }

    const baseItems: (NavItem | NavSection)[] = [
      { href: "/dashboard", label: "Dashboard" },
      {
        title: "Verification",
        items: [
          { href: "/upload", label: "Upload Certificate", description: "Verify a single certificate" },
          { href: "/bulk-verify", label: "Bulk Verification", description: "Process multiple certificates" },
          { href: "/qr-verify", label: "QR Scan", description: "Scan QR codes for instant verification" },
          { href: "/history", label: "History", description: "View past verifications" },
        ],
      },
    ]

    if (user.role === "admin") {
      baseItems.push({
        title: "Administration",
        items: [
          { href: "/admin", label: "Admin Panel", description: "System overview and controls" },
          { href: "/admin/users", label: "Manage Users", description: "User accounts and permissions" },
          { href: "/admin/institutions", label: "Manage Institutions", description: "Educational institutions" },
          { href: "/admin/reports", label: "System Reports", description: "Analytics and insights" },
          { href: "/admin/settings", label: "System Settings", description: "Platform configuration" },
        ],
      })
    }

    if (user.role === "institution") {
      baseItems.push({
        title: "Institution",
        items: [
          { href: "/institution/issue", label: "Issue Certificate", description: "Create new certificates" },
          { href: "/institution/students", label: "Manage Students", description: "Student accounts and records" },
          {
            href: "/institution/templates",
            label: "Certificate Templates",
            description: "Design and manage templates",
          },
          { href: "/institution/analytics", label: "Analytics", description: "Issuance and verification stats" },
        ],
      })
    }

    return baseItems
  }

  const renderDesktopNavigation = () => {
    const items = getNavigationItems()

    if (!user) {
      // Simple navigation for landing page
      return (
        <nav className="hidden md:flex items-center gap-6">
          {(items as NavItem[]).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
            Login
          </Link>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      )
    }

    // Advanced navigation with dropdowns for authenticated users
    return (
      <div className="hidden md:flex items-center gap-4">
        <NavigationMenu>
          <NavigationMenuList>
            {items.map((item, index) => {
              if ("items" in item) {
                // Navigation section with dropdown
                return (
                  <NavigationMenuItem key={index}>
                    <NavigationMenuTrigger className="bg-transparent">{item.title}</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid w-[400px] gap-3 p-4">
                        {item.items.map((subItem) => (
                          <NavigationMenuLink key={subItem.href} asChild>
                            <Link
                              href={subItem.href}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">{subItem.label}</div>
                              {subItem.description && (
                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                  {subItem.description}
                                </p>
                              )}
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )
              } else {
                // Simple navigation item
                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href}
                        className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                      >
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              }
            })}
          </NavigationMenuList>
        </NavigationMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="capitalize text-xs">
                  {user.role}
                </Badge>
                {user.institution && (
                  <Badge variant="outline" className="text-xs">
                    {user.institution}
                  </Badge>
                )}
              </div>
            </div>
            <div className="border-t border-border my-1" />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account">Account</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing">Billing</Link>
            </DropdownMenuItem>
            <div className="border-t border-border my-1" />
            <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const renderMobileNavigation = () => {
    const items = getNavigationItems()

    return (
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <div className="flex flex-col space-y-4 mt-8">
            {/* User info for authenticated users */}
            {user && (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation items */}
            <nav className="flex flex-col space-y-2">
              {items.map((item, index) => {
                if ("items" in item) {
                  return (
                    <div key={index} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground px-2">{item.title}</h4>
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="block px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )
                } else {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )
                }
              })}

              {/* Auth links for non-authenticated users */}
              {!user && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <Link
                    href="/login"
                    className="block px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="block px-2 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* User actions for authenticated users */}
              {user && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <Link
                    href="/profile"
                    className="block px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <Link
                    href="/account"
                    className="block px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <button className="block w-full text-left px-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                    Sign Out
                  </button>
                </div>
              )}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <header className={`border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 ${className}`}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">CheckMyCert</span>
          {user?.role === "admin" && (
            <Badge variant="secondary" className="ml-2">
              Admin
            </Badge>
          )}
          {user?.role === "institution" && (
            <Badge variant="secondary" className="ml-2">
              Institution
            </Badge>
          )}
        </Link>

        {/* Desktop Navigation */}
        {renderDesktopNavigation()}

        {/* Mobile Navigation */}
        {renderMobileNavigation()}
      </div>
    </header>
  )
}
