"use client";

/**
 * Timer Display Component
 *
 * Large timer display showing current time, segment info, and progress.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// ============================================================================
// Types
// ============================================================================

export interface TimerDisplayProps {
  remainingMs: number;
  totalMs?: number;
  elapsedMs?: number;
  mode?: 'countdown' | 'countup';
  segmentLabel?: string;
  segmentKind?: 'work' | 'rest' | 'prep' | 'complete';
  roundInfo?: {
    current: number;
    total: number;
  };
  showProgress?: boolean;
  progressPercentage?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isCountingDown?: boolean;
  countdownSeconds?: number;
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatTime(ms: number, showMillis = false): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getSegmentColor(kind?: string): string {
  switch (kind) {
    case 'work':
      return 'text-red-400';
    case 'rest':
      return 'text-green-400';
    case 'prep':
      return 'text-blue-400';
    case 'complete':
      return 'text-emerald-400';
    default:
      return 'text-foreground';
  }
}

function getSegmentBgColor(kind?: string): string {
  switch (kind) {
    case 'work':
      return 'bg-red-500/10 border-red-500/30';
    case 'rest':
      return 'bg-green-500/10 border-green-500/30';
    case 'prep':
      return 'bg-blue-500/10 border-blue-500/30';
    case 'complete':
      return 'bg-emerald-500/10 border-emerald-500/30';
    default:
      return 'bg-surface border-border';
  }
}

// ============================================================================
// Component
// ============================================================================

export function TimerDisplay({
  remainingMs,
  totalMs,
  elapsedMs,
  mode = 'countdown',
  segmentLabel,
  segmentKind,
  roundInfo,
  showProgress = true,
  progressPercentage,
  size = 'lg',
  isCountingDown = false,
  countdownSeconds = 0,
  className,
}: TimerDisplayProps) {
  // Calculate progress if not provided
  const progress = useMemo(() => {
    if (progressPercentage !== undefined) return progressPercentage;
    if (totalMs && totalMs > 0) {
      if (mode === 'countdown') {
        return 100 - (remainingMs / totalMs) * 100;
      }
      return (elapsedMs ?? 0) / totalMs * 100;
    }
    return 0;
  }, [progressPercentage, totalMs, remainingMs, elapsedMs, mode]);

  // Display time based on mode
  const displayTime = useMemo(() => {
    if (isCountingDown) {
      return countdownSeconds.toString();
    }
    if (mode === 'countdown') {
      return formatTime(remainingMs);
    }
    return formatTime(elapsedMs ?? 0);
  }, [mode, remainingMs, elapsedMs, isCountingDown, countdownSeconds]);

  // Size classes
  const sizeClasses = {
    sm: 'text-4xl',
    md: 'text-5xl',
    lg: 'text-7xl',
    xl: 'text-8xl',
  };

  const containerSizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Countdown Overlay */}
      {isCountingDown && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[12rem] font-bold text-primary animate-pulse">
              {countdownSeconds}
            </div>
            <div className="text-2xl text-muted-foreground mt-4">Get Ready!</div>
          </div>
        </div>
      )}

      {/* Main Timer Display */}
      <div
        className={cn(
          'rounded-2xl border backdrop-blur-sm w-full max-w-lg',
          containerSizes[size],
          getSegmentBgColor(segmentKind)
        )}
      >
        {/* Segment Label */}
        {segmentLabel && (
          <div className={cn('text-center mb-2', getSegmentColor(segmentKind))}>
            <span className="text-sm font-medium uppercase tracking-wide">
              {segmentLabel}
            </span>
          </div>
        )}

        {/* Time Display */}
        <div className="text-center">
          <div
            className={cn(
              'font-mono font-bold tabular-nums',
              sizeClasses[size],
              segmentKind === 'complete' ? 'text-emerald-400' : getSegmentColor(segmentKind)
            )}
          >
            {displayTime}
          </div>
        </div>

        {/* Round Info */}
        {roundInfo && (
          <div className="text-center mt-3">
            <span className="text-sm text-muted-foreground">
              Round{' '}
              <span className="font-semibold text-foreground">{roundInfo.current}</span>
              {' '}of{' '}
              <span className="font-semibold text-foreground">{roundInfo.total}</span>
            </span>
          </div>
        )}

        {/* Progress Bar */}
        {showProgress && !isCountingDown && (
          <div className="mt-4">
            <Progress
              value={progress}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(elapsedMs ?? 0)}</span>
              <span>{formatTime(totalMs ?? 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Info (Total Time Remaining) */}
      {mode === 'countdown' && totalMs && !isCountingDown && (
        <div className="mt-4 text-center">
          <span className="text-sm text-muted-foreground">
            Total remaining: <span className="font-mono">{formatTime(remainingMs)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
