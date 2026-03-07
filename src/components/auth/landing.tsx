"use client"

import { Button } from "@/components/ui/button"
import { Dumbbell, TrendingUp, Calendar, Target } from "lucide-react"
import Link from "next/link"

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="p-5 rounded-full bg-[var(--primary)]/10 inline-block">
            <Dumbbell className="h-16 w-16 text-[var(--primary)]" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
          Kinex Fit
        </h1>
        <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-8 max-w-md">
          Your AI-powered fitness accountability partner
        </p>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-6 mb-10 max-w-sm">
          <div className="flex flex-col items-center">
            <div className="p-3 rounded-full bg-[var(--surface)] mb-2">
              <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <span className="text-xs text-[var(--text-secondary)]">Track Progress</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="p-3 rounded-full bg-[var(--surface)] mb-2">
              <Calendar className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <span className="text-xs text-[var(--text-secondary)]">Plan Workouts</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="p-3 rounded-full bg-[var(--surface)] mb-2">
              <Target className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <span className="text-xs text-[var(--text-secondary)]">Hit Goals</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-xs space-y-3">
          <Link href="/start" className="block">
            <Button className="w-full h-14 text-lg font-semibold shadow-lg">
              Start With A Workout
            </Button>
          </Link>
          <Link href="/auth/login?mode=signin" className="block">
            <Button variant="outline" className="w-full h-14 text-lg font-semibold">
              Sign In
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">
          Free to use. Sync across all devices.
        </p>
      </footer>
    </div>
  )
}
