"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Pencil,
  Play,
  Timer,
  Trophy,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { calculateOneRepMax, normalizeWeight } from "@/lib/pr-calculator"
import type {
  DistanceUnit,
  WeightUnit,
  WorkoutExerciseMetric,
  WorkoutPRHighlight,
} from "@/types/workout-completion"

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string | number
  weight?: string
  restSeconds?: number
  notes?: string
  setDetails?: Array<{
    id?: string
    reps?: string | number
    weight?: string
  }>
}

interface WorkoutCard {
  id: string
  exerciseId: string
  exerciseName: string
  exerciseNumber: number
  setNumber: number
  totalSets: number
  reps: string | number
  weight?: string
  restSeconds?: number
  notes?: string
}

interface Workout {
  id: string
  title: string
  description: string
  exercises: Exercise[]
  amrapBlocks?: Array<{
    id: string
    label: string
    timeLimit: number
    order: number
    exercises: Exercise[]
  }>
  totalDuration: number
  difficulty: string
}

interface CompletionHistoryResponse {
  completions?: Array<{
    exerciseMetrics?: WorkoutExerciseMetric[] | null
  }>
}

const RUN_EXERCISE_PATTERN = /\b(run|running|jog|jogging|sprint|mile|miles|km|kilometer|kilometre|5k|10k)\b/i

function parseFirstNumber(input: string | number | undefined): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null
  }

  if (typeof input !== "string") {
    return null
  }

  const match = input.match(/\d+(\.\d+)?/)
  if (!match) return null

  const value = Number.parseFloat(match[0])
  return Number.isFinite(value) ? value : null
}

function parseWeightUnit(weightText?: string): WeightUnit {
  if (!weightText) return "lbs"
  const normalized = weightText.toLowerCase()
  if (normalized.includes("kg") || normalized.includes("kilo")) {
    return "kg"
  }
  return "lbs"
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatDistance(distance: number, unit: DistanceUnit = "m"): string {
  if (unit === "m") return `${distance.toFixed(distance % 1 === 0 ? 0 : 1)} m`
  if (unit === "km") return `${distance.toFixed(distance % 1 === 0 ? 0 : 2)} km`
  return `${distance.toFixed(distance % 1 === 0 ? 0 : 2)} mi`
}

function toMeters(distance: number, unit: DistanceUnit = "m"): number {
  if (unit === "km") return distance * 1000
  if (unit === "mi") return distance * 1609.34
  return distance
}

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase()
}

function flattenExercisesToCards(exercises: Exercise[]): WorkoutCard[] {
  const cards: WorkoutCard[] = []

  if (exercises.length === 0) return cards

  const maxSets = Math.max(
    ...exercises.map(ex =>
      ex.setDetails && ex.setDetails.length > 0 ? ex.setDetails.length : ex.sets
    )
  )

  for (let setIdx = 0; setIdx < maxSets; setIdx++) {
    exercises.forEach((exercise, exerciseIdx) => {
      const numSets = exercise.setDetails && exercise.setDetails.length > 0
        ? exercise.setDetails.length
        : exercise.sets

      if (setIdx < numSets) {
        const setDetail = exercise.setDetails?.[setIdx]

        cards.push({
          id: `${exercise.id}-set-${setIdx + 1}`,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          exerciseNumber: exerciseIdx + 1,
          setNumber: setIdx + 1,
          totalSets: numSets,
          reps: setDetail?.reps || exercise.reps,
          weight: setDetail?.weight || exercise.weight,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
        })
      }
    })
  }

  return cards
}

function createInitialMetrics(cards: WorkoutCard[]): Record<string, WorkoutExerciseMetric> {
  return cards.reduce<Record<string, WorkoutExerciseMetric>>((acc, card) => {
    const parsedWeight = parseFirstNumber(card.weight)
    const parsedReps = parseFirstNumber(card.reps)
    const isRun = RUN_EXERCISE_PATTERN.test(`${card.exerciseName} ${card.notes || ""}`)

    acc[card.id] = {
      cardId: card.id,
      exerciseId: card.exerciseId,
      exerciseName: card.exerciseName,
      completed: false,
      isRun,
      targetReps: card.reps,
      targetWeight: card.weight || null,
      roundCompleted: card.setNumber,
      roundTotal: card.totalSets,
      reps: !isRun && parsedReps !== null ? Math.round(parsedReps) : null,
      weight: !isRun && parsedWeight !== null ? parsedWeight : null,
      weightUnit: parseWeightUnit(card.weight),
      distance: null,
      distanceUnit: "m",
      timeSeconds: null,
      notes: null,
    }

    return acc
  }, {})
}

