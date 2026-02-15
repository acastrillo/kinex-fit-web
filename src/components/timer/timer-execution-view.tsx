"use client";

/**
 * Timer Execution View
 *
 * Main unified timer execution component that displays the timer,
 * current exercise, controls, and handles completion.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { TimerDisplay } from './timer-display';
import { TimerControls } from './timer-controls';
import { TimerExerciseDisplay, type Exercise } from './timer-exercise-display';
import { TimerCompletionDialog } from './timer-completion-dialog';
import { TimerBlockNavigator } from './timer-block-navigator';
import { useWorkoutTimer } from './hooks/useWorkoutTimer';
import type { TimerParams } from '@/timers';
import type { TimerSessionResults } from '@/types/timer-session';
import { isStackedParams } from '@/types/timer-session';

// ============================================================================
// Types
// ============================================================================

export interface TimerExecutionViewProps {
  workoutId: string;
  workoutTitle: string;
  timerParams: TimerParams;
  exercises?: Exercise[];
  onComplete?: (results: TimerSessionResults) => Promise<void>;
  onEnd?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TimerExecutionView({
  workoutId,
  workoutTitle,
  timerParams,
  exercises = [],
  onComplete,
  onEnd,
  className,
}: TimerExecutionViewProps) {
  const router = useRouter();
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionResults, setCompletionResults] = useState<TimerSessionResults | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Timer hook
  const timer = useWorkoutTimer({
    workoutId,
    workoutTitle,
    timerParams,
    enableSound: true,
    countdownBeforeStart: 3,
    onComplete: (results) => {
      setCompletionResults(results);
      setShowCompletionDialog(true);
    },
  });

  // Determine current and next exercise based on segment
  const currentExercise = exercises[timer.currentRound - 1] || exercises[0] || null;
  const nextExercise = exercises[timer.currentRound] || null;

  // Is the current segment a rest period?
  const isResting = timer.currentSegment?.kind === 'rest';

  // Is this a stacked workout?
  const isStacked = isStackedParams(timerParams);

  // Handle save completion
  const handleSaveCompletion = useCallback(async (notes?: string) => {
    if (!completionResults) return;

    setIsSaving(true);
    try {
      const resultsWithNotes: TimerSessionResults = {
        ...completionResults,
        notes,
      };

      if (onComplete) {
        await onComplete(resultsWithNotes);
      }

      setSaveSuccess(true);

      // Navigate to calendar after short delay
      setTimeout(() => {
        router.push('/calendar');
      }, 1500);
    } catch (error) {
      console.error('Failed to save workout:', error);
      setIsSaving(false);
    }
  }, [completionResults, onComplete, router]);

  // Handle end workout early
  const handleEndWorkout = useCallback(() => {
    timer.pause();

    // Create partial results
    const results: TimerSessionResults = {
      completedAt: new Date().toISOString(),
      totalElapsedMs: timer.elapsedMs,
      totalRoundsCompleted: timer.currentRound,
      exercisesCompleted: timer.timerState.currentSegmentIndex + 1,
      blocksCompleted: isStacked ? timer.currentBlockIndex + 1 : undefined,
    };

    setCompletionResults(results);
    setShowCompletionDialog(true);
  }, [timer, isStacked]);

  // Handle discard
  const handleDiscard = useCallback(() => {
    setShowCompletionDialog(false);
    if (onEnd) {
      onEnd();
    } else {
      router.push('/calendar');
    }
  }, [onEnd, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (timer.isRunning) {
            timer.pause();
          } else if (timer.isPaused) {
            timer.resume();
          } else if (!timer.isCompleted) {
            timer.start();
          }
          break;
        case 'r':
          if (!timer.isRunning) {
            timer.reset();
          }
          break;
        case 's':
          if (timer.isRunning) {
            timer.skip();
          }
          break;
        case 'm':
          timer.setSoundEnabled(!timer.soundEnabled);
          break;
        case 'Escape':
          if (!showCompletionDialog) {
            handleEndWorkout();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timer, showCompletionDialog, handleEndWorkout]);

  return (
    <div className={cn('min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950', className)}>
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEndWorkout}
              className="text-muted-foreground hover:text-white"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              End
            </Button>

            <div className="flex items-center gap-4">
              {/* Workout Title */}
              <h1 className="text-sm font-medium text-white truncate max-w-[200px]">
                {workoutTitle}
              </h1>

              {/* Timer Type Badge */}
              <Badge variant="secondary" className="text-xs">
                {timerParams.kind.replace('_', ' ')}
              </Badge>

              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => timer.setSoundEnabled(!timer.soundEnabled)}
              >
                {timer.soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <Progress
            value={timer.progressPercentage}
            className="h-1 mt-2"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {/* Block Navigator (for stacked workouts) */}
        {isStacked && timer.totalBlocks > 1 && (
          <div className="mb-6">
            <TimerBlockNavigator
              blocks={timerParams.blocks.map((b, i) => ({
                id: b.id,
                label: b.label,
                status: timer.blockStates[i]?.status || 'pending',
              }))}
              currentBlockIndex={timer.currentBlockIndex}
              onBlockSelect={timer.skipToBlock}
            />
          </div>
        )}

        {/* Current Block Label */}
        {timer.currentBlockLabel && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <Layers className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-primary">
              {timer.currentBlockLabel}
            </span>
          </div>
        )}

        {/* Timer Display */}
        <div className="mb-8">
          <TimerDisplay
            remainingMs={timer.segmentRemainingMs}
            totalMs={timer.totalDurationMs}
            elapsedMs={timer.elapsedMs}
            mode="countdown"
            segmentLabel={timer.currentSegment?.label}
            segmentKind={timer.currentSegment?.kind as any}
            roundInfo={{
              current: timer.currentRound,
              total: timer.totalRounds,
            }}
            showProgress={false}
            progressPercentage={timer.progressPercentage}
            isCountingDown={timer.isCountingDown}
            countdownSeconds={timer.countdownSeconds}
          />
        </div>

        {/* Exercise Display */}
        {exercises.length > 0 && (
          <div className="mb-8">
            <TimerExerciseDisplay
              currentExercise={currentExercise}
              nextExercise={nextExercise}
              currentSegmentLabel={timer.currentSegment?.label}
              isResting={isResting}
            />
          </div>
        )}

        {/* Timer Controls */}
        <div className="flex justify-center">
          <TimerControls
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
            isCompleted={timer.isCompleted}
            isCountingDown={timer.isCountingDown}
            soundEnabled={timer.soundEnabled}
            onStart={timer.start}
            onPause={timer.pause}
            onResume={timer.resume}
            onReset={timer.reset}
            onSkip={timer.skip}
            onStop={handleEndWorkout}
            onToggleSound={timer.setSoundEnabled}
            showSkip={true}
            showStop={true}
            showSound={false}
          />
        </div>

        {/* Keyboard Hints */}
        <div className="mt-8 text-center text-xs text-muted-foreground/60">
          <span className="hidden sm:inline">
            Space: Play/Pause • S: Skip • R: Reset • M: Mute • Esc: End
          </span>
        </div>
      </main>

      {/* Completion Dialog */}
      <TimerCompletionDialog
        open={showCompletionDialog}
        onOpenChange={(open) => {
          if (!isSaving && !saveSuccess) {
            setShowCompletionDialog(open);
          }
        }}
        workoutTitle={workoutTitle}
        results={completionResults}
        onSave={handleSaveCompletion}
        onDiscard={handleDiscard}
        isSaving={isSaving}
        showSuccess={saveSuccess}
      />
    </div>
  );
}
