"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Award,
  TrendingUp,
  Dumbbell,
  Trophy,
  ChevronRight
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { calculate1RM, extractPRsFromWorkout, getCurrentPR, getPRHistory, PersonalRecord } from "@/lib/pr-calculator"

export default function PersonalRecordsPage() {
  const { isAuthenticated, user } = useAuthStore()
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.id) {
      loadWorkoutsAndPRs()
    }
  }, [user?.id])

  const loadWorkoutsAndPRs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/workouts')
      if (response.ok) {
        const { workouts: data } = await response.json()
        setWorkouts(data)
      }
    } catch (error) {
      console.error('Error loading workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  // PERFORMANCE FIX: Memoize PR extraction (expensive operation)
  // Only recompute when workouts change
  const prs = useMemo(() => {
    const allPRs: PersonalRecord[] = []
    for (const workout of workouts) {
      const workoutPRs = extractPRsFromWorkout(workout, allPRs)
      allPRs.push(...workoutPRs)
    }
    return allPRs
  }, [workouts])

  // PERFORMANCE FIX: Memoize derived PR calculations
  const exercisesWithPRs = useMemo(() => {
    return Array.from(
      new Set(prs.map(pr => pr.exerciseName))
    ).sort()
  }, [prs])

  const topPRsByExercise = useMemo(() => {
    return exercisesWithPRs
      .map(exercise => getCurrentPR(exercise, prs))
      .filter((pr): pr is PersonalRecord => pr !== null)
      .sort((a, b) => b.oneRepMax - a.oneRepMax)
  }, [exercisesWithPRs, prs])

  // Changed to 2 weeks (14 days) instead of 30
  const recentPRs = useMemo(() => {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    return prs
      .filter(pr => new Date(pr.date) >= twoWeeksAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [prs])

  // Calculate stats
  const totalPRs = prs.length
  const exerciseCount = exercisesWithPRs.length
  const recentPRCount = recentPRs.length

  // PERFORMANCE FIX: Memoize selected exercise history
  const selectedExerciseHistory = useMemo(() => {
    if (!selectedExercise) return []
    return getPRHistory(selectedExercise, prs).map(pr => ({
      date: new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      oneRepMax: Math.round(pr.oneRepMax),
      weight: pr.weight,
      reps: pr.reps,
    }))
  }, [selectedExercise, prs])

  // Scroll to cards section
  const scrollToCards = () => {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
          <div className="w-full max-w-6xl mx-auto px-4 py-8">
            <Login />
          </div>
        </main>
        <MobileNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
              Personal Records
            </h1>
            <p className="text-text-secondary text-sm md:text-base">
              Track your strength gains and 1RM progression
            </p>
          </div>

          {/* Stats Cards - Square Grid */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
            <Card
              className="cursor-pointer hover:border-primary/50 transition-all"
              onClick={scrollToCards}
            >
              <CardContent className="p-4 md:p-6 aspect-square flex flex-col items-center justify-center">
                <Trophy className="h-8 w-8 md:h-10 md:w-10 text-primary mb-2" />
                <p className="text-2xl md:text-3xl font-bold text-text-primary">{totalPRs}</p>
                <p className="text-xs md:text-sm text-text-secondary text-center mt-1">Total PRs</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-all">
              <CardContent className="p-4 md:p-6 aspect-square flex flex-col items-center justify-center">
                <Dumbbell className="h-8 w-8 md:h-10 md:w-10 text-secondary mb-2" />
                <p className="text-2xl md:text-3xl font-bold text-text-primary">{exerciseCount}</p>
                <p className="text-xs md:text-sm text-text-secondary text-center mt-1">Exercises</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-all">
              <CardContent className="p-4 md:p-6 aspect-square flex flex-col items-center justify-center">
                <TrendingUp className="h-8 w-8 md:h-10 md:w-10 text-success mb-2" />
                <p className="text-2xl md:text-3xl font-bold text-text-primary">{recentPRCount}</p>
                <p className="text-xs md:text-sm text-text-secondary text-center mt-1">Recent (2w)</p>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-secondary">Loading PRs...</div>
          ) : prs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Award className="h-16 w-16 text-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No PRs yet</h3>
                <p className="text-text-secondary mb-6">
                  Start tracking your workouts to automatically detect personal records!
                </p>
                <Button onClick={() => window.location.href = '/add'}>
                  Add Workout
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div ref={cardsRef}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="all">All PRs</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="progression">Progression</TabsTrigger>
                </TabsList>

                {/* All PRs Tab */}
                <TabsContent value="all" className="mt-6">
                  <div className="space-y-3">
                    {topPRsByExercise.map((pr) => {
                      const estimated1RM = calculate1RM(pr.weight, pr.reps)
                      return (
                        <Link key={pr.exerciseName} href={`/exercise/${encodeURIComponent(pr.exerciseName)}`}>
                          <Card className="border-primary/40 hover:border-primary transition-all cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-text-primary text-lg mb-1">
                                    {pr.exerciseName}
                                  </h4>
                                  <span className="text-xs text-text-secondary">
                                    {new Date(pr.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-text-secondary mb-1">Best Lift</p>
                                  <p className="text-base font-semibold text-text-primary">
                                    {pr.weight} {pr.unit} × {pr.reps}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-text-secondary mb-1">Est. 1RM</p>
                                  <p className="text-base font-semibold text-primary">
                                    {Math.round(estimated1RM)} {pr.unit}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </TabsContent>

                {/* Recent PRs Tab - Last 2 weeks */}
                <TabsContent value="recent" className="mt-6">
                  {recentPRs.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <TrendingUp className="h-12 w-12 text-text-secondary mx-auto mb-3" />
                        <p className="text-text-secondary">
                          No PRs in the last 2 weeks. Keep pushing!
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {recentPRs.map((pr, index) => (
                        <Link key={index} href={`/exercise/${encodeURIComponent(pr.exerciseName)}`}>
                          <Card className="border-primary/40 hover:border-primary transition-all cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-text-primary flex-1">
                                  {pr.exerciseName}
                                </h4>
                                <div className="flex items-center space-x-2">
                                  <Trophy className="h-4 w-4 text-primary" />
                                  <span className="text-xs text-text-secondary">
                                    {new Date(pr.date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 text-sm">
                                <span className="text-text-secondary">
                                  {pr.weight} {pr.unit} × {pr.reps}
                                </span>
                                <span className="text-primary font-semibold">
                                  1RM: {Math.round(pr.oneRepMax)} {pr.unit}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Progression Tab */}
                <TabsContent value="progression" className="mt-6">
                  <div className="space-y-4">
                    {/* Exercise Selector */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Select Exercise</CardTitle>
                        <CardDescription>View strength progression over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {exercisesWithPRs.map((exercise) => (
                            <Button
                              key={exercise}
                              variant={selectedExercise === exercise ? "default" : "outline"}
                              onClick={() => setSelectedExercise(exercise)}
                              className="justify-start text-left"
                              size="sm"
                            >
                              <span className="truncate">{exercise}</span>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Progression Chart */}
                    {selectedExercise && (
                      <Card>
                        <CardHeader>
                          <CardTitle>{selectedExercise} Progression</CardTitle>
                          <CardDescription>1RM estimates over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {selectedExerciseHistory.length > 0 ? (
                            <>
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={selectedExerciseHistory}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                  <XAxis dataKey="date" stroke="#888" />
                                  <YAxis stroke="#888" />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                    labelStyle={{ color: '#fff' }}
                                    formatter={(value: any, name?: string) => {
                                      if (name === 'oneRepMax') return [`${value} lbs`, '1RM']
                                      return [value, name]
                                    }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="oneRepMax"
                                    stroke="#00d4ff"
                                    strokeWidth={2}
                                    dot={{ fill: '#00d4ff', r: 4 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>

                              {/* PR History Table */}
                              <div className="mt-6 space-y-2">
                                <h4 className="font-medium text-text-primary mb-3">PR History</h4>
                                {selectedExerciseHistory.reverse().map((entry, index) => (
                                  <div key={index} className="flex justify-between items-center p-3 border border-border rounded-lg">
                                    <span className="text-sm text-text-secondary">{entry.date}</span>
                                    <div className="flex items-center space-x-4">
                                      <span className="text-sm text-text-primary">
                                        {entry.weight} lbs × {entry.reps}
                                      </span>
                                      <span className="text-sm font-medium text-primary">
                                        1RM: {entry.oneRepMax} lbs
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-12 text-text-secondary">
                              No progression data available for this exercise
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
      <MobileNav />
    </>
  )
}
