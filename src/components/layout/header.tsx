"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuthStore } from "@/store"
import { Button } from "@/components/ui/button"
import { getQuotaLimit, normalizeSubscriptionTier } from "@/lib/stripe"
import {
  Dumbbell,
  Menu,
  X,
  Plus,
  Calendar,
  LogOut,
  Zap,
  BarChart3,
  Scale,
  Library,
  Timer,
  Settings
} from "lucide-react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const scanLimit = user ? getQuotaLimit(normalizeSubscriptionTier(user.subscriptionTier), 'workoutScansMonthly') : null
  const scanUsed = user
    ? (user.scanQuotaUsed ?? ((user.ocrQuotaUsed || 0) + (user.instagramImportsUsed || 0)))
    : 0

  const handleSignOut = async () => {
    // Call NextAuth signOut which will clear all cookies, session, and redirect to home
    await logout()
  }

  // Desktop navigation - full primary nav
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Add Workout", href: "/add", icon: Plus },
    { name: "Library", href: "/library", icon: Library },
    { name: "Stats", href: "/stats", icon: BarChart3 },
    { name: "Calendar", href: "/calendar", icon: Calendar },
  ]

  // Mobile hamburger - secondary features only (primary nav is in bottom nav)
  const mobileNavigation = [
    { name: "Timer", href: "/timer", icon: Timer },
    { name: "Body Metrics", href: "/stats/metrics", icon: Scale },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  if (!user) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/5 backdrop-blur-md overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
          <Dumbbell className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <span className="font-bold text-lg md:text-xl text-foreground">Kinex Fit</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.name} href={item.href}>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* User Menu */}
        <div className="flex items-center space-x-2">
          {/* Combined User Settings Button with Quota Display */}
          <Link href="/settings">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-xs md:text-sm"
              title="View settings and subscription details"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline text-text-secondary">
                {user?.firstName || user?.email}
              </span>
              {scanLimit !== null && scanLimit !== undefined && (
                <span className="text-text-secondary text-xs">
                  ({Math.max(0, scanLimit - scanUsed)} scans)
                </span>
              )}
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center space-x-2"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation - Secondary features only */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface/95 backdrop-blur-sm">
          <nav className="w-full max-w-4xl mx-auto px-4 py-4 space-y-2">
            {mobileNavigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start flex items-center space-x-3"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
