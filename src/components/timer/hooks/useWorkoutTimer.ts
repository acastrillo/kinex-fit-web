"use client";

/**
 * useWorkoutTimer Hook
 *
 * Main orchestration hook for the timer execution system.
 * Manages timer state, block navigation, and session tracking.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  type TimerParams,
  type TimerRuntimeState,
  type TimerSegment,
  createInitialTimerState,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  tickTimer,
  computeTotalDurationMs,
  getCurrentSegment,
  getNextSegment,
  getRemainingInSegmentMs,
  getTotalRemainingMs,
} from '@/timers';
import type {
  TimerSessionState,
  TimerSessionStatus,
  TimerSessionResults,
  BlockRuntimeState,
} from '@/types/timer-session';
import { isStackedParams } from '@/types/timer-session';

// ============================================================================
// Types
// ============================================================================

export interface UseWorkoutTimerOptions {
  workoutId: string;
  workoutTitle: string;
  timerParams: TimerParams;
  onSegmentChange?: (segment: TimerSegment, blockIndex?: number) => void;
  onBlockChange?: (blockIndex: number, label: string) => void;
  onComplete?: (results: TimerSessionResults) => void;
  enableSound?: boolean;
  soundEnabled?: boolean;
  countdownBeforeStart?: number;
  persistKey?: string;
}

export interface UseWorkoutTimerReturn {
  // Session state
  session: TimerSessionState;
  timerState: TimerRuntimeState;

  // Current status
  status: TimerSessionStatus;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isCountingDown: boolean;

  // Current segment info
  currentSegment: TimerSegment | null;
  nextSegment: TimerSegment | null;
  currentRound: number;
  totalRounds: number;

  // Time info
  elapsedMs: number;
  remainingMs: number;
  segmentRemainingMs: number;
  totalDurationMs: number;
  progressPercentage: number;

  // For stacked workouts
  currentBlockIndex: number;
  currentBlockLabel: string | null;
  totalBlocks: number;
  blockStates: BlockRuntimeState[];

  // Controls
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  skipToBlock: (blockIndex: number) => void;
  markComplete: (notes?: string) => void;

  // Settings
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  countdownSeconds: number;
}

// ============================================================================
// Constants
// ============================================================================

const TICK_INTERVAL_MS = 100;
const DEFAULT_COUNTDOWN = 3;

// ============================================================================
// Helper Functions
// ============================================================================

function createBlockStates(params: TimerParams): BlockRuntimeState[] {
  if (!isStackedParams(params)) {
    return [];
  }

  return params.blocks.map((block) => ({
    blockId: block.id,
    label: block.label,
    status: 'pending' as const,
    timerState: createInitialTimerState(block.timerParams),
  }));
}

function calculateTotalRounds(params: TimerParams, timerState: TimerRuntimeState): number {
  switch (params.kind) {
    case 'EMOM':
      return params.totalMinutes;
    case 'TABATA':
      return params.rounds;
    case 'INTERVAL_WORK_REST':
      return params.totalRounds;
    case 'LADDER':
      return params.pattern.length;
    case 'DEATH_BY':
      return params.maxMinutes || 20;
    case 'AMRAP':
    case 'FOR_TIME':
    case 'CHIPPER':
      // These are not round-based, so return segment count
      return timerState.segments.length;
    case 'STACKED':
      return params.blocks.length;
    default:
      return 1;
  }
}

function getCurrentRound(params: TimerParams, timerState: TimerRuntimeState): number {
  const segment = getCurrentSegment(timerState);
  if (!segment) return 1;

  // Use loopIndex if available (most timer types set this)
  if (segment.loopIndex !== undefined) {
    return segment.loopIndex;
  }

  // Fallback to segment order
  return timerState.currentSegmentIndex + 1;
}

// ============================================================================
// Hook
// ============================================================================

export function useWorkoutTimer(options: UseWorkoutTimerOptions): UseWorkoutTimerReturn {
  const {
    workoutId,
    workoutTitle,
    timerParams,
    onSegmentChange,
    onBlockChange,
    onComplete,
    enableSound = true,
    countdownBeforeStart = DEFAULT_COUNTDOWN,
    persistKey,
  } = options;

  // Initialize state
  const initialTimerState = useMemo(
    () => createInitialTimerState(timerParams),
    [timerParams]
  );

  const initialBlockStates = useMemo(
    () => createBlockStates(timerParams),
    [timerParams]
  );

  // Core state
  const [status, setStatus] = useState<TimerSessionStatus>('idle');
  const [timerState, setTimerState] = useState<TimerRuntimeState>(initialTimerState);
  const [blockStates, setBlockStates] = useState<BlockRuntimeState[]>(initialBlockStates);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState(countdownBeforeStart);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Refs for tracking
  const prevSegmentIndexRef = useRef<number>(0);
  const prevStatusRef = useRef<TimerSessionStatus>('idle');
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const currentSegment = getCurrentSegment(timerState);
  const nextSegment = getNextSegment(timerState);
  const segmentRemainingMs = getRemainingInSegmentMs(timerState);
  const totalRemainingMs = getTotalRemainingMs(timerState);
  const totalDurationMs = computeTotalDurationMs(timerState.segments);

  const totalRounds = useMemo(
    () => calculateTotalRounds(timerParams, timerState),
    [timerParams, timerState]
  );

  const currentRound = useMemo(
    () => getCurrentRound(timerParams, timerState),
    [timerParams, timerState]
  );

  const progressPercentage = totalDurationMs > 0
    ? Math.min(100, (timerState.totalElapsedMs / totalDurationMs) * 100)
    : 0;

  const isStacked = isStackedParams(timerParams);
  const currentBlockLabel = isStacked
    ? timerParams.blocks[currentBlockIndex]?.label || null
    : null;
  const totalBlocks = isStacked ? timerParams.blocks.length : 0;

  // Status flags
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isCountingDown = status === 'countdown';

  // =========================================================================
  // Timer Tick Effect
  // =========================================================================

  useEffect(() => {
    if (status === 'countdown') {
      tickIntervalRef.current = setInterval(() => {
        setCountdownRemaining((prev) => {
          if (prev <= 1) {
            // Countdown finished, start timer
            clearInterval(tickIntervalRef.current!);
            setStatus('running');
            setTimerState((state) => startTimer(state, Date.now()));
            setStartedAt(Date.now());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
        }
      };
    }

    if (status === 'running') {
      tickIntervalRef.current = setInterval(() => {
        setTimerState((state) => tickTimer(state, Date.now()));
      }, TICK_INTERVAL_MS);

      return () => {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
        }
      };
    }
  }, [status]);

  // =========================================================================
  // Segment Change Detection
  // =========================================================================

  useEffect(() => {
    const currentIndex = timerState.currentSegmentIndex;

    if (currentIndex !== prevSegmentIndexRef.current && currentSegment) {
      // Segment changed
      onSegmentChange?.(currentSegment, isStacked ? currentBlockIndex : undefined);
      prevSegmentIndexRef.current = currentIndex;
    }

    // Check for completion
    if (timerState.status === 'COMPLETED' && status !== 'completed') {
      handleCompletion();
    }
  }, [timerState.currentSegmentIndex, timerState.status, currentSegment]);

  // =========================================================================
  // Controls
  // =========================================================================

  const start = useCallback(() => {
    if (countdownBeforeStart > 0) {
      setCountdownRemaining(countdownBeforeStart);
      setStatus('countdown');
    } else {
      setStatus('running');
      setTimerState((state) => startTimer(state, Date.now()));
      setStartedAt(Date.now());
    }
  }, [countdownBeforeStart]);

  const pause = useCallback(() => {
    if (status === 'running') {
      setStatus('paused');
      setTimerState((state) => pauseTimer(state, Date.now()));
    }
  }, [status]);

  const resume = useCallback(() => {
    if (status === 'paused') {
      setStatus('running');
      setTimerState((state) => resumeTimer(state, Date.now()));
    }
  }, [status]);

  const reset = useCallback(() => {
    setStatus('idle');
    setTimerState(createInitialTimerState(timerParams));
    setBlockStates(createBlockStates(timerParams));
    setCurrentBlockIndex(0);
    setCountdownRemaining(countdownBeforeStart);
    setStartedAt(null);
    prevSegmentIndexRef.current = 0;
  }, [timerParams, countdownBeforeStart]);

  const skip = useCallback(() => {
    if (status !== 'running') return;

    // Move to next segment
    const nextIndex = timerState.currentSegmentIndex + 1;
    if (nextIndex < timerState.segments.length) {
      // Calculate elapsed time to skip to next segment
      let elapsed = 0;
      for (let i = 0; i < nextIndex; i++) {
        elapsed += timerState.segments[i].durationMs;
      }

      setTimerState((state) => ({
        ...state,
        currentSegmentIndex: nextIndex,
        segmentElapsedMs: 0,
        totalElapsedMs: elapsed,
      }));
    } else {
      // Last segment, complete the workout
      handleCompletion();
    }
  }, [status, timerState]);

  const skipToBlock = useCallback((blockIndex: number) => {
    if (!isStacked || blockIndex < 0 || blockIndex >= totalBlocks) return;

    // Update block states
    setBlockStates((states) =>
      states.map((state, idx) => ({
        ...state,
        status: idx < blockIndex ? 'completed' : idx === blockIndex ? 'active' : 'pending',
      }))
    );

    setCurrentBlockIndex(blockIndex);
    onBlockChange?.(blockIndex, timerParams.blocks[blockIndex]?.label || '');

    // Reset timer state for new block
    const blockParams = timerParams.blocks[blockIndex].timerParams;
    setTimerState(createInitialTimerState(blockParams));
  }, [isStacked, totalBlocks, timerParams, onBlockChange]);

  const handleCompletion = useCallback(() => {
    setStatus('completed');

    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
    }

    const results: TimerSessionResults = {
      completedAt: new Date().toISOString(),
      totalElapsedMs: timerState.totalElapsedMs,
      totalRoundsCompleted: currentRound,
      exercisesCompleted: timerState.segments.length,
      blocksCompleted: isStacked ? currentBlockIndex + 1 : undefined,
    };

    onComplete?.(results);
  }, [timerState, currentRound, isStacked, currentBlockIndex, onComplete]);

  const markComplete = useCallback((notes?: string) => {
    const results: TimerSessionResults = {
      completedAt: new Date().toISOString(),
      totalElapsedMs: timerState.totalElapsedMs,
      totalRoundsCompleted: currentRound,
      exercisesCompleted: timerState.segments.length,
      blocksCompleted: isStacked ? currentBlockIndex + 1 : undefined,
      notes,
    };

    setStatus('completed');

    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
    }

    onComplete?.(results);
  }, [timerState, currentRound, isStacked, currentBlockIndex, onComplete]);

  // =========================================================================
  // Session State Object
  // =========================================================================

  const session: TimerSessionState = {
    workoutId,
    workoutTitle,
    timerType: timerParams.kind,
    params: timerParams,
    status,
    startedAt,
    pausedAt: timerState.pausedAtMs,
    completedAt: status === 'completed' ? Date.now() : null,
    currentBlockIndex,
    blockStates,
    currentExerciseIndex: timerState.currentSegmentIndex,
    currentRound,
    totalRoundsCompleted: status === 'completed' ? currentRound : currentRound - 1,
    elapsedMs: timerState.totalElapsedMs,
    remainingMs: totalRemainingMs,
    totalDurationMs,
    soundEnabled,
    countdownBeforeStart,
  };

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Session state
    session,
    timerState,

    // Current status
    status,
    isRunning,
    isPaused,
    isCompleted,
    isCountingDown,

    // Current segment info
    currentSegment,
    nextSegment,
    currentRound,
    totalRounds,

    // Time info
    elapsedMs: timerState.totalElapsedMs,
    remainingMs: totalRemainingMs,
    segmentRemainingMs,
    totalDurationMs,
    progressPercentage,

    // For stacked workouts
    currentBlockIndex,
    currentBlockLabel,
    totalBlocks,
    blockStates,

    // Controls
    start,
    pause,
    resume,
    reset,
    skip,
    skipToBlock,
    markComplete,

    // Settings
    soundEnabled,
    setSoundEnabled,
    countdownSeconds: countdownRemaining,
  };
}
