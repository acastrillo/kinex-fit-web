"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EnhanceWithAIButton } from "@/components/ai/enhance-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Clock,
  Target,
  User,
  ExternalLink,
  Edit,
  Play,
  AlertCircle,
  Loader2,
  Trash2
} from "lucide-react"
import { formatTime as formatAmrapTime } from "@/lib/amrap-migration"

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string | number
  weight?: string | null
  restSeconds?: number | null
  notes?: string | null
  setDetails?: Array<{
    id?: string | null
    reps?: string | number | null
    weight?: string | number | null
  }> | null
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
  emomBlocks?: Array<{
    id: string
    label: string
    intervalSeconds: number
    order: number
    exercises: Exercise[]
  }>
  content: string
  author?: any
  createdAt: string
  updatedAt?: string
  source: string
  type: string
  totalDuration: number
  difficulty: string
  tags: string[]
  aiEnhanced?: boolean
  workoutType?: 'standard' | 'emom' | 'amrap' | 'rounds' | 'ladder' | 'tabata'
  structure?: {
    rounds?: number
    timePerRound?: number
    timeLimit?: number
    totalTime?: number
    pattern?: string
  }
  timerConfig?: {
    params: any
    aiGenerated?: boolean
    reason?: string
  }
}

const getAmrapTotalSeconds = (workout: Workout) => {
  if (workout.amrapBlocks && workout.amrapBlocks.length > 0) {
    return workout.amrapBlocks.reduce(
      (sum, block) => sum + (block.timeLimit || 0),
      0
    )
  }
  return workout.structure?.timeLimit || 0
}

