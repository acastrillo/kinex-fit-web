"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Target,
  TrendingUp,
  Dumbbell,
  Plus,
  Library,
  Clock,
  Award,
  Sparkles,
  Loader2,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"


export default function HomePage() {
  const { isAuthenticated, isLoading: isSessionLoading, user } = useAuthStore()
  const router = useRouter()
  const [workoutStats, setWorkoutStats] = useState({
    thisWeek: 0,
    total: 0,
    hoursTrained: 0,
    streak: 0
  })
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [workoutOfWeek, setWorkoutOfWeek] = useState<any | null>(null)
  const [isLoadingWOW, setIsLoadingWOW] = useState(false)

  // Helper to get the current week's Monday date
  const getWeekStartDate = (): string => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    return monday.toISOString().split('T')[0]
  }

  // Handler to generate Workout of the Week when user clicks
  const handleGenerateWOW = async () => {
    if (!user?.id) return

    setIsLoadingWOW(true)

    try {
      const response = await fetch('/api/ai/workout-of-the-week')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.workout) {
          setWorkoutOfWeek(data.workout)
          // Remember that user generated this week's workout
          const weekKey = `wow_generated_${getWeekStartDate()}`
          localStorage.setItem(weekKey, 'true')
        }
      } else if (response.status === 403) {
        const data = await response.json()
        console.error('WOW Error:', data.error)
      } else {
        console.error('Failed to load Workout of the Week')
      }
    } catch (error) {
      console.error('Error loading Workout of the Week:', error)
    } finally {
      setIsLoadingWOW(false)
    }
  }

  // Redirect to onboarding if not completed
  // Wait for session to finish loading to avoid race conditions with session updates
  useEffect(() => {
    // Don't redirect while session is still loading
    if (isSessionLoading) return;

    if (isAuthenticated && user?.id) {
      const needsOnboarding = !user.onboardingCompleted && !user.onboardingSkipped;

      if (needsOnboarding) {
        // Double-check with the API to avoid redirect loops caused by stale session data
        fetch('/api/user/onboarding')
          .then(res => {
            if (!res.ok) {
              // API error - don't redirect to avoid loops
              console.warn('[Home] Onboarding check failed with status:', res.status);
              return null;
            }
            return res.json();
          })
          .then(status => {
            // Only redirect if we got a successful response with explicit false values
            if (status && status.completed === false && status.skipped === false) {
              router.push('/onboarding');
            }
          })
          .catch((err) => {
            // On API error, don't redirect - stay on home to avoid loops
            console.warn('[Home] Onboarding API error:', err);
          });
      }
    }
  }, [isAuthenticated, isSessionLoading, user?.id, user?.onboardingCompleted, user?.onboardingSkipped, router]);

  // Check if user already generated this week's workout on mount
  useEffect(() => {
    if (!user?.id) return

    const weekKey = `wow_generated_${getWeekStartDate()}`
    const wasGenerated = localStorage.getItem(weekKey)

    if (wasGenerated) {
      // Auto-load from API cache (won't consume quota if already exists)
      handleGenerateWOW()
    }
  }, [user?.id])

  useEffect(() => {
    const loadWorkouts = async () => {
      if (!user?.id) return

      const computeLocalStats = (workoutCount: number) => {
        const completedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
        const now = new Date()
        const startOfWeekUtc = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - now.getUTCDay(),
          0, 0, 0, 0
        ))
        const startOfWeekIso = startOfWeekUtc.toISOString().split('T')[0]

        const thisWeekCompletions = completedWorkouts.filter((c: any) => {
          const completionDate = (c.completedDate || c.completedAt || '').split('T')[0]
          return completionDate && completionDate >= startOfWeekIso
        })

        const sortedDates = [...new Set(
          completedWorkouts
            .map((c: any) => (c.completedDate || c.completedAt || '').split('T')[0])
            .filter(Boolean)
        )].sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())

        let streak = 0
        const today = new Date().toISOString().split('T')[0]
        let checkDate = today
        for (const date of sortedDates) {
          if (date === checkDate) {
            streak++
            const prevDate = new Date(checkDate)
            prevDate.setDate(prevDate.getDate() - 1)
            checkDate = prevDate.toISOString().split('T')[0]
          } else {
            break
          }
        }

        const hoursTrained = Math.round((completedWorkouts.length * 0.75) * 10) / 10

        return {
          thisWeek: thisWeekCompletions.length,
          total: workoutCount,
          hoursTrained,
          streak,
        }
      }

      try {
        // Try to load from API first
        const response = await fetch('/api/workouts')
        if (response.ok) {
          const { workouts } = await response.json()

          // Sort by creation date and take most recent
          const sorted = workouts
            .sort((a: any, b: any) => {
              const aDate = new Date(a.createdAt || a.date || 0).getTime()
              const bDate = new Date(b.createdAt || b.date || 0).getTime()
              return bDate - aDate
            })
            .slice(0, 5)

          setRecentWorkouts(sorted)

          // Fetch stats from DynamoDB completions API
          try {
            const statsResponse = await fetch('/api/workouts/completions/stats')
            if (statsResponse.ok) {
              const { stats } = await statsResponse.json()
              const localStats = computeLocalStats(workouts.length)
              setWorkoutStats({
                thisWeek: Math.max(stats.thisWeek, localStats.thisWeek),
                total: workouts.length,
                hoursTrained: Math.max(stats.hoursTrained, localStats.hoursTrained),
                streak: Math.max(stats.streak, localStats.streak),
              })
            } else {
              // Fallback to localStorage calculation
              setWorkoutStats(computeLocalStats(workouts.length))
            }
          } catch (statsError) {
            console.error('Error fetching stats:', statsError)
            // Use empty stats on error
            setWorkoutStats(computeLocalStats(workouts.length))
          }
        } else {
          // Fallback to localStorage
          const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
          const sorted = savedWorkouts.slice().reverse().slice(0, 5)
          setRecentWorkouts(sorted)

          setWorkoutStats(computeLocalStats(savedWorkouts.length))
        }
      } catch (error) {
        console.error('Error loading workouts:', error)
        // Fallback to localStorage
        const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        const sorted = savedWorkouts.slice().reverse().slice(0, 5)
        setRecentWorkouts(sorted)

        setWorkoutStats(computeLocalStats(savedWorkouts.length))
      }
    }

    loadWorkouts()
    const handle = () => loadWorkouts()
    window.addEventListener('storage', handle)
    return () => {
      window.removeEventListener('storage', handle)
    }
  }, [user?.id])

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (!isSessionLoading && !isAuthenticated) {
      router.push('/landing')
    }
  }, [isSessionLoading, isAuthenticated, router])

  if (!isAuthenticated) {
    return null // Will redirect to /landing
  }

  const stats = [
    {
      title: "Workouts This Week",
      value: workoutStats.thisWeek.toString(),
      icon: Target,
      color: "text-primary",
    },
    {
      title: "Total Workouts",
      value: workoutStats.total.toString(),
      icon: Dumbbell,
      color: "text-secondary",
    },
    {
      title: "Hours Trained",
      value: `${workoutStats.hoursTrained}h`,
      icon: Clock,
      color: "text-rest",
    },
    {
      title: "Streak",
      value: `${workoutStats.streak} days`,
      icon: Award,
      color: "text-success",
    },
  ]

  const quickActions = [
    {
      title: "Add Workout",
      description: "Create or import workout",
      href: "/add",
      icon: Plus,
      primary: true,
    },
    {
      title: "View Calendar",
      description: "Your workout schedule",
      href: "/calendar",
      icon: Calendar,
    },
    {
      title: "Training Profile",
      description: "Set goals and PRs for AI",
      href: "/settings/training-profile",
      icon: Target,
    },
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Welcome back, {user?.firstName || "there"}!
            </h1>
            <p className="text-text-secondary">
              Ready to crush your fitness goals today?
            </p>
          </div>

          {/* Workout of the Week - Only show for paid users */}
          {user?.subscriptionTier && user.subscriptionTier !== 'free' && (
            <Card className="mb-8 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Workout of the Week</CardTitle>
                      <CardDescription>
                        Your free AI-generated weekly workout plan
                      </CardDescription>
                    </div>
                  </div>
                  {workoutOfWeek && (
                    <Button
                      onClick={() => router.push(`/workout/${workoutOfWeek.workoutId}`)}
                      size="sm"
                      className="gap-2"
                    >
                      <span>Start Workout</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* State 1: Loading */}
                {isLoadingWOW && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-text-secondary">Generating your personalized workout...</p>
                  </div>
                )}

                {/* State 2: Empty (before generation) */}
                {!workoutOfWeek && !isLoadingWOW && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      Get Your AI Workout
                    </h3>
                    <p className="text-text-secondary mb-6 max-w-md mx-auto">
                      AI workout tailored to your training profile. Fresh every week!
                    </p>
                    <Button onClick={handleGenerateWOW} size="lg" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Generate This Week&apos;s Workout</span>
                    </Button>
                  </div>
                )}

                {/* State 3: Generated workout */}
                {workoutOfWeek && !isLoadingWOW && (
                  <div
                    onClick={() => router.push(`/workout/${workoutOfWeek.workoutId}`)}
                    className="cursor-pointer hover:bg-surface/50 rounded-lg p-4 transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-text-primary mb-1">
                          {workoutOfWeek.title}
                        </h3>
                        {workoutOfWeek.description && (
                          <p className="text-sm text-text-secondary mb-2">
                            {workoutOfWeek.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <div className="flex items-center gap-1">
                        <Dumbbell className="h-4 w-4" />
                        <span>{workoutOfWeek.exercises?.length || 0} exercises</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{workoutOfWeek.totalDuration} min</span>
                      </div>
                      {workoutOfWeek.difficulty && (
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span className="capitalize">{workoutOfWeek.difficulty}</span>
                        </div>
                      )}
                    </div>
                    {workoutOfWeek.tags && workoutOfWeek.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {workoutOfWeek.tags.slice(0, 4).map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="hover:shadow-medium transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wide font-medium">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold text-text-primary mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <Link key={index} href={action.href}>
                    <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer group ${action.primary ? 'border-primary/30 bg-primary/10 hover:bg-primary/15' : 'hover:border-border/80'
                      }`}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-3 rounded-xl transition-colors duration-200 ${action.primary
                              ? 'bg-primary text-primary-foreground group-hover:bg-primary/90'
                              : 'bg-surface text-text-secondary group-hover:bg-surface/80'
                              }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">{action.title}</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {action.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
            {recentWorkouts.length === 0 ? (
              <Card className="border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-text-secondary" />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">No recent activity</h3>
                  <p className="text-text-secondary mb-6 max-w-md mx-auto">
                    Start by adding your first workout to see your progress here.
                  </p>
                  <Link href="/add">
                    <Button size="lg" className="font-semibold">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Workout
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentWorkouts.map((workout, index) => (
                  <Link key={workout.workoutId || workout.id} href={`/workout/${workout.workoutId || workout.id}`}>
                    <Card className="border-0 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Dumbbell className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-text-primary">{workout.title}</p>
                              <p className="text-sm text-text-secondary">
                                {workout.exercises?.length || 0} exercises
                                {workout.source && ` • ${workout.source}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-text-secondary">
                            {index === 0 && new Date(workout.createdAt || workout.date).toDateString() === new Date().toDateString()
                              ? 'Today'
                              : new Date(workout.createdAt || workout.date).toLocaleDateString()
                            }
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {recentWorkouts.length > 0 && (
                  <div className="text-center pt-4">
                    <Link href="/library">
                      <Button variant="outline">
                        <Library className="h-4 w-4 mr-2" />
                        View All Workouts
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
