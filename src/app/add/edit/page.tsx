"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { WorkoutCardList } from "@/components/workout/workout-card-list"
import {
  buildCardLayout,
  expandWorkoutToCards,
  collapseCardsToExercises,
  detectRepetitionPattern,
} from "@/lib/workout/card-transformer"
import type { WorkoutCard, AMRAPBlockDraft, EMOMBlockDraft } from "@/types/workout-card"
import {
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Sparkles
} from "lucide-react"
import { WorkoutEnhancerButton } from "@/components/ai/workout-enhancer-button"
import {
  canGuestSaveMore,
  getGuestSaveRemaining,
  incrementGuestSave,
} from "@/lib/guest-mode"
import { trackEvent } from "@/lib/analytics"

interface WorkoutData {
  id: string
  title: string
  content: string
  llmData?: any
  author?: any
  createdAt: string
  source: string
  type: string
  thumbnailUrl?: string | null
}

export default function EditWorkoutPage() {
  const { isAuthenticated, user } = useAuthStore()
  const isGuest = !isAuthenticated
  const router = useRouter()
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null)
  const [workoutTitle, setWorkoutTitle] = useState("")
  const [workoutDescription, setWorkoutDescription] = useState("")
  const [cards, setCards] = useState<WorkoutCard[]>([])  // Changed from exercises
  const [isSaving, setIsSaving] = useState(false)
  const [guestRemainingSaves, setGuestRemainingSaves] = useState(3)
  const [guestSaveError, setGuestSaveError] = useState<string | null>(null)
  const [workoutType, setWorkoutType] = useState<string>('standard')
  const [workoutStructure, setWorkoutStructure] = useState<any>(null)
  const [amrapBlocks, setAmrapBlocks] = useState<AMRAPBlockDraft[]>([])
  const [emomBlocks, setEmomBlocks] = useState<EMOMBlockDraft[]>([])

  useEffect(() => {
    if (emomBlocks.length > 0 && workoutType !== 'emom') {
      setWorkoutType('emom')
      return
    }
    if (emomBlocks.length === 0 && amrapBlocks.length > 0 && workoutType !== 'amrap') {
      setWorkoutType('amrap')
      return
    }
    if (
      emomBlocks.length === 0 &&
      amrapBlocks.length === 0 &&
      (workoutType === 'amrap' || workoutType === 'emom')
    ) {
      setWorkoutType('standard')
    }
  }, [emomBlocks.length, amrapBlocks.length, workoutType])

  useEffect(() => {
    // Load workout data from sessionStorage
    const stored = sessionStorage.getItem('workoutToEdit')
    if (stored) {
      const data = JSON.parse(stored)
      setWorkoutData(data)
      setWorkoutTitle(String(data.title || ''))

      // Merge AI Notes into Notes field
      let notesContent = String(data.llmData?.summary || '')
      if (data.llmData?.aiNotes && Array.isArray(data.llmData.aiNotes)) {
        const aiNotesText = data.llmData.aiNotes
          .filter((note: any) => note && typeof note === 'string')
          .map((note: string) => `• ${note}`)
          .join('\n')

        if (aiNotesText) {
          notesContent = notesContent
            ? `${notesContent}\n\n**AI Insights:**\n${aiNotesText}`
            : `**AI Insights:**\n${aiNotesText}`
        }
      }
      setWorkoutDescription(notesContent)

      const mapExercise = (exercise: any) => ({
        id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
        name: exercise.name || exercise.movement || '',
        sets: exercise.sets || 1,
        reps: exercise.reps || '',
        weight: exercise.weight || '',
        distance: exercise.distance || null,
        timing: exercise.timing || null,
        restSeconds: exercise.restSeconds || 60,
        notes: exercise.notes || '',
        setDetails: Array.isArray(exercise.setDetails) ? exercise.setDetails : null,
      })

      // Convert parsed exercises to card format
      let exerciseData = []
      if (data.llmData?.exercises && data.llmData.exercises.length > 0) {
        exerciseData = data.llmData.exercises.map(mapExercise)
      } else if (data.llmData?.rows) {
        // Fallback to old rows format
        exerciseData = data.llmData.rows.map((row: any) => ({
          id: row.id || `ex-${Date.now()}-${Math.random()}`,
          name: row.movement || '',
          sets: row.sets || 1,
          reps: row.reps || '',
          weight: row.weight || '',
          restSeconds: 60,
          notes: row.notes || '',
          setDetails: null,
        }))
      }

      const emomBlocksFromAI = Array.isArray(data.llmData?.emomBlocks)
        ? data.llmData.emomBlocks
        : []
      const amrapBlocksFromAI = Array.isArray(data.llmData?.amrapBlocks)
        ? data.llmData.amrapBlocks
        : []

      const detectedWorkoutType = emomBlocksFromAI.length > 0
        ? 'emom'
        : amrapBlocksFromAI.length > 0
        ? 'amrap'
        : data.llmData?.workoutType || 'standard'

      setWorkoutType(detectedWorkoutType)
      setWorkoutStructure(data.llmData?.structure || null)

      if (detectedWorkoutType === 'emom') {
        const defaultIntervalSeconds = Math.max(
          1,
          Math.floor(data.llmData?.structure?.timePerRound || 60)
        )

        if (emomBlocksFromAI.length > 0) {
          const blockCards: WorkoutCard[] = []
          const blockDrafts: EMOMBlockDraft[] = []
          const baseId = Date.now()

          emomBlocksFromAI.forEach((block: any, index: number) => {
            const blockId = block.id || `emom-${baseId}-${index}`
            blockDrafts.push({
              id: blockId,
              label: block.label || 'EMOM',
              intervalSeconds: block.intervalSeconds || defaultIntervalSeconds,
              order: block.order || index + 1,
            })

            const blockExercises = (block.exercises || []).map(mapExercise)
            blockCards.push(
              ...expandWorkoutToCards(blockExercises, undefined, { emomBlockId: blockId })
            )
          })

          setEmomBlocks(blockDrafts)
          setCards(blockCards)
        } else {
          const blockId = `emom-${Date.now()}`
          setEmomBlocks([
            {
              id: blockId,
              label: 'EMOM',
              intervalSeconds: defaultIntervalSeconds,
              order: 1,
            },
          ])
          setCards(expandWorkoutToCards(exerciseData, undefined, { emomBlockId: blockId }))
        }
        setAmrapBlocks([])
      } else if (detectedWorkoutType === 'amrap') {
        if (amrapBlocksFromAI.length > 0) {
          const blockCards: WorkoutCard[] = []
          const blockDrafts: AMRAPBlockDraft[] = []
          const baseId = Date.now()

          amrapBlocksFromAI.forEach((block: any, index: number) => {
            const blockId = block.id || `amrap-${baseId}-${index}`
            blockDrafts.push({
              id: blockId,
              label: block.label || 'AMRAP',
              timeLimitSeconds: block.timeLimit || 1200,
              order: block.order || index + 1,
            })

            const blockExercises = (block.exercises || []).map(mapExercise)
            blockCards.push(
              ...expandWorkoutToCards(blockExercises, undefined, { amrapBlockId: blockId })
            )
          })

          setAmrapBlocks(blockDrafts)
          setCards(blockCards)
        } else {
          const timeLimitSeconds = data.llmData?.structure?.timeLimit || 1200
          const blockId = `amrap-${Date.now()}`
          setAmrapBlocks([
            {
              id: blockId,
              label: 'AMRAP',
              timeLimitSeconds,
              order: 1,
            },
          ])
          setCards(expandWorkoutToCards(exerciseData, undefined, { amrapBlockId: blockId }))
        }
        setEmomBlocks([])
      } else {
        setAmrapBlocks([])
        setEmomBlocks([])

        // Detect repetition pattern and expand to cards
        // For "rounds" workout type, use structure.rounds instead of exercise.sets
        let repetition = detectRepetitionPattern(exerciseData, detectedWorkoutType)

        // Override for rounds-based workouts
        if (detectedWorkoutType === 'rounds' && data.llmData?.structure?.rounds) {
          repetition = {
            rounds: data.llmData.structure.rounds,
            pattern: 'circuit' as const,
            restBetweenExercises: false,  // No rest between exercises in same round
            restBetweenRounds: true,  // Rest between rounds
            defaultRestDuration: 60,
          }
        }

        const expandedCards = expandWorkoutToCards(exerciseData, repetition)
        setCards(expandedCards)
      }

      // Auto-fill workout title from first exercise if title is empty
      if (!data.title && exerciseData.length > 0 && exerciseData[0].name) {
        setWorkoutTitle(String(exerciseData[0].name))
      }
    } else {
      // No data found, redirect back
      router.push(isGuest ? '/start' : '/add')
    }
  }, [isGuest, router])

  useEffect(() => {
    if (typeof window === "undefined") return
    setGuestRemainingSaves(getGuestSaveRemaining())
  }, [])

  if (!workoutData) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              No Workout Data Found
            </h2>
            <p className="text-text-secondary mb-4">
              Please go back and import a workout first.
            </p>
            <Button onClick={() => router.push('/add')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import
            </Button>
          </div>
        </main>
      </>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Collapse cards back to exercises for saving
      const exercises = collapseCardsToExercises(cards)
      const cardLayout = buildCardLayout(cards)
      const resolvedWorkoutType =
        emomBlocks.length > 0
          ? 'emom'
          : amrapBlocks.length > 0
          ? 'amrap'
          : workoutType === 'amrap' || workoutType === 'emom'
          ? 'standard'
          : workoutType
      const amrapBlocksPayload = amrapBlocks.length
        ? amrapBlocks.map((block) => ({
            id: block.id,
            label: block.label,
            timeLimit: block.timeLimitSeconds,
            order: block.order,
            exercises: collapseCardsToExercises(
              cards.filter(
                (card) => card.type === 'exercise' && card.amrapBlockId === block.id
              )
            ),
          }))
        : null
      const emomBlocksPayload = emomBlocks.length
        ? emomBlocks.map((block) => ({
            id: block.id,
            label: block.label,
            intervalSeconds: block.intervalSeconds,
            order: block.order,
            exercises: collapseCardsToExercises(
              cards.filter(
                (card) => card.type === 'exercise' && card.emomBlockId === block.id
              )
            ),
          }))
        : null
      const emomStructure =
        emomBlocks.length > 0
          ? {
              rounds: emomBlocks.length,
              timePerRound: emomBlocks[0].intervalSeconds,
              totalTime: emomBlocks.reduce((sum, block) => sum + block.intervalSeconds, 0),
            }
          : null
      const structure =
        resolvedWorkoutType === 'amrap'
          ? amrapBlocks.length === 1
            ? { timeLimit: amrapBlocks[0].timeLimitSeconds }
            : null
          : resolvedWorkoutType === 'emom'
          ? workoutStructure ?? emomStructure
          : workoutStructure
      const structureWithLayout = { ...(structure ?? {}), cardLayout }
      const estimatedDuration = workoutData.llmData?.workoutV1?.totalDuration || estimateDuration(exercises)
      const difficulty = workoutData.llmData?.workoutV1?.difficulty || 'moderate'
      const tags = workoutData.llmData?.workoutV1?.tags || []

      if (!user?.id) {
        if (!canGuestSaveMore()) {
          setGuestSaveError("You have reached the 3 workout guest save limit. Create a free account to keep going.")
          setGuestRemainingSaves(getGuestSaveRemaining())
          trackEvent("guest_save_limit_reached")
          return
        }

        const existingWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        const finalWorkout = {
          id: workoutData.id,
          title: workoutTitle,
          description: workoutDescription,
          exercises,
          content: workoutData.content,
          author: workoutData.author,
          createdAt: workoutData.createdAt,
          updatedAt: new Date().toISOString(),
          source: workoutData.source,
          type: workoutData.type,
          totalDuration: estimatedDuration,
          difficulty,
          tags,
          llmData: workoutData.llmData,
          workoutType: resolvedWorkoutType,
          structure: structureWithLayout,
          amrapBlocks: amrapBlocksPayload,
          emomBlocks: emomBlocksPayload,
          aiNotes: null,
          aiEnhanced: workoutDescription.includes('**AI Insights:**'),
          thumbnailUrl: workoutData.thumbnailUrl || null,
          guestLocked: true,
        }
        const withoutCurrent = existingWorkouts.filter((workout: { id?: string }) => workout.id !== workoutData.id)
        withoutCurrent.push(finalWorkout)
        localStorage.setItem('workouts', JSON.stringify(withoutCurrent))
        incrementGuestSave()
        setGuestRemainingSaves(getGuestSaveRemaining())
        setGuestSaveError(null)
        sessionStorage.removeItem('workoutToEdit')
        window.dispatchEvent(new Event('workoutsUpdated'))
        trackEvent("guest_workout_saved", {
          source: workoutData.source,
        })
        router.push(`/workout/${workoutData.id}`)
        return
      }

      // Prepare workout data for DynamoDB
      const workoutToSave = {
        workoutId: workoutData.id,
        title: workoutTitle,
        description: workoutDescription,
        exercises: exercises,
        content: workoutData.content,
        author: workoutData.author,
        createdAt: workoutData.createdAt,
        source: workoutData.source,
        type: workoutData.type,
        totalDuration: estimatedDuration,
        difficulty,
        tags,
        llmData: workoutData.llmData,
        workoutType: resolvedWorkoutType,
        structure: structureWithLayout,
        amrapBlocks: amrapBlocksPayload,
        emomBlocks: emomBlocksPayload,
        aiNotes: null,  // AI notes now merged into description
        aiEnhanced: workoutDescription.includes('**AI Insights:**'), // Mark as AI enhanced if description contains AI insights
        thumbnailUrl: workoutData.thumbnailUrl || null,  // Include Instagram image URL if available
      }

      // Save to DynamoDB via API route
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workoutToSave),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save workout')
      }

      const { workout } = await response.json()

      // Also save to localStorage as fallback/cache
      const existingWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const finalWorkout = {
        id: workout.workoutId,
        ...workout,
        updatedAt: new Date().toISOString(),
      }
      existingWorkouts.push(finalWorkout)
      localStorage.setItem('workouts', JSON.stringify(existingWorkouts))

      // Clear session storage
      sessionStorage.removeItem('workoutToEdit')
      trackEvent("authenticated_workout_saved", {
        source: workoutData.source,
      })

      if (!user.onboardingCompleted && !user.onboardingSkipped) {
        router.push(`/onboarding?step=goals&next=${encodeURIComponent(`/workout/${workout.workoutId}`)}`)
        return
      }

      // Navigate to workout view
      router.push(`/workout/${workout.workoutId}`)

    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save workout. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const estimateDuration = (exercises: any[]) => {
    // Basic duration estimation: 2 minutes per exercise
    return Math.max(exercises.length * 2, 15)
  }

  const handleAIEnhancement = (enhancedWorkout: any) => {
    // Update title if provided
    if (enhancedWorkout.title) {
      setWorkoutTitle(String(enhancedWorkout.title))
    }

    // Merge AI notes into description field
    let updatedDescription = workoutDescription
    if (enhancedWorkout.description) {
      updatedDescription = String(enhancedWorkout.description)
    }

    // Append AI notes to description
    if (enhancedWorkout.aiNotes && Array.isArray(enhancedWorkout.aiNotes)) {
      const aiNotesText = enhancedWorkout.aiNotes
        .filter((note: any) => note && typeof note === 'string')
        .map((note: string) => `• ${note}`)
        .join('\n')

      if (aiNotesText) {
        updatedDescription = updatedDescription
          ? `${updatedDescription}\n\n**AI Insights:**\n${aiNotesText}`
          : `**AI Insights:**\n${aiNotesText}`
      }
    }
    setWorkoutDescription(updatedDescription)

    const mapExercise = (exercise: any) => ({
      id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
      name: exercise.name || '',
      sets: exercise.sets || 1,
      reps: exercise.reps || '',
      weight: exercise.weight || '',
      distance: exercise.distance || null,
      timing: exercise.timing || null,
      restSeconds: exercise.restSeconds || null,
      notes: exercise.notes || '',
      duration: exercise.duration || null,
      setDetails: Array.isArray(exercise.setDetails) ? exercise.setDetails : null,
    })

    const emomBlocksFromAI = Array.isArray(enhancedWorkout.emomBlocks)
      ? enhancedWorkout.emomBlocks
      : []
    const amrapBlocksFromAI = Array.isArray(enhancedWorkout.amrapBlocks)
      ? enhancedWorkout.amrapBlocks
      : []

    const detectedWorkoutType = emomBlocksFromAI.length > 0
      ? 'emom'
      : amrapBlocksFromAI.length > 0
      ? 'amrap'
      : enhancedWorkout.workoutType || 'standard'
    setWorkoutType(detectedWorkoutType)
    setWorkoutStructure(enhancedWorkout.structure || null)

    const exerciseData = Array.isArray(enhancedWorkout.exercises)
      ? enhancedWorkout.exercises.map(mapExercise)
      : []

    if (detectedWorkoutType === 'emom') {
      const defaultIntervalSeconds = Math.max(
        1,
        Math.floor(enhancedWorkout.structure?.timePerRound || 60)
      )

      if (emomBlocksFromAI.length > 0) {
        const blockCards: WorkoutCard[] = []
        const blockDrafts: EMOMBlockDraft[] = []
        const baseId = Date.now()

        emomBlocksFromAI.forEach((block: any, index: number) => {
          const blockId = block.id || `emom-${baseId}-${index}`
          blockDrafts.push({
            id: blockId,
            label: block.label || 'EMOM',
            intervalSeconds: block.intervalSeconds || defaultIntervalSeconds,
            order: block.order || index + 1,
          })

          const blockExercises = (block.exercises || []).map(mapExercise)
          blockCards.push(
            ...expandWorkoutToCards(blockExercises, undefined, { emomBlockId: blockId })
          )
        })

        setEmomBlocks(blockDrafts)
        setCards(blockCards)
      } else {
        const blockId = `emom-${Date.now()}`
        setEmomBlocks([
          {
            id: blockId,
            label: 'EMOM',
            intervalSeconds: defaultIntervalSeconds,
            order: 1,
          },
        ])
        setCards(expandWorkoutToCards(exerciseData, undefined, { emomBlockId: blockId }))
      }
      setAmrapBlocks([])
    } else if (detectedWorkoutType === 'amrap') {
      if (amrapBlocksFromAI.length > 0) {
        const blockCards: WorkoutCard[] = []
        const blockDrafts: AMRAPBlockDraft[] = []
        const baseId = Date.now()

        amrapBlocksFromAI.forEach((block: any, index: number) => {
          const blockId = block.id || `amrap-${baseId}-${index}`
          blockDrafts.push({
            id: blockId,
            label: block.label || 'AMRAP',
            timeLimitSeconds: block.timeLimit || 1200,
            order: block.order || index + 1,
          })

          const blockExercises = (block.exercises || []).map(mapExercise)
          blockCards.push(
            ...expandWorkoutToCards(blockExercises, undefined, { amrapBlockId: blockId })
          )
        })

        setAmrapBlocks(blockDrafts)
        setCards(blockCards)
      } else {
        const timeLimitSeconds = enhancedWorkout.structure?.timeLimit || 1200
        const blockId = `amrap-${Date.now()}`
        setAmrapBlocks([
          {
            id: blockId,
            label: 'AMRAP',
            timeLimitSeconds,
            order: 1,
          },
        ])
        setCards(expandWorkoutToCards(exerciseData, undefined, { amrapBlockId: blockId }))
      }
      setEmomBlocks([])
    } else {
      setAmrapBlocks([])
      setEmomBlocks([])

      if (exerciseData.length > 0) {
        // Detect repetition pattern and expand to cards
        // For "rounds" workout type, use structure.rounds instead of exercise.sets
        let repetition = detectRepetitionPattern(exerciseData, detectedWorkoutType)

        // Override for rounds-based workouts
        if (detectedWorkoutType === 'rounds' && enhancedWorkout.structure?.rounds) {
          repetition = {
            rounds: enhancedWorkout.structure.rounds,
            pattern: 'circuit' as const,
            restBetweenExercises: false,  // No rest between exercises in same round
            restBetweenRounds: true,  // Rest between rounds
            defaultRestDuration: 60,
          }
        }

        const expandedCards = expandWorkoutToCards(exerciseData, repetition)
        setCards(expandedCards)
      }
    }

    // Auto-fill title from first exercise if not provided
    if (!enhancedWorkout.title && !workoutTitle && exerciseData.length > 0 && exerciseData[0].name) {
      setWorkoutTitle(String(exerciseData[0].name))
    }
  }

  return (
    <>
      {isAuthenticated && <Header />}
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(isGuest ? '/start' : '/add')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Create New Workout
                </h1>
                <p className="text-sm text-text-secondary">
                  Review and save your imported workout
                </p>
              </div>
            </div>

            {isGuest && (
              <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">
                      Guest preview mode
                    </div>
                    <p className="text-sm text-text-secondary">
                      Save up to {guestRemainingSaves} more workout{guestRemainingSaves === 1 ? "" : "s"} locally before creating an account.
                    </p>
                    {guestSaveError && (
                      <p className="mt-2 text-sm text-destructive">{guestSaveError}</p>
                    )}
                  </div>
                  <Link href="/auth/login?mode=signup&callbackUrl=%2Fadd" className="block">
                    <Button variant="outline" className="w-full md:w-auto">
                      Create Free Account
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Import Info */}
            {workoutData.llmData && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary font-medium">
                      Imported Workout
                    </span>
                  </div>

                  {isAuthenticated && (
                    <WorkoutEnhancerButton
                      rawText={workoutData.content}
                      onEnhanced={handleAIEnhancement}
                      size="sm"
                      variant="outline"
                    />
                  )}
                </div>

                {workoutData.llmData.breakdown && (
                  <div className="text-xs text-text-secondary space-y-1 mb-3">
                    {workoutData.llmData.breakdown.map((item: string, idx: number) => (
                      <div key={idx}>• {item}</div>
                    ))}
                  </div>
                )}

                {/* Full Caption Display */}
                {workoutData.content && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <h4 className="text-xs font-medium text-primary mb-2">
                      Original Caption:
                    </h4>
                    <div className="text-xs text-text-secondary whitespace-pre-wrap bg-surface/50 rounded p-2 max-h-32 overflow-y-auto">
                      {workoutData.content}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Workout Structure Display */}
            {workoutType && workoutType !== 'standard' && (
              <div className="mb-6 p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  <span className="text-sm text-secondary font-medium uppercase">
                    {workoutType.toUpperCase()} Workout
                  </span>
                </div>

                {workoutStructure && (
                  <div className="text-xs text-text-secondary space-y-1">
                    {workoutStructure.rounds && (
                      <div>• Rounds: {workoutStructure.rounds}</div>
                    )}
                    {workoutStructure.timePerRound && (
                      <div>• Time per Round: {workoutStructure.timePerRound}s ({Math.floor(workoutStructure.timePerRound / 60)}min)</div>
                    )}
                    {workoutStructure.timeLimit && (
                      <div>• Time Limit: {workoutStructure.timeLimit}s ({Math.floor(workoutStructure.timeLimit / 60)}min)</div>
                    )}
                    {workoutStructure.totalTime && (
                      <div>• Total Time: {workoutStructure.totalTime}s ({Math.floor(workoutStructure.totalTime / 60)}min)</div>
                    )}
                    {workoutStructure.pattern && (
                      <div>• Pattern: {workoutStructure.pattern}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Workout Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workout Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Workout Name
                    </label>
                    <Input
                      value={workoutTitle}
                      onChange={(e) => setWorkoutTitle(e.target.value)}
                      placeholder="Enter workout name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Description
                    </label>
                    <Textarea
                      value={workoutDescription}
                      onChange={(e) => setWorkoutDescription(e.target.value)}
                      placeholder="Describe this workout (goals, intensity, focus areas...)"
                      rows={5}
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium text-text-primary mb-2">Summary</h4>
                    <div className="text-sm text-text-secondary space-y-1">
                      <div>Cards: {cards.length}</div>
                      <div>Exercises: {cards.filter(c => c.type === 'exercise').length}</div>
                      <div>Est. Duration: {estimateDuration(collapseCardsToExercises(cards))} min</div>
                      <div>Source: {workoutData.type === 'sample' ? 'Sample Workout' : workoutData.source === 'manual' ? 'Manual Entry' : 'Instagram'}</div>
                      {workoutData.author && (
                        <div>From: @{workoutData.author.username}</div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6"
                    onClick={handleSave}
                    disabled={!workoutTitle || typeof workoutTitle !== 'string' || !workoutTitle.trim() || cards.length === 0 || isSaving}
                  >
                    {isSaving ? (
                      <>{isGuest ? 'Saving Workout...' : 'Creating Workout...'}</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {isGuest ? 'Save Workout Locally' : 'Save New Workout'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Exercise Cards */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workout Cards</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tap a card to edit; drag the handle to reorder. Empty fields auto-hide.
                  </p>
                </CardHeader>
                <CardContent>
                  <WorkoutCardList
                    cards={cards}
                    onCardsChange={setCards}
                    amrapBlocks={amrapBlocks}
                    onAmrapBlocksChange={setAmrapBlocks}
                    emomBlocks={emomBlocks}
                    onEmomBlocksChange={setEmomBlocks}
                    showAddButton={true}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      {isAuthenticated && <MobileNav />}
    </>
  )
}
