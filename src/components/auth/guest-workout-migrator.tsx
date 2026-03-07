"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store";
import { trackEvent } from "@/lib/analytics";

interface LocalWorkout {
  id?: string;
  title?: string;
  description?: string;
  exercises?: unknown[];
  content?: string;
  author?: unknown;
  source?: string;
  type?: string;
  totalDuration?: number;
  difficulty?: string;
  tags?: string[];
  llmData?: unknown;
  workoutType?: string;
  structure?: unknown;
  amrapBlocks?: unknown;
  emomBlocks?: unknown;
  aiEnhanced?: boolean;
  aiNotes?: string[] | null;
  thumbnailUrl?: string | null;
  guestLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const MIGRATION_STORAGE_KEY = "kinex_guest_migration_v1";

function readLocalWorkouts(): LocalWorkout[] {
  try {
    return JSON.parse(localStorage.getItem("workouts") || "[]");
  } catch {
    return [];
  }
}

function writeLocalWorkouts(workouts: LocalWorkout[]) {
  localStorage.setItem("workouts", JSON.stringify(workouts));
  window.dispatchEvent(new Event("workoutsUpdated"));
}

export function GuestWorkoutMigrator() {
  const { isAuthenticated, user } = useAuthStore();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || hasRunRef.current) {
      return;
    }

    hasRunRef.current = true;

    const migrationState = sessionStorage.getItem(MIGRATION_STORAGE_KEY);
    if (migrationState === "done") {
      return;
    }

    const migrateGuestWorkouts = async () => {
      const workouts = readLocalWorkouts();
      const guestWorkouts = workouts.filter((workout) => workout.guestLocked);

      if (guestWorkouts.length === 0) {
        sessionStorage.setItem(MIGRATION_STORAGE_KEY, "done");
        return;
      }

      let migratedCount = 0;
      const migratedIds = new Set<string>();

      for (const workout of guestWorkouts) {
        if (!workout.id || !workout.title || !Array.isArray(workout.exercises) || !workout.content) {
          continue;
        }

        const response = await fetch("/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workoutId: workout.id,
            title: workout.title,
            description: workout.description || "",
            exercises: workout.exercises,
            content: workout.content,
            author: workout.author || null,
            source: workout.source || "guest-migration",
            type: workout.type || "manual",
            totalDuration: workout.totalDuration || 30,
            difficulty: workout.difficulty || "moderate",
            tags: workout.tags || [],
            llmData: workout.llmData || null,
            workoutType: workout.workoutType || "standard",
            structure: workout.structure || null,
            amrapBlocks: workout.amrapBlocks || null,
            emomBlocks: workout.emomBlocks || null,
            aiEnhanced: workout.aiEnhanced || false,
            aiNotes: workout.aiNotes || null,
            thumbnailUrl: workout.thumbnailUrl || null,
          }),
        });

        if (response.ok) {
          migratedCount += 1;
          migratedIds.add(workout.id);
        }
      }

      if (migratedCount > 0) {
        const remaining = workouts.filter(
          (workout) => !workout.guestLocked || !workout.id || !migratedIds.has(workout.id)
        );
        writeLocalWorkouts(remaining);
        trackEvent("guest_workouts_migrated", {
          count: migratedCount,
        });
      }

      if (readLocalWorkouts().every((workout) => !workout.guestLocked)) {
        sessionStorage.setItem(MIGRATION_STORAGE_KEY, "done");
      }
    };

    void migrateGuestWorkouts();
  }, [isAuthenticated, user?.id]);

  return null;
}
