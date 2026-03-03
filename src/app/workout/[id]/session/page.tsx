"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
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
  Circle,
  Clock3,
  Loader2,
  Pause,
  Play,
  SlidersHorizontal,
  Trophy,
  Zap,
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
  timerConfig?: {
    params?: Record<string, unknown>
    aiGenerated?: boolean
    reason?: string
  } | null
}

interface CompletionHistoryResponse {
  completions?: Array<{
    exerciseMetrics?: WorkoutExerciseMetric[] | null
  }>
}

type SessionTimerType = "standard" | "interval" | "hiit"
type SessionIntervalPhase = "work" | "rest" | "completed"

interface SessionTimerConfiguration {
  type: SessionTimerType
  workSeconds: number
  restSeconds: number
  rounds: number
}

const DEFAULT_SESSION_TIMER_CONFIGURATION: SessionTimerConfiguration = {
  type: "standard",
  workSeconds: 40,
  restSeconds: 20,
  rounds: 8,
}

const TIMER_TYPE_OPTIONS: Array<{
  type: SessionTimerType
  label: string
  description: string
}> = [
  { type: "standard", label: "Standard", description: "Simple count-up timer." },
  {
    type: "interval",
    label: "Interval",
    description: "Work/rest intervals across rounds.",
  },
  { type: "hiit", label: "HIIT", description: "Short high-intensity rounds." },
]

function clampSessionTimerConfiguration(
  config: SessionTimerConfiguration
): SessionTimerConfiguration {
  const clampedWork = Math.max(5, Math.min(600, Math.round(config.workSeconds)))
  const clampedRest = Math.max(0, Math.min(600, Math.round(config.restSeconds)))
  const clampedRounds = Math.max(1, Math.min(50, Math.round(config.rounds)))

  return {
    type: config.type,
    workSeconds: clampedWork,
    restSeconds: clampedRest,
    rounds: clampedRounds,
  }
}

function usesCountdownTimer(config: SessionTimerConfiguration): boolean {
  return config.type !== "standard"
}

function timerTypeLabel(type: SessionTimerType): string {
  if (type === "interval") return "Interval"
  if (type === "hiit") return "HIIT"
  return "Standard"
}

function parseSessionTimerConfiguration(
  timerParams: Record<string, unknown> | undefined
): SessionTimerConfiguration {
  if (!timerParams || typeof timerParams.kind !== "string") {
    return DEFAULT_SESSION_TIMER_CONFIGURATION
  }

  if (timerParams.kind === "INTERVAL_WORK_REST") {
    const workSeconds = Number(timerParams.workSeconds)
    const restSeconds = Number(timerParams.restSeconds)
    const rounds = Number(timerParams.totalRounds)

    return clampSessionTimerConfiguration({
      type: "interval",
      workSeconds: Number.isFinite(workSeconds) ? workSeconds : 40,
      restSeconds: Number.isFinite(restSeconds) ? restSeconds : 20,
      rounds: Number.isFinite(rounds) ? rounds : 10,
    })
  }

  if (timerParams.kind === "TABATA") {
    const workSeconds = Number(timerParams.workSeconds)
    const restSeconds = Number(timerParams.restSeconds)
    const rounds = Number(timerParams.rounds)

    return clampSessionTimerConfiguration({
      type: "hiit",
      workSeconds: Number.isFinite(workSeconds) ? workSeconds : 20,
      restSeconds: Number.isFinite(restSeconds) ? restSeconds : 10,
      rounds: Number.isFinite(rounds) ? rounds : 8,
    })
  }

  return DEFAULT_SESSION_TIMER_CONFIGURATION
}

