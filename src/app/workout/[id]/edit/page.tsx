"use client"

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Timer,
  Sparkles,
} from "lucide-react";

import { useAuthStore } from "@/store";
import { Login } from "@/components/auth/login";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WorkoutCardList } from "@/components/workout/workout-card-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  EditableWorkoutState,
  normaliseWorkoutForEditing,
  type StoredWorkout,
  type DynamoDBWorkout,
} from "@/lib/workouts/types";
import {
  buildCardLayout,
  collapseCardsToExercises,
  detectRepetitionPattern,
  expandWorkoutToCards,
  normaliseCardLayout,
} from "@/lib/workout/card-transformer";
import type { WorkoutCard, AMRAPBlockDraft, EMOMBlockDraft } from "@/types/workout-card";
import { TIMER_TEMPLATES } from "@/timers";

type WorkoutSource = "dynamodb" | "local";

const createSnapshot = (
  meta: EditableWorkoutState["meta"],
  cards: WorkoutCard[],
  amrapBlocks: AMRAPBlockDraft[],
  emomBlocks: EMOMBlockDraft[],
  workoutType: string,
  workoutStructure: any
) =>
  JSON.stringify({
    meta: {
      title: meta.title,
      description: meta.description,
      timerConfig: meta.timerConfig,
    },
    workoutType,
    workoutStructure,
    amrapBlocks: amrapBlocks.map((block) => ({
      id: block.id,
      label: block.label,
      timeLimitSeconds: block.timeLimitSeconds,
      order: block.order,
    })),
    emomBlocks: emomBlocks.map((block) => ({
      id: block.id,
      label: block.label,
      intervalSeconds: block.intervalSeconds,
      order: block.order,
    })),
    cards: cards.map((card) =>
      card.type === "exercise"
        ? {
            id: card.id,
            type: card.type,
            name: card.name,
            sets: card.sets,
            reps: card.reps,
            weight: card.weight,
            distance: card.distance,
            time: card.time,
            timing: card.timing,
            restSeconds: card.restSeconds,
            notes: card.notes,
            amrapBlockId: card.amrapBlockId,
            emomBlockId: card.emomBlockId,
            originalExerciseId: card.originalExerciseId,
            setDetailId: card.setDetailId,
          }
        : {
            id: card.id,
            type: card.type,
            duration: card.duration,
            notes: card.notes,
          }
    ),
  });

const formatWorkoutDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

