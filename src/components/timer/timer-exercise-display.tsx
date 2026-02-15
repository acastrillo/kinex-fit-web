"use client";

/**
 * Timer Exercise Display Component
 *
 * Shows current exercise details and next exercise preview during timer execution.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight, Dumbbell, Clock, Repeat } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface Exercise {
  id: string;
  name: string;
  reps?: string | number;
  weight?: string;
  notes?: string;
  sets?: number;
  restSeconds?: number;
}

export interface TimerExerciseDisplayProps {
  currentExercise?: Exercise | null;
  nextExercise?: Exercise | null;
  currentSegmentLabel?: string;
  targetReps?: number;
  isResting?: boolean;
  showNotes?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TimerExerciseDisplay({
  currentExercise,
  nextExercise,
  currentSegmentLabel,
  targetReps,
  isResting = false,
  showNotes = true,
  className,
}: TimerExerciseDisplayProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Current Exercise */}
      {currentExercise && (
        <Card className={cn(
          'border-2',
          isResting ? 'border-green-500/30 bg-green-500/5' : 'border-primary/30 bg-primary/5'
        )}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={cn(
                'p-3 rounded-lg',
                isResting ? 'bg-green-500/20' : 'bg-primary/20'
              )}>
                <Dumbbell className={cn(
                  'h-6 w-6',
                  isResting ? 'text-green-400' : 'text-primary'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                {/* Segment Label */}
                {currentSegmentLabel && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'mb-2',
                      isResting ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'
                    )}
                  >
                    {isResting ? 'Rest' : currentSegmentLabel}
                  </Badge>
                )}

                {/* Exercise Name */}
                <h3 className="text-2xl font-bold capitalize truncate">
                  {isResting ? 'Rest Period' : currentExercise.name}
                </h3>

                {/* Exercise Details */}
                {!isResting && (
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {/* Target Reps */}
                    {(targetReps || currentExercise.reps) && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Repeat className="h-4 w-4" />
                        <span className="font-medium text-foreground">
                          {targetReps || currentExercise.reps}
                        </span>
                        <span className="text-sm">reps</span>
                      </div>
                    )}

                    {/* Weight */}
                    {currentExercise.weight && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Dumbbell className="h-4 w-4" />
                        <span className="font-medium text-foreground">
                          {currentExercise.weight}
                        </span>
                      </div>
                    )}

                    {/* Rest */}
                    {currentExercise.restSeconds && currentExercise.restSeconds > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{currentExercise.restSeconds}s rest</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {showNotes && currentExercise.notes && !isResting && (
                  <p className="mt-3 text-sm text-muted-foreground italic">
                    {currentExercise.notes}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Exercise Preview */}
      {nextExercise && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-surface/50 border">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Coming Up
            </div>
            <div className="font-medium capitalize truncate">
              {nextExercise.name}
            </div>
            {nextExercise.reps && (
              <div className="text-sm text-muted-foreground">
                {nextExercise.reps} reps
                {nextExercise.weight && ` @ ${nextExercise.weight}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Exercise Display
// ============================================================================

export interface CompactExerciseDisplayProps {
  exerciseName: string;
  reps?: string | number;
  weight?: string;
  isResting?: boolean;
  className?: string;
}

export function CompactExerciseDisplay({
  exerciseName,
  reps,
  weight,
  isResting = false,
  className,
}: CompactExerciseDisplayProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg',
      isResting ? 'bg-green-500/10 border border-green-500/30' : 'bg-surface border',
      className
    )}>
      <div className="flex items-center gap-2">
        <Dumbbell className={cn(
          'h-4 w-4',
          isResting ? 'text-green-400' : 'text-muted-foreground'
        )} />
        <span className={cn(
          'font-medium capitalize',
          isResting && 'text-green-400'
        )}>
          {isResting ? 'Rest' : exerciseName}
        </span>
      </div>
      {!isResting && (reps || weight) && (
        <div className="text-sm text-muted-foreground">
          {reps && `${reps} reps`}
          {reps && weight && ' · '}
          {weight}
        </div>
      )}
    </div>
  );
}