function timerStatusTag(
  timerType: SessionTimerType,
  intervalPhase: SessionIntervalPhase,
  intervalRound: number,
  rounds: number
): string {
  if (timerType === "standard") {
    return "Standard count-up timer"
  }

  if (intervalPhase === "completed") {
    return `${timerTypeLabel(timerType)} timer complete`
  }

  const phaseLabel = intervalPhase === "work" ? "Work" : "Rest"
  return `${phaseLabel} • Round ${Math.min(intervalRound, rounds)}/${rounds}`
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

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
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

function workoutSessionSubtitle(workout: Workout): string {
  const roundMatch = `${workout.title} ${workout.description}`.match(/(\d+)\s*rounds?/i)
  const rounds = roundMatch ? Number.parseInt(roundMatch[1], 10) : null
  const exerciseCount = workout.exercises.length

  if (rounds && Number.isFinite(rounds) && rounds > 0 && exerciseCount > 0) {
    return `${rounds} rounds of ${exerciseCount} exercises.`
  }

  if (workout.description.trim().length > 0) {
    return workout.description
  }

  if (exerciseCount > 0) {
    return `${exerciseCount} exercises.`
  }

  return ""
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
  const [timerConfiguration, setTimerConfiguration] = useState<SessionTimerConfiguration>(
    DEFAULT_SESSION_TIMER_CONFIGURATION
  )
  const [draftTimerConfiguration, setDraftTimerConfiguration] = useState<SessionTimerConfiguration>(
    DEFAULT_SESSION_TIMER_CONFIGURATION
  )
  const [intervalPhase, setIntervalPhase] = useState<SessionIntervalPhase>("completed")
  const [intervalRound, setIntervalRound] = useState(1)
  const [intervalPhaseRemainingSeconds, setIntervalPhaseRemainingSeconds] = useState(0)
  const [intervalElapsedSeconds, setIntervalElapsedSeconds] = useState(0)
  const [showTimerSelectionDialog, setShowTimerSelectionDialog] = useState(false)
  const [, setDidPresentAutoCompletion] = useState(false)

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
  const timerConfigurationRef = useRef<SessionTimerConfiguration>(DEFAULT_SESSION_TIMER_CONFIGURATION)
  const intervalPhaseRef = useRef<SessionIntervalPhase>("completed")
  const intervalRoundRef = useRef(1)
  const intervalPhaseRemainingSecondsRef = useRef(0)
  const intervalElapsedSecondsRef = useRef(0)

  const resetIntervalState = useCallback((configuration: SessionTimerConfiguration) => {
    if (!usesCountdownTimer(configuration)) {
      intervalPhaseRef.current = "completed"
      intervalRoundRef.current = 1
      intervalPhaseRemainingSecondsRef.current = 0
      intervalElapsedSecondsRef.current = 0
      setIntervalPhase("completed")
      setIntervalRound(1)
      setIntervalPhaseRemainingSeconds(0)
      setIntervalElapsedSeconds(0)
      return
    }

    intervalPhaseRef.current = "work"
    intervalRoundRef.current = 1
    intervalPhaseRemainingSecondsRef.current = configuration.workSeconds
    intervalElapsedSecondsRef.current = 0
    setIntervalPhase("work")
    setIntervalRound(1)
    setIntervalPhaseRemainingSeconds(configuration.workSeconds)
    setIntervalElapsedSeconds(0)
  }, [])

  const finishCountdownTimer = useCallback(() => {
    intervalPhaseRef.current = "completed"
    intervalPhaseRemainingSecondsRef.current = 0
    setIntervalPhase("completed")
    setIntervalPhaseRemainingSeconds(0)

    setDidPresentAutoCompletion((alreadyPresented) => {
      if (alreadyPresented) return alreadyPresented
      setIsPaused(true)
      setShowCompletionDialog(true)
      return true
    })
  }, [])

  const advanceIntervalPhase = useCallback(() => {
    const configuration = timerConfigurationRef.current

    if (!usesCountdownTimer(configuration)) {
      return
    }

    if (intervalPhaseRef.current === "work") {
      const hasAnotherRound = intervalRoundRef.current < configuration.rounds

      if (!hasAnotherRound) {
        finishCountdownTimer()
        return
      }

      if (configuration.restSeconds > 0) {
        intervalPhaseRef.current = "rest"
        intervalPhaseRemainingSecondsRef.current = configuration.restSeconds
        setIntervalPhase("rest")
        setIntervalPhaseRemainingSeconds(configuration.restSeconds)
        return
      }

      intervalRoundRef.current += 1
      intervalPhaseRef.current = "work"
      intervalPhaseRemainingSecondsRef.current = configuration.workSeconds
      setIntervalRound(intervalRoundRef.current)
      setIntervalPhase("work")
      setIntervalPhaseRemainingSeconds(configuration.workSeconds)
      return
    }

    if (intervalPhaseRef.current === "rest") {
      const hasAnotherRound = intervalRoundRef.current < configuration.rounds

      if (!hasAnotherRound) {
        finishCountdownTimer()
        return
      }

      intervalRoundRef.current += 1
      intervalPhaseRef.current = "work"
      intervalPhaseRemainingSecondsRef.current = configuration.workSeconds
      setIntervalRound(intervalRoundRef.current)
      setIntervalPhase("work")
      setIntervalPhaseRemainingSeconds(configuration.workSeconds)
    }
  }, [finishCountdownTimer])

  const applyTimerConfiguration = useCallback(
    (configuration: SessionTimerConfiguration) => {
      const normalized = clampSessionTimerConfiguration(configuration)
      timerConfigurationRef.current = normalized
      setTimerConfiguration(normalized)
      resetIntervalState(normalized)
      setDidPresentAutoCompletion(false)
    },
    [resetIntervalState]
  )

  const loadWorkout = useCallback(async (workoutId: string) => {
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
          timerConfig: dbWorkout.timerConfig || null,
        }

        const cards = flattenExercisesToCards(transformedWorkout.exercises)
        setWorkout(transformedWorkout)
        setWorkoutCards(cards)
        setExerciseMetrics(createInitialMetrics(cards))
        applyTimerConfiguration(
          parseSessionTimerConfiguration(transformedWorkout.timerConfig?.params)
        )
      } else {
        const workouts = JSON.parse(localStorage.getItem("workouts") || "[]")
        const found = workouts.find((w: Workout) => w.id === workoutId)

        if (found) {
          const cards = flattenExercisesToCards(found.exercises)
          setWorkout(found)
          setWorkoutCards(cards)
          setExerciseMetrics(createInitialMetrics(cards))
          applyTimerConfiguration(parseSessionTimerConfiguration(found.timerConfig?.params))
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
        applyTimerConfiguration(parseSessionTimerConfiguration(found.timerConfig?.params))
      } else {
        setWorkout(null)
        setWorkoutCards([])
        setExerciseMetrics({})
      }
    } finally {
      setLoading(false)
    }
  }, [applyTimerConfiguration])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    const workoutId = params?.id as string
    if (!workoutId || !user?.id) return

    setSessionDuration(0)
    setIsPaused(false)
    setDidPresentAutoCompletion(false)
    loadWorkout(workoutId)

    if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)

    sessionIntervalRef.current = setInterval(() => {
      if (isPausedRef.current) return

      setSessionDuration(prev => prev + 1)

      if (!usesCountdownTimer(timerConfigurationRef.current)) return
      if (intervalPhaseRef.current === "completed") return

      if (intervalPhaseRemainingSecondsRef.current > 0) {
        intervalPhaseRemainingSecondsRef.current -= 1
        intervalElapsedSecondsRef.current += 1
        setIntervalPhaseRemainingSeconds(intervalPhaseRemainingSecondsRef.current)
        setIntervalElapsedSeconds(intervalElapsedSecondsRef.current)
      }

      if (intervalPhaseRemainingSecondsRef.current === 0) {
        advanceIntervalPhase()
      }
    }, 1000)

    return () => {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
    }
  }, [advanceIntervalPhase, loadWorkout, params?.id, user?.id])

  useEffect(() => {
    if (showTimerSelectionDialog) {
      setDraftTimerConfiguration(timerConfiguration)
    }
  }, [showTimerSelectionDialog, timerConfiguration])

  useEffect(() => {
    if (!showCompletionDialog) {
      setIsSaving(false)
      setSaveSuccess(false)
    }
  }, [showCompletionDialog])

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
  const workoutSubtitle = workout ? workoutSessionSubtitle(workout) : ""
  const timerUsesCountdown = usesCountdownTimer(timerConfiguration)
  const displayedTimerSeconds = timerUsesCountdown
    ? Math.max(intervalPhaseRemainingSeconds, 0)
    : sessionDuration
  const timerStatusText = timerStatusTag(
    timerConfiguration.type,
    intervalPhase,
    intervalRound,
    timerConfiguration.rounds
  )
  const totalCountdownSeconds = timerUsesCountdown
    ? (timerConfiguration.workSeconds * timerConfiguration.rounds) +
      (timerConfiguration.restSeconds * Math.max(timerConfiguration.rounds - 1, 0))
    : 0
  const countdownProgress = timerUsesCountdown && totalCountdownSeconds > 0
    ? Math.min(1, Math.max(0, intervalElapsedSeconds / totalCountdownSeconds))
    : 0
  const timerSelectionLabel = timerUsesCountdown
    ? `${timerTypeLabel(timerConfiguration.type)} • ${timerConfiguration.rounds} rounds (${timerConfiguration.workSeconds}s/${timerConfiguration.restSeconds}s)`
    : "Standard"

  const applyDraftTimerConfiguration = () => {
    applyTimerConfiguration(draftTimerConfiguration)
    setShowTimerSelectionDialog(false)
  }

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

  const TimerDisplayIcon =
    timerConfiguration.type === "hiit"
      ? Zap
      : timerConfiguration.type === "interval"
      ? SlidersHorizontal
      : Clock3

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-28">
        <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl space-y-3 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowEndDialog(true)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
                End
              </button>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-white">
                  <TimerDisplayIcon className="h-4 w-4" />
                  <span className="font-mono text-[1.9rem] leading-none tabular-nums md:text-base">
                    {formatDuration(displayedTimerSeconds)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTimerSelectionDialog(true)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-text-secondary transition-colors hover:text-white"
                  aria-label="Adjust Timer"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaused(prev => !prev)}
                  className={cn(
                    "inline-flex min-w-[112px] items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold transition-colors",
                    isPaused ? "text-primary hover:text-primary/90" : "text-text-secondary hover:text-white"
                  )}
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-medium text-text-secondary">
                  {completedCount}/{workoutCards.length} moves completed
                </div>
                <div className="text-text-tertiary">{timerStatusText}</div>
              </div>
              {timerUsesCountdown && intervalPhase === "completed" ? (
                <span className="font-semibold text-green-400">Complete</span>
              ) : isPaused ? (
                <span className="font-semibold text-amber-400">Paused</span>
              ) : null}
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/95">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="mb-5 space-y-1">
            <h1 className="text-2xl font-bold text-white">{workout.title}</h1>
            {workoutSubtitle && (
              <p className="text-[15px] text-text-secondary">{workoutSubtitle}</p>
            )}
          </div>

          <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900/75 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <TimerDisplayIcon className="h-4 w-4 text-primary" />
                <span className="text-lg font-semibold text-white">
                  {timerTypeLabel(timerConfiguration.type)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTimerSelectionDialog(true)}
                className="rounded-full bg-primary/20 px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/30"
              >
                Adjust
              </button>
            </div>

            <div className="mb-2 flex items-end gap-2">
              <span className="font-mono text-5xl font-bold leading-none text-white">
                {formatDuration(displayedTimerSeconds)}
              </span>
              <span className="pb-1 text-sm font-semibold text-text-secondary">
                {timerUsesCountdown ? "remaining" : "elapsed"}
              </span>
            </div>

            {timerUsesCountdown && (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      intervalPhase === "rest"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-primary/20 text-primary"
                    )}
                  >
                    {intervalPhase === "completed"
                      ? "Complete"
                      : intervalPhase === "rest"
                      ? "Rest"
                      : "Work"}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary">
                    Round {Math.min(intervalRound, timerConfiguration.rounds)}/{timerConfiguration.rounds}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/95">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
                    style={{ width: `${countdownProgress * 100}%` }}
                  />
                </div>
              </>
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
                <div
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openMetricDialog(card.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      openMetricDialog(card.id)
                    }
                  }}
                  className={cn(
                    "w-full rounded-3xl border p-4 text-left transition-colors",
                    metric.completed
                      ? "border-green-500/35 bg-green-500/[0.04]"
                      : "border-slate-700 bg-slate-900/75 hover:border-primary/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary">
                          {card.exerciseNumber}
                        </div>
                        <h2 className="truncate text-2xl font-semibold capitalize text-white md:text-lg">
                          {card.exerciseName}
                        </h2>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-800/95 px-3 py-1 text-base font-medium text-text-secondary md:text-xs">
                          Set {metric.roundCompleted ?? card.setNumber} of {metric.roundTotal ?? card.totalSets}
                        </span>
                        {metric.isRun ? (
                          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-base font-medium text-blue-300 md:text-xs">
                            Run
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800/95 px-3 py-1 text-base font-medium text-text-secondary md:text-xs">
                            Target: {card.reps || "-"} reps{card.weight ? ` @ ${card.weight}` : ""}
                          </span>
                        )}
                      </div>

                      <div className="text-base text-text-tertiary md:text-sm">
                        {metric.isRun ? (
                          <>
                            {metric.distance && metric.distance > 0 ? (
                              <span>{formatDistance(metric.distance, metric.distanceUnit || "m")}</span>
                            ) : (
                              <span>Tap to log distance & time</span>
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
                          <span>Tap to log reps & weight</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleComplete(card.id)
                      }}
                      className={cn(
                        "inline-flex min-w-[132px] items-center justify-center gap-2 rounded-full px-4 py-2 text-2xl font-semibold transition-colors md:text-sm",
                        metric.completed
                          ? "border border-green-500/40 bg-green-500/15 text-green-300 hover:bg-green-500/20"
                          : "bg-slate-800/90 text-text-secondary hover:text-white"
                      )}
                    >
                      {metric.completed ? (
                        <CheckCircle2 className="h-5 w-5 md:h-4 md:w-4" />
                      ) : (
                        <Circle className="h-5 w-5 md:h-4 md:w-4" />
                      )}
                      {metric.completed ? "Done" : "Complete"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8">
            <Button
              className="h-12 w-full bg-gradient-to-r from-primary to-[#ff8036] text-base shadow-[0_12px_30px_rgba(255,107,53,0.35)]"
              onClick={() => setShowCompletionDialog(true)}
              disabled={isSaving}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Finish & Save Workout
            </Button>
          </div>
        </div>
      </main>

      <Dialog open={showTimerSelectionDialog} onOpenChange={setShowTimerSelectionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Session Timer</DialogTitle>
            <DialogDescription>
              Choose the timer that matches this session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid gap-2 sm:grid-cols-3">
              {TIMER_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setDraftTimerConfiguration((previous) => {
                      if (option.type === "standard") {
                        return clampSessionTimerConfiguration({
                          ...previous,
                          type: "standard",
                        })
                      }

                      if (option.type === "hiit") {
                        return clampSessionTimerConfiguration({
                          ...previous,
                          type: "hiit",
                          workSeconds: previous.type === "standard" ? 20 : previous.workSeconds,
                          restSeconds: previous.type === "standard" ? 10 : previous.restSeconds,
                          rounds: previous.type === "standard" ? 8 : previous.rounds,
                        })
                      }

                      return clampSessionTimerConfiguration({
                        ...previous,
                        type: "interval",
                        workSeconds: previous.type === "standard" ? 40 : previous.workSeconds,
                        restSeconds: previous.type === "standard" ? 20 : previous.restSeconds,
                        rounds: previous.type === "standard" ? 10 : previous.rounds,
                      })
                    })
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-colors",
                    draftTimerConfiguration.type === option.type
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface/40 hover:border-primary/50"
                  )}
                >
                  <div className="text-sm font-semibold text-white">{option.label}</div>
                  <div className="mt-1 text-xs text-text-secondary">{option.description}</div>
                </button>
              ))}
            </div>

            {draftTimerConfiguration.type !== "standard" && (
              <div className="grid gap-3 rounded-xl border border-border bg-surface/40 p-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="timer-work-seconds">Work (sec)</Label>
                  <Input
                    id="timer-work-seconds"
                    type="number"
                    min={5}
                    max={600}
                    value={draftTimerConfiguration.workSeconds}
                    onChange={(event) => {
                      const next = Number.parseInt(event.target.value || "0", 10)
                      if (!Number.isFinite(next)) return
                      setDraftTimerConfiguration((previous) =>
                        clampSessionTimerConfiguration({
                          ...previous,
                          workSeconds: next,
                        })
                      )
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="timer-rest-seconds">Rest (sec)</Label>
                  <Input
                    id="timer-rest-seconds"
                    type="number"
                    min={0}
                    max={600}
                    value={draftTimerConfiguration.restSeconds}
                    onChange={(event) => {
                      const next = Number.parseInt(event.target.value || "0", 10)
                      if (!Number.isFinite(next)) return
                      setDraftTimerConfiguration((previous) =>
                        clampSessionTimerConfiguration({
                          ...previous,
                          restSeconds: next,
                        })
                      )
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="timer-rounds">Rounds</Label>
                  <Input
                    id="timer-rounds"
                    type="number"
                    min={1}
                    max={50}
                    value={draftTimerConfiguration.rounds}
                    onChange={(event) => {
                      const next = Number.parseInt(event.target.value || "0", 10)
                      if (!Number.isFinite(next)) return
                      setDraftTimerConfiguration((previous) =>
                        clampSessionTimerConfiguration({
                          ...previous,
                          rounds: next,
                        })
                      )
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowTimerSelectionDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={applyDraftTimerConfiguration} className="w-full sm:w-auto">
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                  <span className="text-text-secondary">Timer</span>
                  <span className="max-w-[70%] truncate text-right font-medium">{timerSelectionLabel}</span>
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
