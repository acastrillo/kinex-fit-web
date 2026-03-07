"use client"

import { useState } from "react"
import { useAuthStore } from "@/store"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { syncGuestAIUsage } from "@/lib/guest-mode"
import { trackEvent } from "@/lib/analytics"
import { Sparkles, Loader2, CheckCircle2, Info } from "lucide-react"

interface WorkoutEnhancerButtonProps {
  rawText: string
  onEnhanced: (enhancedWorkout: any) => void
  disabled?: boolean
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline" | "ghost"
}

export function WorkoutEnhancerButton({
  rawText,
  onEnhanced,
  disabled = false,
  size = "default",
  variant = "default",
}: WorkoutEnhancerButtonProps) {
  const { isAuthenticated } = useAuthStore()
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleEnhance = async () => {
    // Ensure rawText is a string before calling trim()
    const textToEnhance = String(rawText || '').trim()

    if (!textToEnhance) {
      setError("No text to enhance")
      return
    }

    setIsEnhancing(true)
    setError(null)
    setSuccess(false)
    trackEvent("workout_enhancement_requested", {
      authenticated: isAuthenticated,
    })

    try {
      const response = await fetch('/api/ai/enhance-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawText: textToEnhance }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. ${data.limit} requests allowed per hour. Try again in ${Math.ceil((data.reset - Date.now()) / 60000)} minutes.`)
        }
        throw new Error(data.error || 'Failed to enhance workout')
      }

      // Success! Pass the enhanced workout object directly
      if (!isAuthenticated && typeof data.aiUsed === "number") {
        syncGuestAIUsage(data.aiUsed)
      }
      trackEvent("workout_enhancement_succeeded", {
        authenticated: isAuthenticated,
        isGuest: Boolean(data.isGuest),
      })
      setSuccess(true)
      onEnhanced(data.enhancedWorkout)

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Enhancement error:', err)
      trackEvent("workout_enhancement_failed", {
        authenticated: isAuthenticated,
      })
      setError(err.message || 'Failed to enhance workout. Please try again.')
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleEnhance}
        disabled={disabled || isEnhancing || !rawText || typeof rawText !== 'string' || !rawText.trim()}
        size={size}
        variant={success ? "outline" : variant}
        className={success ? "border-primary text-primary" : ""}
      >
        {isEnhancing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enhancing...
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Enhanced!
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Enhance with AI
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && !error && (
        <Alert className="text-sm border-primary bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            Workout enhanced! Exercise names standardized, structure detected, and format cleaned up.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