function sanitizeMetric(metric: WorkoutExerciseMetric): WorkoutExerciseMetric {
  return {
    ...metric,
    targetReps: metric.targetReps ?? null,
    targetWeight: metric.targetWeight ?? null,
    roundCompleted: metric.roundCompleted ?? null,
    roundTotal: metric.roundTotal ?? null,
    reps: metric.reps ?? null,
    weight: metric.weight ?? null,
    weightUnit: metric.weightUnit ?? "lbs",
    distance: metric.distance ?? null,
    distanceUnit: metric.distanceUnit ?? "m",
    timeSeconds: metric.timeSeconds ?? null,
    notes: metric.notes?.trim() || null,
  }
}

function detectSessionPRs(
  currentMetrics: WorkoutExerciseMetric[],
  historyCompletions: CompletionHistoryResponse["completions"]
): WorkoutPRHighlight[] {
  const historicalMetrics = (historyCompletions || [])
    .flatMap(completion => completion.exerciseMetrics || [])
    .map(sanitizeMetric)

  const prHighlights: WorkoutPRHighlight[] = []

  for (const metric of currentMetrics) {
    if (!metric.completed) continue

    const exerciseKey = normalizeExerciseName(metric.exerciseName)
    const exerciseHistory = historicalMetrics.filter(
      item => normalizeExerciseName(item.exerciseName) === exerciseKey
    )

    if (!metric.isRun) {
      if (!metric.weight || !metric.reps || metric.reps <= 0 || metric.weight <= 0) {
        continue
      }

      const unit = metric.weightUnit || "lbs"
      const candidateOneRM = calculateOneRepMax(
        normalizeWeight(metric.weight, unit),
        metric.reps
      )

      const previousBest = exerciseHistory.reduce((best, item) => {
        if (!item.weight || !item.reps || item.reps <= 0 || item.weight <= 0) return best
        const itemUnit = item.weightUnit || "lbs"
        const oneRM = calculateOneRepMax(normalizeWeight(item.weight, itemUnit), item.reps)
        return Math.max(best, oneRM)
      }, 0)

      if (candidateOneRM > previousBest + 0.5) {
        prHighlights.push({
          exerciseName: metric.exerciseName,
          category: "WEIGHT_REPS",
          message: `New strength PR on ${metric.exerciseName}!`,
          value: `${Math.round(metric.weight)} ${unit} x ${metric.reps} (~${Math.round(candidateOneRM)} 1RM)`,
        })
      }

      continue
    }

    if (metric.distance && metric.distance > 0) {
      const distanceUnit = metric.distanceUnit || "m"
      const candidateMeters = toMeters(metric.distance, distanceUnit)
      const bestMeters = exerciseHistory.reduce((best, item) => {
        if (!item.isRun || !item.distance || item.distance <= 0) return best
        return Math.max(best, toMeters(item.distance, item.distanceUnit || "m"))
      }, 0)

      if (candidateMeters > bestMeters + 0.5) {
        prHighlights.push({
          exerciseName: metric.exerciseName,
          category: "LONGEST_RUN_DISTANCE",
          message: `Longest distance PR for ${metric.exerciseName}!`,
          value: formatDistance(metric.distance, distanceUnit),
        })
      }

      if (metric.timeSeconds && metric.timeSeconds > 0) {
        const similarDistanceHistory = exerciseHistory.filter(item => {
          if (!item.isRun || !item.distance || !item.timeSeconds) return false
          const itemMeters = toMeters(item.distance, item.distanceUnit || "m")
          return Math.abs(itemMeters - candidateMeters) <= 1
        })

        const bestTime = similarDistanceHistory.reduce((best, item) => {
          return Math.min(best, item.timeSeconds || Number.MAX_SAFE_INTEGER)
        }, Number.MAX_SAFE_INTEGER)

        if (bestTime === Number.MAX_SAFE_INTEGER || metric.timeSeconds < bestTime) {
          prHighlights.push({
            exerciseName: metric.exerciseName,
            category: "FASTEST_RUN",
            message: `Fastest time PR for ${metric.exerciseName}!`,
            value: `${formatDuration(metric.timeSeconds)} for ${formatDistance(metric.distance, distanceUnit)}`,
          })
        }
      }
    }
  }

  return prHighlights
}

