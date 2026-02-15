"use client";

/**
 * Timer Controls Component
 *
 * Play/Pause/Reset/Skip controls for the workout timer.
 */

import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TimerControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isCountingDown?: boolean;
  soundEnabled?: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip?: () => void;
  onStop?: () => void;
  onToggleSound?: (enabled: boolean) => void;
  showSkip?: boolean;
  showStop?: boolean;
  showSound?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TimerControls({
  isRunning,
  isPaused,
  isCompleted,
  isCountingDown = false,
  soundEnabled = true,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onStop,
  onToggleSound,
  showSkip = true,
  showStop = true,
  showSound = true,
  size = 'lg',
  className,
}: TimerControlsProps) {
  // Size classes for buttons
  const buttonSizes = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const primaryButtonSizes = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
  };

  const primaryIconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  // Disable controls during countdown
  const controlsDisabled = isCountingDown;

  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      {/* Reset Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          buttonSizes[size],
          'rounded-full border-2',
          controlsDisabled && 'opacity-50'
        )}
        onClick={onReset}
        disabled={controlsDisabled || (!isRunning && !isPaused && !isCompleted)}
        title="Reset timer"
      >
        <RotateCcw className={iconSizes[size]} />
      </Button>

      {/* Primary Control (Play/Pause) */}
      {isCompleted ? (
        <Button
          variant="default"
          size="icon"
          className={cn(
            primaryButtonSizes[size],
            'rounded-full bg-emerald-600 hover:bg-emerald-700'
          )}
          onClick={onReset}
          title="Restart workout"
        >
          <RotateCcw className={primaryIconSizes[size]} />
        </Button>
      ) : isRunning ? (
        <Button
          variant="default"
          size="icon"
          className={cn(
            primaryButtonSizes[size],
            'rounded-full bg-amber-600 hover:bg-amber-700',
            controlsDisabled && 'opacity-50'
          )}
          onClick={onPause}
          disabled={controlsDisabled}
          title="Pause timer"
        >
          <Pause className={primaryIconSizes[size]} />
        </Button>
      ) : isPaused ? (
        <Button
          variant="default"
          size="icon"
          className={cn(
            primaryButtonSizes[size],
            'rounded-full bg-green-600 hover:bg-green-700'
          )}
          onClick={onResume}
          title="Resume timer"
        >
          <Play className={primaryIconSizes[size]} />
        </Button>
      ) : (
        <Button
          variant="default"
          size="icon"
          className={cn(
            primaryButtonSizes[size],
            'rounded-full bg-primary hover:bg-primary/90',
            controlsDisabled && 'opacity-50'
          )}
          onClick={onStart}
          disabled={controlsDisabled}
          title="Start timer"
        >
          <Play className={primaryIconSizes[size]} />
        </Button>
      )}

      {/* Skip Button */}
      {showSkip && onSkip && (
        <Button
          variant="outline"
          size="icon"
          className={cn(
            buttonSizes[size],
            'rounded-full border-2',
            controlsDisabled && 'opacity-50'
          )}
          onClick={onSkip}
          disabled={controlsDisabled || !isRunning}
          title="Skip to next segment"
        >
          <SkipForward className={iconSizes[size]} />
        </Button>
      )}

      {/* Stop Button */}
      {showStop && onStop && (
        <Button
          variant="outline"
          size="icon"
          className={cn(
            buttonSizes[size],
            'rounded-full border-2 border-red-500/50 text-red-500 hover:bg-red-500/10',
            controlsDisabled && 'opacity-50'
          )}
          onClick={onStop}
          disabled={controlsDisabled || (!isRunning && !isPaused)}
          title="End workout"
        >
          <Square className={iconSizes[size]} />
        </Button>
      )}

      {/* Sound Toggle */}
      {showSound && onToggleSound && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            buttonSizes[size],
            'rounded-full'
          )}
          onClick={() => onToggleSound(!soundEnabled)}
          title={soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {soundEnabled ? (
            <Volume2 className={iconSizes[size]} />
          ) : (
            <VolumeX className={iconSizes[size]} />
          )}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Compact Controls Variant
// ============================================================================

export interface CompactTimerControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  className?: string;
}

export function CompactTimerControls({
  isRunning,
  isPaused,
  isCompleted,
  onStart,
  onPause,
  onResume,
  onReset,
  className,
}: CompactTimerControlsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isCompleted ? (
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Restart
        </Button>
      ) : isRunning ? (
        <Button variant="outline" size="sm" onClick={onPause}>
          <Pause className="h-4 w-4 mr-1" />
          Pause
        </Button>
      ) : isPaused ? (
        <Button variant="default" size="sm" onClick={onResume}>
          <Play className="h-4 w-4 mr-1" />
          Resume
        </Button>
      ) : (
        <Button variant="default" size="sm" onClick={onStart}>
          <Play className="h-4 w-4 mr-1" />
          Start
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onReset} disabled={!isRunning && !isPaused}>
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
