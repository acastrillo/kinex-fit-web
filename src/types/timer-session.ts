/**
 * Timer Session State Types
 *
 * Types for managing the runtime state of workout timer sessions.
 */

import type { TimerParams, TimerType, TimerRuntimeState } from '@/timers';

// ============================================================================
// Extended Timer Type (includes all new timer types)
// ============================================================================

export type ExtendedTimerType = TimerType;

// ============================================================================
// Timer Session Status
// ============================================================================

export type TimerSessionStatus =
  | 'idle'          // Not started
  | 'countdown'     // Pre-workout countdown (3-2-1)
  | 'running'       // Timer actively running
  | 'paused'        // Timer paused
  | 'transitioning' // Between blocks in stacked workout
  | 'completed';    // Workout finished

// ============================================================================
// Block Runtime State (for stacked workouts)
// ============================================================================

export interface BlockRuntimeState {
  blockId: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  startedAt?: number;
  completedAt?: number;
  roundsCompleted?: number;
  timerState: TimerRuntimeState;
}

// ============================================================================
// Timer Session State
// ============================================================================

export interface TimerSessionState {
  // Workout identification
  workoutId: string;
  workoutTitle: string;

  // Timer configuration
  timerType: ExtendedTimerType;
  params: TimerParams;

  // Session status
  status: TimerSessionStatus;
  startedAt: number | null;
  pausedAt: number | null;
  completedAt: number | null;

  // For stacked workouts - track current block
  currentBlockIndex: number;
  blockStates: BlockRuntimeState[];

  // Progress tracking
  currentExerciseIndex: number;
  currentRound: number;
  totalRoundsCompleted: number;

  // Time tracking
  elapsedMs: number;
  remainingMs: number;
  totalDurationMs: number;

  // User settings
  soundEnabled: boolean;
  countdownBeforeStart: number; // Seconds of countdown before starting (default: 3)

  // Results (populated on completion)
  results?: TimerSessionResults;
}

// ============================================================================
// Timer Session Results
// ============================================================================

export interface TimerSessionResults {
  completedAt: string;          // ISO timestamp
  totalElapsedMs: number;
  totalRoundsCompleted: number;
  exercisesCompleted: number;
  blocksCompleted?: number;     // For stacked workouts
  notes?: string;

  // Per-block results for stacked workouts
  blockResults?: Array<{
    blockId: string;
    label: string;
    elapsedMs: number;
    roundsCompleted?: number;
  }>;

  // For "For Time" workouts - did they beat the cap?
  beatTimeCap?: boolean;

  // For "Death By" workouts - what minute did they fail?
  failedAtMinute?: number;
}

// ============================================================================
// Timer Selection State
// ============================================================================

export interface TimerSelectionState {
  // Auto-detected timer type from workout analysis
  detectedType: ExtendedTimerType | null;
  detectedReason?: string;

  // User's selection
  selectedType: ExtendedTimerType | null;

  // Configured parameters
  configuredParams: TimerParams | null;

  // AI enhancement
  isEnhancing: boolean;
  aiSuggestion?: {
    type: ExtendedTimerType;
    params: TimerParams;
    reason: string;
  };
}

// ============================================================================
// Timer Configuration State (for the configuration panel)
// ============================================================================

export interface TimerConfigurationState {
  timerType: ExtendedTimerType;
  params: TimerParams;
  isValid: boolean;
  validationErrors: string[];
}

// ============================================================================
// Exercise Assignment (for EMOM/Interval timers)
// ============================================================================

export interface ExerciseAssignment {
  exerciseId: string;
  exerciseName: string;
  intervalIndex: number;  // Which interval/minute this exercise is assigned to
  notes?: string;
}

// ============================================================================
// Timer Preset
// ============================================================================

export interface TimerPreset {
  id: string;
  name: string;
  description: string;
  timerType: ExtendedTimerType;
  params: TimerParams;
  isDefault?: boolean;
  isUserCreated?: boolean;
}

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isStackedParams(params: TimerParams): params is import('@/timers').StackedParams {
  return params.kind === 'STACKED';
}

export function isForTimeParams(params: TimerParams): params is import('@/timers').ForTimeParams {
  return params.kind === 'FOR_TIME';
}

export function isDeathByParams(params: TimerParams): params is import('@/timers').DeathByParams {
  return params.kind === 'DEATH_BY';
}

export function isChipperParams(params: TimerParams): params is import('@/timers').ChipperParams {
  return params.kind === 'CHIPPER';
}

export function isLadderParams(params: TimerParams): params is import('@/timers').LadderParams {
  return params.kind === 'LADDER';
}