export default function WorkoutSessionPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const params = useParams()

  const [workout, setWorkout] = useState<Workout | null>(null)
  const [workoutCards, setWorkoutCards] = useState<WorkoutCard[]>([])
  const [exerciseMetrics, setExerciseMetrics] = useState<Record<string, WorkoutExerciseMetric>>({})

  const [loading, setLoading] = useState(true)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showMetricDialog, setShowMetricDialog] = useState(false)

  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [workoutNotes, setWorkoutNotes] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [detectedPRs, setDetectedPRs] = useState<WorkoutPRHighlight[]>([])

  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPausedRef = useRef(false)

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    const workoutId = params?.id as string
    if (!workoutId || !user?.id) return

    loadWorkout(workoutId)

    if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)

    sessionIntervalRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setSessionDuration(prev => prev + 1)
      }
    }, 1000)

    return () => {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
    }
  }, [params?.id, user?.id])

  useEffect(() => {
    if (!showCompletionDialog) {
      setIsSaving(false)
      setSaveSuccess(false)
    }
  }, [showCompletionDialog])

  const loadWorkout = async (workoutId: string) => {
    setLoading(true)

    try {
      const response = await fetch(`/api/workouts/${workoutId}`)

      if (response.ok) {
        const { workout: dbWorkout } = await response.json()
        const transformedWorkout: Workout = {
          id: dbWorkout.workoutId,
          title: dbWorkout.title,
          description: dbWorkout.description || "",
          exercises: dbWorkout.exercises || [],
          amrapBlocks: dbWorkout.amrapBlocks || [],
          totalDuration: dbWorkout.totalDuration || 0,
          difficulty: dbWorkout.difficulty || "medium",
        }

        const cards = flattenExercisesToCards(transformedWorkout.exercises)
        setWorkout(transformedWorkout)
        setWorkoutCards(cards)
        setExerciseMetrics(createInitialMetrics(cards))
      } else {
        const workouts = JSON.parse(localStorage.getItem("workouts") || "[]")
        const found = workouts.find((w: Workout) => w.id === workoutId)

        if (found) {
          const cards = flattenExercisesToCards(found.exercises)
          setWorkout(found)
          setWorkoutCards(cards)
          setExerciseMetrics(createInitialMetrics(cards))
        } else {
          setWorkout(null)
          setWorkoutCards([])
          setExerciseMetrics({})
        }
      }
    } catch (error) {
      console.error("Error loading workout:", error)
      const workouts = JSON.parse(localStorage.getItem("workouts") || "[]")
      const found = workouts.find((w: Workout) => w.id === workoutId)

      if (found) {
        const cards = flattenExercisesToCards(found.exercises)
        setWorkout(found)
        setWorkoutCards(cards)
        setExerciseMetrics(createInitialMetrics(cards))
      } else {
        setWorkout(null)
        setWorkoutCards([])
        setExerciseMetrics({})
      }
    } finally {
      setLoading(false)
    }
  }

  const completedCount = useMemo(
    () => Object.values(exerciseMetrics).filter(metric => metric.completed).length,
    [exerciseMetrics]
  )

  const progress = workoutCards.length > 0 ? (completedCount / workoutCards.length) * 100 : 0

  const selectedCard = useMemo(
    () => workoutCards.find(card => card.id === selectedCardId) || null,
    [selectedCardId, workoutCards]
  )

  const selectedMetric = selectedCard ? exerciseMetrics[selectedCard.id] : null

  const updateMetric = (cardId: string, updates: Partial<WorkoutExerciseMetric>) => {
    setExerciseMetrics(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        ...updates,
      },
    }))
  }

  const openMetricDialog = (cardId: string) => {
    setSelectedCardId(cardId)
    setShowMetricDialog(true)
  }

  const toggleComplete = (cardId: string) => {
    const metric = exerciseMetrics[cardId]
    if (!metric) return
    updateMetric(cardId, { completed: !metric.completed })
  }

  const handleDiscardWorkout = () => {
    if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
    router.push("/calendar")
  }

  const handleMarkCompleted = async () => {
    if (!workout) return

    setIsSaving(true)

    try {
      const completedAt = new Date().toISOString()
      const completedDate = completedAt.split("T")[0]
      const durationMinutes = Math.floor(sessionDuration / 60)
      const safeNotes = workoutNotes.trim().length > 0 ? workoutNotes.trim() : null

      const metricsToSave = workoutCards
        .map(card => exerciseMetrics[card.id])
        .filter((metric): metric is WorkoutExerciseMetric => Boolean(metric))
        .map(sanitizeMetric)

      let previousCompletions: CompletionHistoryResponse["completions"] = []
      try {
        const historyResponse = await fetch("/api/workouts/completions?limit=200")
        if (historyResponse.ok) {
          const historyData: CompletionHistoryResponse = await historyResponse.json()
          previousCompletions = historyData.completions || []
        }
      } catch (historyError) {
        console.error("Unable to load completion history for PR detection:", historyError)
      }

      const prHighlights = detectSessionPRs(metricsToSave, previousCompletions)
      setDetectedPRs(prHighlights)

      const localCompletionEntry = {
        id: Date.now().toString(),
        workoutId: workout.id,
        completedAt,
        completedDate,
        durationSeconds: sessionDuration,
        durationMinutes,
        notes: safeNotes,
        exerciseMetrics: metricsToSave,
        prHighlights,
      }

      let existingCompletions: any[] = []
      try {
        existingCompletions = JSON.parse(localStorage.getItem("completedWorkouts") || "[]")
      } catch {
        existingCompletions = []
      }

      localStorage.setItem(
        "completedWorkouts",
        JSON.stringify([...existingCompletions, localCompletionEntry])
      )

      if (user?.id) {
        const completionResponse = await fetch("/api/workouts/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workoutId: workout.id,
            completedAt,
            completedDate,
            durationSeconds: sessionDuration,
            durationMinutes,
            notes: safeNotes || undefined,
            exerciseMetrics: metricsToSave,
            prHighlights,
          }),
        })

        if (!completionResponse.ok) {
          const errorData = await completionResponse.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to save workout completion")
        }

        const completeResponse = await fetch(`/api/workouts/${workout.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completedAt,
            completedDate,
            durationSeconds: sessionDuration,
          }),
        })

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to mark workout as complete")
        }
      }

      window.dispatchEvent(new Event("workoutsUpdated"))
      window.dispatchEvent(new Event("calendarUpdated"))

      setSaveSuccess(true)
      setIsSaving(false)

      setTimeout(() => {
        router.push("/calendar")
      }, 1800)
    } catch (error) {
      console.error("Error saving workout:", error)
      setIsSaving(false)
      const errorMessage = error instanceof Error ? error.message : "Failed to save workout."
      alert(errorMessage)
    }
  }

  if (!isAuthenticated) {
    return <Login />
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-text-secondary">Loading workout session...</p>
          </div>
        </main>
      </>
    )
  }

  if (!workout) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-secondary mb-4">Workout not found</p>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-28">
        <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEndDialog(true)}
                className="text-text-secondary hover:text-white"
              >
                <X className="h-5 w-5 mr-2" />
                End Workout
              </Button>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono tabular-nums">{formatDuration(sessionDuration)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(prev => !prev)}
                  className="min-w-[110px]"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{completedCount}/{workoutCards.length} moves completed</span>
              {isPaused && <span className="text-amber-400">Timer paused</span>}
            </div>

            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-white">{workout.title}</h1>
            {workout.description && (
              <p className="text-text-secondary mt-1">{workout.description}</p>
            )}
          </div>

          <div className="space-y-4">
            {workoutCards.map((card) => {
              const metric = exerciseMetrics[card.id]

              if (!metric) return null

              const hasLoggedMetrics = metric.isRun
                ? Boolean((metric.distance && metric.distance > 0) || (metric.timeSeconds && metric.timeSeconds > 0))
                : Boolean((metric.reps && metric.reps > 0) || (metric.weight && metric.weight > 0))

              return (
                <Card
                  key={card.id}
                  onClick={() => openMetricDialog(card.id)}
                  className={cn(
                    "cursor-pointer transition-all border",
                    metric.completed
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-slate-700 bg-slate-900/60 hover:border-primary/60"
                  )}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
                            {card.exerciseNumber}
                          </div>
                          <h2 className="text-lg font-semibold text-white capitalize truncate">
                            {card.exerciseName}
                          </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="secondary" className="bg-slate-800 text-slate-200 border-slate-700">
                            Round {metric.roundCompleted ?? card.setNumber} of {metric.roundTotal ?? card.totalSets}
                          </Badge>
                          {metric.isRun ? (
                            <Badge variant="outline" className="border-blue-500/50 text-blue-300">
                              Run
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              Target: {card.reps || "-"} reps {card.weight ? `@ ${card.weight}` : ""}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-text-secondary">
                          {metric.isRun ? (
                            <>
                              {metric.distance && metric.distance > 0 ? (
                                <span>{formatDistance(metric.distance, metric.distanceUnit || "m")}</span>
                              ) : (
                                <span>No distance logged yet</span>
                              )}
                              {metric.timeSeconds && metric.timeSeconds > 0 && (
                                <span> · {formatDuration(metric.timeSeconds)}</span>
                              )}
                            </>
                          ) : hasLoggedMetrics ? (
                            <>
                              {metric.reps && metric.reps > 0 ? `${metric.reps} reps` : "No reps logged"}
                              {metric.weight && metric.weight > 0
                                ? ` @ ${metric.weight} ${metric.weightUnit || "lbs"}`
                                : ""}
                            </>
                          ) : (
                            <span>No metrics logged yet</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant={metric.completed ? "secondary" : "outline"}
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleComplete(card.id)
                          }}
                          className={cn(
                            "min-w-[120px]",
                            metric.completed && "bg-green-500/20 text-green-200 border-green-500/40 hover:bg-green-500/30"
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {metric.completed ? "Completed" : "Mark Complete"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            openMetricDialog(card.id)
                          }}
                          className="text-text-secondary hover:text-white"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Log Metrics
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="mt-8">
            <Button
              className="w-full h-12 text-base"
              onClick={() => setShowCompletionDialog(true)}
              disabled={isSaving}
            >
              <Timer className="h-5 w-5 mr-2" />
              Finish & Save Workout
            </Button>
          </div>
        </div>
      </main>

      <Dialog open={showMetricDialog} onOpenChange={setShowMetricDialog}>
        <DialogContent className="sm:max-w-lg">
          {selectedCard && selectedMetric && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl capitalize">{selectedCard.exerciseName}</DialogTitle>
                <DialogDescription>
                  Log your completed metrics for this move.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="round-completed">Rounds</Label>
                    <Input
                      id="round-completed"
                      type="number"
                      min={0}
                      value={selectedMetric.roundCompleted ?? ""}
                      onChange={(event) => {
                        const value = event.target.value
                        updateMetric(selectedCard.id, {
                          roundCompleted: value === "" ? null : Math.max(0, Number.parseInt(value, 10) || 0),
                        })
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="round-total">of</Label>
                    <Input
                      id="round-total"
                      type="number"
                      min={0}
                      value={selectedMetric.roundTotal ?? ""}
                      onChange={(event) => {
                        const value = event.target.value
                        updateMetric(selectedCard.id, {
                          roundTotal: value === "" ? null : Math.max(0, Number.parseInt(value, 10) || 0),
                        })
                      }}
                    />
                  </div>
                </div>

                {!selectedMetric.isRun ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="metric-reps">Reps</Label>
                      <Input
                        id="metric-reps"
                        type="number"
                        min={0}
                        value={selectedMetric.reps ?? ""}
                        onChange={(event) => {
                          const value = event.target.value
                          updateMetric(selectedCard.id, {
                            reps: value === "" ? null : Math.max(0, Number.parseInt(value, 10) || 0),
                          })
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="metric-weight">Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          id="metric-weight"
                          type="number"
                          min={0}
                          step="0.5"
                          value={selectedMetric.weight ?? ""}
                          onChange={(event) => {
                            const value = event.target.value
                            updateMetric(selectedCard.id, {
                              weight: value === "" ? null : Math.max(0, Number.parseFloat(value) || 0),
                            })
                          }}
                        />
                        <select
                          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                          value={selectedMetric.weightUnit || "lbs"}
                          onChange={(event) => {
                            updateMetric(selectedCard.id, {
                              weightUnit: event.target.value as WeightUnit,
                            })
                          }}
                        >
                          <option value="lbs">lbs</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <div>
                        <Label htmlFor="run-distance">Distance</Label>
                        <Input
                          id="run-distance"
                          type="number"
                          min={0}
                          step="0.01"
                          value={selectedMetric.distance ?? ""}
                          onChange={(event) => {
                            const value = event.target.value
                            updateMetric(selectedCard.id, {
                              distance: value === "" ? null : Math.max(0, Number.parseFloat(value) || 0),
                            })
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="run-distance-unit">Unit</Label>
                        <select
                          id="run-distance-unit"
                          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                          value={selectedMetric.distanceUnit || "m"}
                          onChange={(event) => {
                            updateMetric(selectedCard.id, {
                              distanceUnit: event.target.value as DistanceUnit,
                            })
                          }}
                        >
                          <option value="m">m</option>
                          <option value="km">km</option>
                          <option value="mi">mi</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="run-minutes">Time (min)</Label>
                        <Input
                          id="run-minutes"
                          type="number"
                          min={0}
                          value={Math.floor((selectedMetric.timeSeconds || 0) / 60)}
                          onChange={(event) => {
                            const minutes = Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0)
                            const seconds = (selectedMetric.timeSeconds || 0) % 60
                            updateMetric(selectedCard.id, {
                              timeSeconds: (minutes * 60) + seconds,
                            })
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="run-seconds">Time (sec)</Label>
                        <Input
                          id="run-seconds"
                          type="number"
                          min={0}
                          max={59}
                          value={(selectedMetric.timeSeconds || 0) % 60}
                          onChange={(event) => {
                            const seconds = Math.max(0, Math.min(59, Number.parseInt(event.target.value || "0", 10) || 0))
                            const minutes = Math.floor((selectedMetric.timeSeconds || 0) / 60)
                            updateMetric(selectedCard.id, {
                              timeSeconds: (minutes * 60) + seconds,
                            })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="metric-notes">Notes</Label>
                  <Textarea
                    id="metric-notes"
                    value={selectedMetric.notes || ""}
                    onChange={(event) => updateMetric(selectedCard.id, { notes: event.target.value })}
                    placeholder="Optional notes"
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => toggleComplete(selectedCard.id)}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {selectedMetric.completed ? "Mark Incomplete" : "Mark Complete"}
                </Button>
                <Button
                  onClick={() => setShowMetricDialog(false)}
                  className="w-full sm:w-auto"
                >
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCompletionDialog}
        onOpenChange={(open) => {
          if (!isSaving && !saveSuccess) {
            setShowCompletionDialog(open)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          {saveSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-3xl">Great job! 🎉</DialogTitle>
                <DialogDescription className="text-center text-base">
                  Workout saved in {formatDuration(sessionDuration)}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {detectedPRs.length > 0 ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-amber-300">
                      <Trophy className="h-5 w-5" />
                      <span className="font-semibold">{detectedPRs.length} new PR{detectedPRs.length === 1 ? "" : "s"}!</span>
                    </div>
                    <div className="space-y-2">
                      {detectedPRs.map((pr, index) => (
                        <div
                          key={`${pr.exerciseName}-${pr.category}-${index}`}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                        >
                          <div className="text-sm font-medium text-amber-200">{pr.message}</div>
                          <div className="text-xs text-amber-100/90">{pr.value}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-text-secondary">Great effort. Keep stacking sessions.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Finish Workout</DialogTitle>
                <DialogDescription>
                  Save this session and all logged move metrics.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-3">
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                  <span className="text-text-secondary">Workout</span>
                  <span className="font-medium">{workout.title}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                  <span className="text-text-secondary">Completed moves</span>
                  <span className="font-medium">{completedCount} / {workoutCards.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                  <span className="text-text-secondary">Duration</span>
                  <span className="font-medium">{formatDuration(sessionDuration)}</span>
                </div>

                <div>
                  <Label htmlFor="workout-notes">Session Notes</Label>
                  <Textarea
                    id="workout-notes"
                    placeholder="How did it go?"
                    value={workoutNotes}
                    onChange={(event) => setWorkoutNotes(event.target.value)}
                    className="min-h-[90px]"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleMarkCompleted}
                  className="w-full sm:w-auto"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Workout
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionDialog(false)}
                  disabled={isSaving}
                >
                  Continue Training
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Workout?</DialogTitle>
            <DialogDescription>
              You can save now or continue where you left off.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-surface px-3 py-2 text-sm text-text-secondary">
            {completedCount}/{workoutCards.length} moves completed • {formatDuration(sessionDuration)} elapsed
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDiscardWorkout}
              className="w-full sm:w-auto"
            >
              End Without Saving
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              className="w-full sm:w-auto"
            >
              Continue Workout
            </Button>
            <Button
              onClick={() => {
                setShowEndDialog(false)
                setShowCompletionDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              Save & End
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
