"use client";

/**
 * Workout Timer Execution Page
 *
 * Full-screen timer execution for workouts.
 * Handles timer configuration, execution, and completion saving.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { TimerExecutionView } from '@/components/timer/timer-execution-view';
import { TimerConfigurationPanel } from '@/components/timer/timer-configuration-panel';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Settings } from 'lucide-react';
import type { TimerParams } from '@/timers';
import type { TimerSessionResults } from '@/types/timer-session';
import type { Exercise } from '@/components/timer/timer-exercise-display';

// ============================================================================
// Types
// ============================================================================

interface Workout {
  id: string;
  userId: string;
  title: string;
  description?: string;
  workoutType?: string;
  exercises: Exercise[];
  timerConfig?: {
    params: TimerParams;
    aiGenerated?: boolean;
    reason?: string;
  };
  createdAt: string;
}

// ============================================================================
// Component
// ============================================================================

export default function WorkoutTimerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const workoutId = params.id as string;
  const timerTypeFromUrl = searchParams.get('type');

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [timerParams, setTimerParams] = useState<TimerParams | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Fetch workout data
  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        const response = await fetch(`/api/workouts/${workoutId}`);

        if (!response.ok) {
          throw new Error('Failed to load workout');
        }

        const data = await response.json();
        setWorkout(data.workout);

        // Check if workout has existing timer config
        if (data.workout.timerConfig?.params) {
          setTimerParams(data.workout.timerConfig.params);
          setIsConfigured(true);
        } else if (timerTypeFromUrl) {
          // Show configuration panel if timer type specified but not configured
          setShowConfig(true);
        }
      } catch (err) {
        console.error('Failed to fetch workout:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workout');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkout();
  }, [workoutId, timerTypeFromUrl]);

  // Handle timer completion and save to workout history
  const handleComplete = useCallback(
    async (results: TimerSessionResults) => {
      try {
        // Save workout completion to history
        const response = await fetch('/api/workouts/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workoutId,
            completedAt: results.completedAt,
            durationMs: results.totalElapsedMs,
            notes: results.notes,
            timerResults: {
              timerType: timerParams?.kind,
              roundsCompleted: results.totalRoundsCompleted,
              exercisesCompleted: results.exercisesCompleted,
              blocksCompleted: results.blocksCompleted,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save workout completion');
        }

        // Navigate to calendar after save
        router.push('/calendar');
      } catch (err) {
        console.error('Failed to save completion:', err);
        throw err;
      }
    },
    [workoutId, timerParams, router]
  );

  // Handle end workout early
  const handleEnd = useCallback(() => {
    router.push(`/workout/${workoutId}`);
  }, [workoutId, router]);

  // Handle timer configuration
  const handleTimerConfigured = useCallback((params: TimerParams) => {
    setTimerParams(params);
    setIsConfigured(true);
    setShowConfig(false);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workout...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !workout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertDescription>
              {error || 'Workout not found'}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => router.push('/calendar')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calendar
          </Button>
        </div>
      </div>
    );
  }

  // Configuration state
  if (showConfig || !isConfigured || !timerParams) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-2xl mx-auto py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push(`/workout/${workoutId}`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workout
            </Button>
            <h1 className="text-2xl font-bold mb-2">{workout.title}</h1>
            <p className="text-muted-foreground">
              Configure your timer before starting
            </p>
          </div>

          <TimerConfigurationPanel
            timerType={timerTypeFromUrl as any || workout.timerConfig?.params?.kind || 'AMRAP'}
            initialParams={workout.timerConfig?.params}
            onParamsChange={(params) => setTimerParams(params)}
            onStart={() => handleTimerConfigured(timerParams!)}
            showStartButton={true}
            exercises={workout.exercises}
          />
        </div>
      </div>
    );
  }

  // Timer execution state
  return (
    <TimerExecutionView
      workoutId={workoutId}
      workoutTitle={workout.title}
      timerParams={timerParams}
      exercises={workout.exercises}
      onComplete={handleComplete}
      onEnd={handleEnd}
    />
  );
}