export default function EditWorkoutPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const [workoutMeta, setWorkoutMeta] = useState<EditableWorkoutState["meta"] | null>(null);
  const [cards, setCards] = useState<WorkoutCard[]>([]);
  const [amrapBlocks, setAmrapBlocks] = useState<AMRAPBlockDraft[]>([]);
  const [emomBlocks, setEmomBlocks] = useState<EMOMBlockDraft[]>([]);
  const [workoutType, setWorkoutType] = useState<string>("standard");
  const [workoutStructure, setWorkoutStructure] = useState<any>(null);
  const [source, setSource] = useState<WorkoutSource>("local");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const initialSnapshotRef = useRef<string>("");

  useEffect(() => {
    if (emomBlocks.length > 0 && workoutType !== "emom") {
      setWorkoutType("emom");
      return;
    }
    if (emomBlocks.length === 0 && amrapBlocks.length > 0 && workoutType !== "amrap") {
      setWorkoutType("amrap");
      return;
    }
    if (
      emomBlocks.length === 0 &&
      amrapBlocks.length === 0 &&
      (workoutType === "amrap" || workoutType === "emom")
    ) {
      setWorkoutType("standard");
    }
  }, [emomBlocks.length, amrapBlocks.length, workoutType]);

  useEffect(() => {
    const workoutId = params?.id as string | undefined;
    if (!workoutId) return;

    const loadWorkout = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        let workout: DynamoDBWorkout | StoredWorkout | null = null;
        if (user?.id) {
          const response = await fetch(`/api/workouts/${workoutId}`);
          if (response.ok) {
            const { workout: dbWorkout } = await response.json();
            if (dbWorkout) {
              workout = dbWorkout;
              setSource("dynamodb");
            }
          }
        }

        if (!workout) {
          const saved = JSON.parse(
            typeof window !== "undefined" ? localStorage.getItem("workouts") || "[]" : "[]"
          ) as StoredWorkout[];
          workout = saved.find((item) => item.id === workoutId) ?? null;
          setSource("local");
        }

        if (!workout) {
          setNotFound(true);
          setWorkoutMeta(null);
          setCards([]);
          setAmrapBlocks([]);
          setEmomBlocks([]);
          return;
        }

        const normalised = normaliseWorkoutForEditing(workout);
        setWorkoutMeta(normalised.meta);
        const hasEmomBlocks = (workout.emomBlocks?.length ?? 0) > 0;
        const hasAmrapBlocks = (workout.amrapBlocks?.length ?? 0) > 0;
        const fallbackAmrapByTimeLimit =
          Boolean(workout.structure?.timeLimit) &&
          (!workout.workoutType || workout.workoutType === "standard");
        const detectedWorkoutType =
          hasEmomBlocks || workout.workoutType === "emom"
            ? "emom"
            : hasAmrapBlocks || workout.workoutType === "amrap" || fallbackAmrapByTimeLimit
            ? "amrap"
            : workout.workoutType || "standard";
        const nextWorkoutStructure = workout.structure ?? null;
        const storedCardLayout =
          Array.isArray(nextWorkoutStructure?.cardLayout) && nextWorkoutStructure.cardLayout.length > 0
            ? normaliseCardLayout(nextWorkoutStructure.cardLayout)
            : null;
        setWorkoutType(detectedWorkoutType);
        setWorkoutStructure(nextWorkoutStructure);

        const mapExercise = (exercise: any) => ({
          id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
          name: exercise.name || "",
          sets: exercise.sets || 1,
          reps: exercise.reps || "",
          weight: exercise.weight || "",
          distance: exercise.distance || null,
          timing: exercise.timing || null,
          time: exercise.time || null,
          restSeconds:
            typeof exercise.restSeconds === "number"
              ? exercise.restSeconds
              : exercise.restSeconds
              ? Number(exercise.restSeconds)
              : null,
          notes: exercise.notes || "",
          setDetails: Array.isArray(exercise.setDetails) ? exercise.setDetails : null,
        });

        const exerciseData = Array.isArray(workout.exercises)
          ? workout.exercises.map(mapExercise)
          : [];

        let nextCards: WorkoutCard[] = [];
        let nextAmrapBlocks: AMRAPBlockDraft[] = [];
        let nextEmomBlocks: EMOMBlockDraft[] = [];

        if (detectedWorkoutType === "emom") {
          const defaultIntervalSeconds = Math.max(
            1,
            Math.floor(workout.structure?.timePerRound || 60)
          );
          if (Array.isArray(workout.emomBlocks) && workout.emomBlocks.length > 0) {
            const baseId = Date.now();
            workout.emomBlocks.forEach((block, index) => {
              const blockId = block.id || `emom-${baseId}-${index}`;
              nextEmomBlocks.push({
                id: blockId,
                label: block.label || "EMOM",
                intervalSeconds: block.intervalSeconds || defaultIntervalSeconds,
                order: block.order || index + 1,
              });

              const blockExercises = (block.exercises || []).map(mapExercise);
              nextCards.push(
                ...expandWorkoutToCards(blockExercises, undefined, {
                  emomBlockId: blockId,
                })
              );
            });
          } else {
            const blockId = `emom-${Date.now()}`;
            nextEmomBlocks = [
              {
                id: blockId,
                label: "EMOM",
                intervalSeconds: defaultIntervalSeconds,
                order: 1,
              },
            ];
            nextCards = expandWorkoutToCards(exerciseData, undefined, {
              emomBlockId: blockId,
            });
          }
        } else if (detectedWorkoutType === "amrap") {
          if (Array.isArray(workout.amrapBlocks) && workout.amrapBlocks.length > 0) {
            const baseId = Date.now();
            workout.amrapBlocks.forEach((block, index) => {
              const blockId = block.id || `amrap-${baseId}-${index}`;
              nextAmrapBlocks.push({
                id: blockId,
                label: block.label || "AMRAP",
                timeLimitSeconds: block.timeLimit || 720,
                order: block.order || index + 1,
              });

              const blockExercises = (block.exercises || []).map(mapExercise);
              nextCards.push(
                ...expandWorkoutToCards(blockExercises, undefined, {
                  amrapBlockId: blockId,
                })
              );
            });
          } else {
            const timeLimitSeconds = workout.structure?.timeLimit || 720;
            const blockId = `amrap-${Date.now()}`;
            nextAmrapBlocks = [
              {
                id: blockId,
                label: "AMRAP",
                timeLimitSeconds,
                order: 1,
              },
            ];
            nextCards = expandWorkoutToCards(exerciseData, undefined, {
              amrapBlockId: blockId,
            });
          }
        } else {
          let repetition = detectRepetitionPattern(exerciseData, detectedWorkoutType);
          if (detectedWorkoutType === "rounds" && workout.structure?.rounds) {
            repetition = {
              rounds: workout.structure.rounds,
              pattern: "circuit" as const,
              restBetweenExercises: false,
              restBetweenRounds: true,
              defaultRestDuration: 60,
            };
          }

          nextCards = expandWorkoutToCards(exerciseData, repetition);
          nextAmrapBlocks = [];
          nextEmomBlocks = [];
        }

        if (storedCardLayout) {
          nextCards = storedCardLayout;
        }

        if (detectedWorkoutType === "amrap" && nextAmrapBlocks.length > 0) {
          const validBlockIds = new Set(
            nextAmrapBlocks.map((block) => String(block.id))
          );
          const fallbackBlockId = String(nextAmrapBlocks[0].id);
          const hasValidAssignments = nextCards.some(
            (card) =>
              card.type === "exercise" &&
              card.amrapBlockId &&
              validBlockIds.has(String(card.amrapBlockId))
          );

          nextCards = nextCards.map((card) => {
            if (card.type !== "exercise") return card;
            if (
              hasValidAssignments &&
              card.amrapBlockId &&
              validBlockIds.has(String(card.amrapBlockId))
            ) {
              return card;
            }
            return { ...card, amrapBlockId: fallbackBlockId, emomBlockId: null };
          });
        }

        if (detectedWorkoutType === "emom" && nextEmomBlocks.length > 0) {
          const validBlockIds = new Set(
            nextEmomBlocks.map((block) => String(block.id))
          );
          const fallbackBlockId = String(nextEmomBlocks[0].id);
          const hasValidAssignments = nextCards.some(
            (card) =>
              card.type === "exercise" &&
              card.emomBlockId &&
              validBlockIds.has(String(card.emomBlockId))
          );

          nextCards = nextCards.map((card) => {
            if (card.type !== "exercise") return card;
            if (
              hasValidAssignments &&
              card.emomBlockId &&
              validBlockIds.has(String(card.emomBlockId))
            ) {
              return card;
            }
            return { ...card, emomBlockId: fallbackBlockId, amrapBlockId: null };
          });
        }

        setCards(nextCards);
        setAmrapBlocks(nextAmrapBlocks);
        setEmomBlocks(nextEmomBlocks);
        initialSnapshotRef.current = createSnapshot(
          normalised.meta,
          nextCards,
          nextAmrapBlocks,
          nextEmomBlocks,
          detectedWorkoutType,
          nextWorkoutStructure
        );
      } catch (error) {
        console.error("Error loading workout:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void loadWorkout();
  }, [params?.id, user?.id]);

  const isDirty = useMemo(() => {
    if (!workoutMeta) return false;
    const currentSnapshot = createSnapshot(
      workoutMeta,
      cards,
      amrapBlocks,
      emomBlocks,
      workoutType,
      workoutStructure
    );
    return currentSnapshot !== initialSnapshotRef.current;
  }, [workoutMeta, cards, amrapBlocks, emomBlocks, workoutType, workoutStructure]);

  const clearError = (key: string) => {
    setValidationErrors((prev) => {
      if (!prev[key]) return prev;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!workoutMeta?.title.trim()) {
      errors["meta-title"] = "Workout name is required.";
    }
    return errors;
  };

  const updateLocalCache = (payload: StoredWorkout) => {
    if (typeof window === "undefined") return;
    const existing = JSON.parse(localStorage.getItem("workouts") || "[]") as StoredWorkout[];
    const index = existing.findIndex((item) => item.id === payload.id);
    if (index >= 0) {
      existing[index] = payload;
    } else {
      existing.push(payload);
    }
    localStorage.setItem("workouts", JSON.stringify(existing));
  };

  const removeFromLocalCache = (workoutId: string) => {
    if (typeof window === "undefined") return;
    const existing = JSON.parse(localStorage.getItem("workouts") || "[]") as StoredWorkout[];
    const filtered = existing.filter((item) => item.id !== workoutId);
    localStorage.setItem("workouts", JSON.stringify(filtered));
  };

  const handleSave = async () => {
    if (!workoutMeta || saving) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const exercisePayload = collapseCardsToExercises(cards);
      const cardLayout = buildCardLayout(cards);
      const resolvedWorkoutType =
        emomBlocks.length > 0
          ? "emom"
          : amrapBlocks.length > 0
          ? "amrap"
          : workoutType === "amrap" || workoutType === "emom"
          ? "standard"
          : workoutType;
      const resolvedWorkoutTypeValue =
        resolvedWorkoutType as Exclude<DynamoDBWorkout["workoutType"], undefined>;
      const amrapBlocksPayload = amrapBlocks.length
        ? amrapBlocks.map((block) => ({
            id: block.id,
            label: block.label,
            timeLimit: block.timeLimitSeconds,
            order: block.order,
            exercises: collapseCardsToExercises(
              cards.filter(
                (card) => card.type === "exercise" && card.amrapBlockId === block.id
              )
            ),
          }))
        : null;
      const emomBlocksPayload = emomBlocks.length
        ? emomBlocks.map((block) => ({
            id: block.id,
            label: block.label,
            intervalSeconds: block.intervalSeconds,
            order: block.order,
            exercises: collapseCardsToExercises(
              cards.filter(
                (card) => card.type === "exercise" && card.emomBlockId === block.id
              )
            ),
          }))
        : null;
      const emomStructure =
        emomBlocks.length > 0
          ? {
              rounds: emomBlocks.length,
              timePerRound: emomBlocks[0].intervalSeconds,
              totalTime: emomBlocks.reduce((sum, block) => sum + block.intervalSeconds, 0),
            }
          : null;
      const structure =
        resolvedWorkoutType === "amrap"
          ? amrapBlocks.length === 1
            ? { timeLimit: amrapBlocks[0].timeLimitSeconds }
            : null
          : resolvedWorkoutType === "emom"
          ? workoutStructure ?? emomStructure
          : workoutStructure;
      const structureWithLayout = { ...(structure ?? {}), cardLayout };

      if (user?.id) {
        const response = await fetch(`/api/workouts/${workoutMeta.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: workoutMeta.title.trim(),
            description: workoutMeta.description ?? null,
            exercises: exercisePayload,
            totalDuration: workoutMeta.totalDuration,
            difficulty: workoutMeta.difficulty,
            tags: workoutMeta.tags,
            workoutType: resolvedWorkoutTypeValue,
            structure: structureWithLayout,
            amrapBlocks: amrapBlocksPayload,
            emomBlocks: emomBlocksPayload,
            timerConfig: workoutMeta.timerConfig ?? null,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to save workout');
        }
        setSource("dynamodb");
      }

      const localPayload: StoredWorkout = {
        id: workoutMeta.id,
        title: workoutMeta.title.trim(),
        description: workoutMeta.description ?? null,
        exercises: exercisePayload,
        content: workoutMeta.content,
        author: workoutMeta.author ?? null,
        createdAt: workoutMeta.createdAt,
        updatedAt: new Date().toISOString(),
        source: workoutMeta.source,
        type: workoutMeta.type,
        totalDuration: workoutMeta.totalDuration,
        difficulty: workoutMeta.difficulty,
        tags: workoutMeta.tags,
        llmData: workoutMeta.llmData,
        imageUrls: workoutMeta.imageUrls,
        thumbnailUrl: workoutMeta.thumbnailUrl ?? null,
        scheduledDate: workoutMeta.scheduledDate ?? null,
        status: workoutMeta.status ?? null,
        completedDate: workoutMeta.completedDate ?? null,
        timerConfig: workoutMeta.timerConfig ?? null,
        workoutType: resolvedWorkoutTypeValue,
        structure: structureWithLayout,
        amrapBlocks: amrapBlocksPayload,
        emomBlocks: emomBlocksPayload,
      };
      updateLocalCache(localPayload);

      setWorkoutStructure(structureWithLayout);
      initialSnapshotRef.current = createSnapshot(
        workoutMeta,
        cards,
        amrapBlocks,
        emomBlocks,
        resolvedWorkoutTypeValue,
        structureWithLayout
      );
      setValidationErrors({});
      window.dispatchEvent(new Event("workoutsUpdated"));
      router.push(`/workout/${workoutMeta.id}`);
    } catch (error) {
      console.error("Failed to save workout:", error);
      alert("Failed to save workout changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workoutMeta) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this workout? This action cannot be undone."
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      if (user?.id) {
        const response = await fetch(`/api/workouts/${workoutMeta.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete workout');
        }
      }
      removeFromLocalCache(workoutMeta.id);
      window.dispatchEvent(new Event("workoutsUpdated"));
      router.push("/library");
    } catch (error) {
      console.error("Failed to delete workout:", error);
      alert("Failed to delete workout. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </main>
      </>
    );
  }

  if (notFound || !workoutMeta) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-black py-20">
          <div className="mx-auto max-w-2xl px-4 text-center text-white">
            <h2 className="mb-2 text-2xl font-bold">Workout not found</h2>
            <p className="mb-6 text-white/60">
              The workout you&apos;re trying to edit could not be located. It may have been removed.
            </p>
            <Link href="/library">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Library
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-40 text-white">
        <div className="mx-auto w-full max-w-2xl px-4 pt-8">
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-white">
              Edit Existing Workout
            </h1>
            <p className="text-sm text-white/60 mt-1">
              Update your workout details and exercises
            </p>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/workout/${workoutMeta.id}`)}
              className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.45em] text-white/40">
                {formatWorkoutDate(workoutMeta.createdAt)}
              </p>
              <p className="mt-1 text-sm text-white/50">
                {source === "dynamodb" ? "Synced workout" : "Local workout"}
              </p>
            </div>

            <div className="h-10 w-10" aria-hidden="true" />
          </div>

          <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-800/80 p-5 shadow-lg">
            <label className="mb-2 block text-xs uppercase tracking-wider text-slate-400">
              Workout Name
            </label>
            <Input
              value={workoutMeta.title}
              onChange={(event) => {
                setWorkoutMeta((prev) => (prev ? { ...prev, title: event.target.value } : prev));
                clearError("meta-title");
              }}
              placeholder="Give this workout a name"
              className={cn(
                "border-slate-600 bg-slate-900/80 text-lg font-semibold text-white placeholder:text-slate-400 focus:border-primary focus:ring-0",
                validationErrors["meta-title"] && "border-red-500 focus:border-red-500"
              )}
            />
            {validationErrors["meta-title"] && (
              <p className="mt-2 text-xs text-red-400">{validationErrors["meta-title"]}</p>
            )}

            <label className="mt-5 block text-xs uppercase tracking-wider text-slate-400">
              Description
            </label>
            <Textarea
              value={workoutMeta.description ?? ""}
              onChange={(event) =>
                setWorkoutMeta((prev) =>
                  prev ? { ...prev, description: event.target.value } : prev
                )
              }
              placeholder="Optional notes about this workout..."
              rows={3}
              className="resize-none border-slate-600 bg-slate-900/80 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:ring-0"
            />

            {/* Timer Configuration */}
            <div className="mt-5 border-t border-slate-700/50 pt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5" />
                  Workout Timer
                </label>
                {workoutMeta.timerConfig?.aiGenerated && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI-Suggested
                  </Badge>
                )}
              </div>

              <Select
                value={workoutMeta.timerConfig ? "custom" : "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setWorkoutMeta((prev) => prev ? { ...prev, timerConfig: null } : prev);
                  } else if (value !== "custom") {
                    // Find the template and set its params
                    const template = TIMER_TEMPLATES.find((t) => t.id === value);
                    if (template) {
                      setWorkoutMeta((prev) =>
                        prev
                          ? {
                              ...prev,
                              timerConfig: {
                                params: template.defaultParams,
                                aiGenerated: false,
                              },
                            }
                          : prev
                      );
                    }
                  }
                }}
              >
                <SelectTrigger className="border-slate-600 bg-slate-900/80 text-white focus:border-primary focus:ring-0">
                  <SelectValue placeholder="No timer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No timer</SelectItem>
                  {workoutMeta.timerConfig && (
                    <SelectItem value="custom">
                      {workoutMeta.timerConfig.aiGenerated ? "AI-Suggested Timer" : "Custom Timer"}
                    </SelectItem>
                  )}
                  {TIMER_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {workoutMeta.timerConfig?.reason && (
                <p className="mt-2 text-xs text-slate-400 italic">
                  {workoutMeta.timerConfig.reason}
                </p>
              )}

              {workoutMeta.timerConfig && (
                <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-400 mb-2">Timer Details:</p>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(workoutMeta.timerConfig.params, null, 2)}
                  </pre>
                  {!workoutMeta.timerConfig.aiGenerated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWorkoutMeta((prev) => prev ? { ...prev, timerConfig: null } : prev)}
                      className="mt-2 w-full text-xs text-slate-400 hover:text-red-400"
                    >
                      Remove Timer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <Card className="mb-6">
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

          <div className="mt-10">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={saving}
              className="w-full rounded-full border-red-500/20 bg-transparent text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Workout
            </Button>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-3xl px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6">
        <Button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="h-14 w-full rounded-full bg-primary text-lg font-semibold shadow-lg shadow-primary/40 transition disabled:bg-white/20 disabled:text-white/40"
        >
          {saving ? (
            <span className="flex items-center gap-2 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Changes
            </span>
          )}
        </Button>
      </div>
      <MobileNav />
    </>
  );
}
