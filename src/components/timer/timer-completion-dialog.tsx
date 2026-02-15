"use client";

/**
 * Timer Completion Dialog
 *
 * Shows completion summary and allows notes input when workout timer finishes.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Clock,
  Repeat,
  Dumbbell,
  CheckCircle,
  Loader2,
  Sparkles,
  Medal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimerSessionResults } from '@/types/timer-session';

// ============================================================================
// Types
// ============================================================================

export interface TimerCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutTitle: string;
  results: TimerSessionResults | null;
  onSave: (notes?: string) => Promise<void>;
  onDiscard?: () => void;
  isSaving?: boolean;
  showSuccess?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// ============================================================================
// Component
// ============================================================================

export function TimerCompletionDialog({
  open,
  onOpenChange,
  workoutTitle,
  results,
  onSave,
  onDiscard,
  isSaving = false,
  showSuccess = false,
}: TimerCompletionDialogProps) {
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  const handleSave = async () => {
    await onSave(notes.trim() || undefined);
  };

  // Success state
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <div className="relative bg-green-500 rounded-full p-6">
                  <CheckCircle className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
            <DialogTitle className="text-center text-3xl font-bold">
              Saved!
            </DialogTitle>
            <DialogDescription className="text-center text-lg mt-2">
              Your workout has been saved successfully
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            Taking you to your calendar...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={isSaving ? () => {} : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* Trophy Animation */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-pulse" />
              <div className="relative bg-gradient-to-br from-amber-400 to-amber-600 rounded-full p-5">
                <Trophy className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Medal className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
          </div>

          <DialogTitle className="text-center text-2xl">
            Workout Complete!
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Amazing work crushing <span className="font-semibold text-foreground">{workoutTitle}</span>!
          </DialogDescription>
        </DialogHeader>

        {/* Results Summary */}
        {results && (
          <div className="space-y-3 my-4">
            {/* Duration */}
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Duration</span>
              </div>
              <span className="font-mono font-semibold">
                {formatDuration(results.totalElapsedMs)}
              </span>
            </div>

            {/* Rounds Completed */}
            {results.totalRoundsCompleted > 0 && (
              <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Repeat className="h-4 w-4" />
                  <span>Rounds Completed</span>
                </div>
                <span className="font-semibold">{results.totalRoundsCompleted}</span>
              </div>
            )}

            {/* Exercises */}
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Dumbbell className="h-4 w-4" />
                <span>Exercises</span>
              </div>
              <span className="font-semibold">{results.exercisesCompleted} completed</span>
            </div>

            {/* Blocks (for stacked workouts) */}
            {results.blocksCompleted && results.blocksCompleted > 0 && (
              <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Blocks Completed</span>
                </div>
                <span className="font-semibold">{results.blocksCompleted}</span>
              </div>
            )}

            {/* Beat Time Cap Badge */}
            {results.beatTimeCap && (
              <div className="flex justify-center">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Beat the time cap!
                </Badge>
              </div>
            )}

            {/* Death By Result */}
            {results.failedAtMinute && (
              <div className="flex justify-center">
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Made it to minute {results.failedAtMinute}!
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Notes Section */}
        {!showNotesInput ? (
          <Button
            variant="ghost"
            onClick={() => setShowNotesInput(true)}
            className="w-full text-muted-foreground hover:text-primary"
            disabled={isSaving}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Add Notes (Optional)
          </Button>
        ) : (
          <div className="space-y-2">
            <label htmlFor="completion-notes" className="text-sm font-medium text-muted-foreground">
              Workout Notes
            </label>
            <Textarea
              id="completion-notes"
              placeholder="How did it feel? Any PRs or observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
              disabled={isSaving}
            />
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Save Workout
              </>
            )}
          </Button>
          {onDiscard && (
            <Button
              variant="ghost"
              onClick={onDiscard}
              className="w-full sm:w-auto text-muted-foreground"
              size="sm"
              disabled={isSaving}
            >
              Discard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