export default function WorkoutViewPage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const workoutId = params?.id as string
    if (workoutId && user?.id) {
      loadWorkout(workoutId)
    }
  }, [params?.id, user?.id])

  const loadWorkout = async (workoutId: string) => {
    setLoading(true)
    try {
      // Load from API (which calls DynamoDB on the server)
      const response = await fetch(`/api/workouts/${workoutId}`)

      if (response.ok) {
        const { workout: dbWorkout } = await response.json()

        // Transform DynamoDB workout to display format
        const transformedWorkout: Workout = {
          id: dbWorkout.workoutId,
          title: dbWorkout.title,
          description: dbWorkout.description || '',
          exercises: dbWorkout.exercises || [],
          amrapBlocks: dbWorkout.amrapBlocks || [],
          emomBlocks: dbWorkout.emomBlocks || [],
          content: dbWorkout.content || '',
          author: dbWorkout.author,
          createdAt: dbWorkout.createdAt,
          updatedAt: dbWorkout.updatedAt,
          source: dbWorkout.source || '',
          type: dbWorkout.type || 'manual',
          totalDuration: dbWorkout.totalDuration || 0,
          difficulty: dbWorkout.difficulty || 'medium',
          tags: dbWorkout.tags || [],
          aiEnhanced: dbWorkout.aiEnhanced,
          workoutType: dbWorkout.workoutType,
          structure: dbWorkout.structure,
          timerConfig: dbWorkout.timerConfig,
        }
        setWorkout(transformedWorkout)
      } else {
        // Fallback to localStorage if API fails
        const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        const found = workouts.find((w: Workout) => w.id === workoutId)
        setWorkout(found || null)
      }
    } catch (error) {
      console.error('Error loading workout:', error)
      // Fallback to localStorage on error
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const found = workouts.find((w: Workout) => w.id === workoutId)
      setWorkout(found || null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!workout || !user?.id) return

    setIsDeleting(true)
    try {
      // Delete from API (DynamoDB)
      const response = await fetch(`/api/workouts/${workout.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete workout from server')
      }

      // Delete from localStorage
      const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
      const updatedWorkouts = workouts.filter((w: Workout) => w.id !== workout.id)
      localStorage.setItem('workouts', JSON.stringify(updatedWorkouts))

      // Trigger refresh event for lists
      window.dispatchEvent(new Event('workoutsUpdated'))

      // Navigate to library
      router.push('/library')
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete workout. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (!isAuthenticated) {
    return <Login />
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-text-secondary">Loading workout...</p>
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
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Workout Not Found
            </h2>
            <p className="text-text-secondary mb-4">
              The workout you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
            <Button onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </main>
      </>
    )
  }

  const amrapTotalSeconds =
    workout.workoutType === 'amrap' ? getAmrapTotalSeconds(workout) : 0
  const amrapMinutes = amrapTotalSeconds ? Math.floor(amrapTotalSeconds / 60) : 0
  const amrapBlockCount = workout.amrapBlocks?.length || 0
  const orderedAmrapBlocks = workout.amrapBlocks
    ? [...workout.amrapBlocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : []
  const hasAmrapBlocks = workout.workoutType === 'amrap' && orderedAmrapBlocks.length > 0
  const totalAmrapExercises = orderedAmrapBlocks.reduce(
    (sum, block) => sum + (block.exercises?.length || 0),
    0
  )
  const normalizeName = (value?: string) => (value || "").trim().toLowerCase()
  const blockExerciseIds = new Set<string>()
  const blockExerciseNames = new Set<string>()
  orderedAmrapBlocks.forEach((block) => {
    block.exercises?.forEach((exercise) => {
      if (exercise.id) blockExerciseIds.add(exercise.id)
      if (exercise.name) blockExerciseNames.add(normalizeName(exercise.name))
    })
  })
  const ungroupedExercises = hasAmrapBlocks
    ? workout.exercises.filter(
        (exercise) =>
          !blockExerciseIds.has(exercise.id) &&
          !blockExerciseNames.has(normalizeName(exercise.name))
      )
    : []

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const renderExerciseCard = (exercise: Exercise, index: number, key?: string) => {
    const setDetails =
      Array.isArray(exercise.setDetails) && exercise.setDetails.length > 0
        ? exercise.setDetails
        : null

    return (
      <div
        key={key ?? exercise.id ?? `${index}-${exercise.name}`}
        className="rounded-lg border border-border bg-surface p-4 md:flex md:items-start md:justify-between"
      >
        <div className="flex items-start space-x-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </div>
          <div>
            <h3 className="font-medium text-text-primary capitalize">
              {exercise.name}
            </h3>
            {exercise.notes && (
              <p className="mt-1 text-xs text-text-secondary">{exercise.notes}</p>
            )}
            {setDetails && (
              <div className="mt-3 space-y-2 rounded-lg bg-background/60 p-3 text-xs text-text-secondary">
                {setDetails.map((detail, detailIdx) => (
                  <div
                    key={detail?.id ?? `${exercise.id}-${detailIdx}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="uppercase tracking-wide text-[10px] text-text-secondary/70">
                      Set {detailIdx + 1}
                    </span>
                    <div className="flex items-center gap-4 text-sm text-text-primary">
                      <span>{detail?.reps || exercise.reps || "-"} reps</span>
                      <span className="text-text-secondary">
                        {detail?.weight || exercise.weight || "Bodyweight"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {exercise.restSeconds && exercise.restSeconds > 0 && (
              <p className="mt-2 text-xs text-text-secondary">
                Rest {exercise.restSeconds}s between sets
              </p>
            )}
          </div>
        </div>

        {!setDetails && (
          <div className="mt-4 flex items-center space-x-6 text-sm text-text-secondary md:mt-0">
            {exercise.sets > 1 && (
              <div className="text-center">
                <div className="font-medium text-text-primary">{exercise.sets}</div>
                <div className="text-xs">sets</div>
              </div>
            )}

            {exercise.reps && (
              <div className="text-center">
                <div className="font-medium text-text-primary">{exercise.reps}</div>
                <div className="text-xs">reps</div>
              </div>
            )}

            {exercise.weight && (
              <div className="text-center">
                <div className="font-medium text-text-primary">{exercise.weight}</div>
                <div className="text-xs">weight</div>
              </div>
            )}

            {exercise.restSeconds && exercise.restSeconds > 0 && (
              <div className="text-center">
                <div className="font-medium text-text-primary">
                  {exercise.restSeconds}s
                </div>
                <div className="text-xs">rest</div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            {/* Back button and title */}
            <div className="flex items-start gap-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex-shrink-0 mt-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-text-primary break-words">
                  {workout.title}
                </h1>
                <p className="text-sm text-text-secondary break-words">
                  {workout.description}
                </p>
                {workout.workoutType === 'amrap' && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-500">
                      AMRAP{amrapBlockCount > 1 ? ` ${amrapBlockCount} blocks` : ""}{amrapMinutes ? ` · ${amrapMinutes} min` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons - responsive grid layout */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mb-4">
              <EnhanceWithAIButton
                workoutId={workout.id}
                onEnhanced={() => loadWorkout(workout.id)}
                variant="outline"
                size="sm"
                aiEnhanced={workout.aiEnhanced}
                className="w-full md:w-auto"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Navigate to card view
                  const workoutForEdit = {
                    id: workout.id,
                    title: workout.title,
                    content: workout.content,
                    llmData: {
                      exercises: workout.exercises,
                      workoutType: workout.workoutType,
                      structure: workout.structure,
                      amrapBlocks: workout.amrapBlocks,
                      emomBlocks: workout.emomBlocks,
                    },
                    createdAt: workout.createdAt,
                    source: workout.source,
                    type: workout.type,
                  }
                  sessionStorage.setItem('workoutToEdit', JSON.stringify(workoutForEdit))
                  router.push('/add/edit')
                }}
                className="w-full md:w-auto"
              >
                <Play className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">View Cards</span>
              </Button>
              <Link href={`/workout/${workout.id}/edit`} className="w-full md:w-auto">
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="h-4 w-4 md:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full md:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>

            {/* Workout Meta */}
            {workout.workoutType === 'amrap' ? (
              <div className="mb-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-sm text-text-secondary">Workout Type</div>
                    <div className="text-lg font-bold text-amber-500">
                      {amrapBlockCount > 1
                        ? `AMRAP ${amrapBlockCount} Blocks${amrapMinutes ? ` · ${amrapMinutes} Minutes` : ""}`
                        : `AMRAP${amrapMinutes ? ` - ${amrapMinutes} Minutes` : ""}`}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-text-secondary">
                  Complete as many rounds as possible in the time limit. Rest as needed.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center space-x-1 text-text-secondary">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{formatDuration(workout.totalDuration)}</span>
                </div>

                <div className="flex items-center space-x-1 text-text-secondary">
                  <Target className="h-4 w-4" />
                  <span className="text-sm capitalize">{workout.difficulty}</span>
                </div>

                {workout.author && (
                  <div className="flex items-center space-x-1 text-text-secondary">
                    <User className="h-4 w-4" />
                    <span className="text-sm">@{workout.author.username}</span>
                  </div>
                )}

              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => router.push(`/workout/${workout.id}/session`)}
                className="w-full md:w-auto flex items-center justify-center gap-2"
                size="lg"
              >
                <Play className="h-5 w-5" />
                <span>Start Workout</span>
              </Button>
            </div>

          </div>

          {/* AMRAP Instructions */}
          {workout.workoutType === 'amrap' && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-400">
                  <strong>AMRAP Format:</strong> Perform exercises in order, repeating as many times as possible. Track rounds in completion notes.
                </p>
              </div>
            </div>
          )}

          {/* Exercises */}
          <Card>
            <CardHeader>
              <CardTitle>
                {hasAmrapBlocks
                  ? `AMRAP Blocks (${orderedAmrapBlocks.length})${
                      totalAmrapExercises ? ` · ${totalAmrapExercises} movements` : ""
                    }`
                  : workout.workoutType === 'amrap'
                  ? `Exercise Circuit (${workout.exercises.length} movements)`
                  : `Exercises (${workout.exercises.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasAmrapBlocks ? (
                <div className="space-y-4">
                  {orderedAmrapBlocks.map((block, blockIdx) => {
                    const blockLabel = (block.label || "AMRAP").trim() || "AMRAP"
                    const useIndex =
                      orderedAmrapBlocks.length > 1 && blockLabel.toLowerCase() === "amrap"
                    const badgeLabel = useIndex ? `AMRAP ${blockIdx + 1}` : blockLabel
                    const blockExercises = block.exercises || []

                    return (
                      <div
                        key={block.id}
                        className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="border-blue-400/40 bg-blue-500/20 text-blue-100">
                              {badgeLabel}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm font-semibold text-blue-100/80">
                              <Clock className="h-4 w-4" />
                              {formatAmrapTime(block.timeLimit)}
                            </div>
                          </div>
                          <span className="text-xs text-blue-100/60">
                            {blockExercises.length} move{blockExercises.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {blockExercises.length > 0 ? (
                            blockExercises.map((exercise, idx) =>
                              renderExerciseCard(exercise, idx, `${block.id}-${exercise.id ?? idx}`)
                            )
                          ) : (
                            <p className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-100/70">
                              No moves in this block yet.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {ungroupedExercises.length > 0 && (
                    <div className="rounded-2xl border border-border bg-background/40 p-4">
                      <div className="mb-3 text-sm font-semibold text-text-secondary">
                        Moves outside AMRAP blocks
                      </div>
                      <div className="space-y-3">
                        {ungroupedExercises.map((exercise, idx) =>
                          renderExerciseCard(exercise, idx, `ungrouped-${exercise.id ?? idx}`)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {workout.exercises.map((exercise, idx) => renderExerciseCard(exercise, idx))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Source Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-text-secondary mb-1">Imported from</div>
                  <div className="text-text-primary">
                    {workout.type === 'url' ? 'Instagram' : workout.type === 'manual' ? 'Manual Entry' : 'Image Upload'}
                  </div>
                </div>
                
                <div>
                  <div className="text-text-secondary mb-1">Created</div>
                  <div className="text-text-primary">
                    {new Date(workout.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {workout.source !== 'manual' && (
                  <div className="md:col-span-2">
                    <div className="text-text-secondary mb-1">Source URL</div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={workout.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-primary text-xs font-mono truncate hover:text-primary transition-colors flex-1 min-w-0"
                        title={workout.source}
                      >
                        {workout.source}
                      </a>
                      <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                        <a href={workout.source} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workout?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{workout.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Workout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
