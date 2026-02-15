"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Sparkles, ArrowRight, Info, Zap, TrendingUp, Crown } from "lucide-react"
import { getAIRequestLimit, normalizeSubscriptionTier, type SubscriptionTierInput } from "@/lib/subscription-tiers"
import Link from "next/link"

interface GenerateWorkoutResponse {
  success: boolean
  workout?: any
  cost?: {
    inputTokens: number
    outputTokens: number
    estimatedCost: number
  }
  quotaRemaining?: number
  rationale?: string
  alternatives?: string[]
  error?: string
  tier?: string
  aiUsed?: number
  aiLimit?: number
}

export default function GenerateWorkoutPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedWorkout, setGeneratedWorkout] = useState<any | null>(null)
  const [rationale, setRationale] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null)
  const [isQuotaError, setIsQuotaError] = useState(false)

  // Calculate user's AI quota
  const tier = normalizeSubscriptionTier((user?.subscriptionTier ?? 'free') as SubscriptionTierInput)
  const aiLimit = getAIRequestLimit(tier)
  const aiUsed = (user as any)?.aiRequestsUsed || 0
  const currentQuotaRemaining = aiLimit - aiUsed

  const examplePrompts = [
    "Upper body push workout, 45 minutes, dumbbells only",
    "Full body HIIT, 30 minutes, bodyweight exercises",
    "Leg day with squats and deadlifts, strength focus",
    "Core and abs workout, 20 minutes, no equipment",
    "Back and biceps, 60 minutes, hypertrophy training",
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a workout description")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedWorkout(null)
    setRationale(null)
    setAlternatives([])
    setIsQuotaError(false)

    try {
      const response = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data: GenerateWorkoutResponse = await response.json()

      if (!response.ok) {
        // Check if this is a quota error (403)
        if (response.status === 403) {
          setIsQuotaError(true)
        }
        throw new Error(data.error || 'Failed to generate workout')
      }

      // Set all response fields
      setGeneratedWorkout(data.workout)
      setRationale(data.rationale || null)
      setAlternatives(data.alternatives || [])
      setQuotaRemaining(data.quotaRemaining ?? null)
    } catch (err: any) {
      console.error('Error generating workout:', err)
      setError(err.message || 'Failed to generate workout. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleViewWorkout = () => {
    if (generatedWorkout?.workoutId || generatedWorkout?.id) {
      router.push(`/workout/${generatedWorkout.workoutId || generatedWorkout.id}`)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to generate AI-powered workouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-text-primary">
                AI Workout Generator
              </h1>
            </div>
            <p className="text-text-secondary">
              Describe your workout. AI builds the plan.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid gap-6">
            {!generatedWorkout ? (
              <>
                {/* Quota Display */}
                <Card className={currentQuotaRemaining <= 0 ? 'border-destructive/50' : 'border-primary/20'}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${currentQuotaRemaining <= 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                          <Zap className={`h-5 w-5 ${currentQuotaRemaining <= 0 ? 'text-destructive' : 'text-primary'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            AI Generations Remaining
                          </p>
                          <p className="text-xs text-text-secondary">
                            Resets monthly
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${currentQuotaRemaining <= 0 ? 'text-destructive' : 'text-primary'}`}>
                          {currentQuotaRemaining} / {aiLimit}
                        </p>
                        {currentQuotaRemaining <= 0 && (
                          <Link href="/subscription" className="text-xs text-primary hover:underline flex items-center gap-1 justify-end mt-1">
                            <Crown className="h-3 w-3" />
                            Upgrade for more
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Input Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>What workout do you want?</CardTitle>
                    <CardDescription>
                      Be specific: movement type, duration, equipment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Example: Upper body push workout, 45 minutes, dumbbells and barbell..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="resize-none"
                      disabled={isGenerating}
                    />

                    {/* Character count */}
                    <div className="text-xs text-text-secondary text-right">
                      {prompt.length} / 500 characters
                    </div>

                    {/* Example Prompts */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-primary">
                        Try these:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {examplePrompts.map((example, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => setPrompt(example)}
                            disabled={isGenerating}
                            className="text-xs"
                          >
                            {example}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Info Alert */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Uses your <Link href="/settings/training-profile" className="text-primary hover:underline">Training Profile</Link> for personalized weights.
                      </AlertDescription>
                    </Alert>

                    {/* Error Alert */}
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription className="space-y-2">
                          <p>{error}</p>
                          {isQuotaError && (
                            <Link href="/subscription" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
                              <Crown className="h-4 w-4" />
                              View Subscription Plans
                            </Link>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim() || currentQuotaRemaining <= 0}
                      className="w-full"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Workout...
                        </>
                      ) : currentQuotaRemaining <= 0 ? (
                        <>
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade to Generate
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Workout
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Feature Info Card */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">How it works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-text-secondary">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">Describe your goal</p>
                        <p>What to train, how long, what equipment</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">AI creates your plan</p>
                        <p>Analyzes your profile and generates exercises</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">Review & save</p>
                        <p>Preview, adjust, save to library</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Success Card */
              <>
                {/* Quota Update */}
                {quotaRemaining !== null && (
                  <Card className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-success/10">
                            <Zap className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              AI Generations Remaining
                            </p>
                            <p className="text-xs text-text-secondary">
                              Updated after generation
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-success">
                            {quotaRemaining} / {aiLimit}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle>Workout Generated!</CardTitle>
                        <CardDescription>
                          Saved to your library
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Workout Preview */}
                    <div className="bg-background rounded-lg p-4 space-y-2">
                      <h3 className="font-semibold text-lg text-text-primary">
                        {generatedWorkout.title}
                      </h3>
                      {generatedWorkout.description && (
                        <p className="text-sm text-text-secondary">
                          {generatedWorkout.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-text-secondary pt-2">
                        <span>{generatedWorkout.exercises?.length || 0} exercises</span>
                        {generatedWorkout.difficulty && (
                          <span className="capitalize">{generatedWorkout.difficulty}</span>
                        )}
                        {generatedWorkout.type && (
                          <span className="capitalize">{generatedWorkout.type}</span>
                        )}
                      </div>
                    </div>

                    {/* AI Rationale */}
                    {rationale && (
                      <div className="bg-background rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <h4 className="font-medium text-sm text-text-primary">Why this workout?</h4>
                        </div>
                        <p className="text-sm text-text-secondary">{rationale}</p>
                      </div>
                    )}

                    {/* Alternatives */}
                    {alternatives.length > 0 && (
                      <div className="bg-background rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-sm text-text-primary">Alternative Suggestions</h4>
                        <ul className="space-y-1.5">
                          {alternatives.map((alt, index) => (
                            <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{alt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button onClick={handleViewWorkout} className="flex-1" size="lg">
                        View Workout
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      <Button
                        onClick={() => {
                          setGeneratedWorkout(null)
                          setPrompt("")
                          setRationale(null)
                          setAlternatives([])
                          setQuotaRemaining(null)
                        }}
                        variant="outline"
                        size="lg"
                      >
                        Generate Another
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
