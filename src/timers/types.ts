/**
 * Timer System Types
 *
 * Platform-agnostic type definitions for the timer system.
 * Zero browser/DOM dependencies - works in React Native.
 */

// ============================================================================
// Timer Categories & Types
// ============================================================================

export type TimerCategory = 'BASIC' | 'INTERVAL' | 'STRENGTH' | 'RECOVERY';

export type TimerType =
  | 'EMOM'
  | 'AMRAP'
  | 'INTERVAL_WORK_REST'
  | 'TABATA'
  | 'FOR_TIME'
  | 'CHIPPER'
  | 'LADDER'
  | 'DEATH_BY'
  | 'STACKED';

// ============================================================================
// Timer Parameter Types (Discriminated Union)
// ============================================================================

/**
 * EMOM (Every Minute On the Minute)
 * Complete work within each minute interval, rest for remainder
 */
export interface EMOMParams {
  kind: 'EMOM';
  intervalSeconds: number;  // Usually 60 (1 minute)
  totalMinutes: number;     // Total duration in minutes
}

/**
 * AMRAP (As Many Rounds As Possible)
 * Complete as many rounds as possible within time limit
 */
export interface AMRAPParams {
  kind: 'AMRAP';
  durationSeconds: number;  // Total time for AMRAP
}

/**
 * Interval Work/Rest
 * Alternating work and rest intervals for specified rounds
 */
export interface IntervalWorkRestParams {
  kind: 'INTERVAL_WORK_REST';
  workSeconds: number;      // Work interval duration
  restSeconds: number;      // Rest interval duration
  totalRounds: number;      // Number of work/rest cycles
}

/**
 * Tabata
 * High-intensity interval training (typically 20s work, 10s rest)
 */
export interface TabataParams {
  kind: 'TABATA';
  workSeconds: number;      // Work interval (typically 20)
  restSeconds: number;      // Rest interval (typically 10)
  rounds: number;           // Number of rounds (typically 8)
}

/**
 * For Time
 * Count up until workout complete, optional time cap
 */
export interface ForTimeParams {
  kind: 'FOR_TIME';
  timeCapSeconds?: number;  // Optional maximum time cap
}

/**
 * Chipper
 * Sequential exercises, complete all reps before moving on
 */
export interface ChipperParams {
  kind: 'CHIPPER';
  timeCapSeconds?: number;  // Optional time cap
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    targetReps: number;
  }>;
}

/**
 * Ladder
 * Increasing/decreasing reps per round (e.g., 21-15-9, pyramid)
 */
export interface LadderParams {
  kind: 'LADDER';
  pattern: number[];                              // [21, 15, 9] or [1,2,3,4,5,4,3,2,1]
  direction: 'ascending' | 'descending' | 'pyramid';
  restBetweenRoundsSeconds?: number;              // Optional rest between rounds
  timeCapSeconds?: number;                        // Optional time cap
}

/**
 * Death By
 * Minute 1 = 1 rep, Minute 2 = 2 reps, until failure
 */
export interface DeathByParams {
  kind: 'DEATH_BY';
  exerciseName: string;           // The exercise to perform
  startingReps: number;           // Starting reps (usually 1)
  incrementPerMinute: number;     // How many reps to add each minute (usually 1)
  maxMinutes?: number;            // Optional cap on minutes
}

/**
 * Non-stacked timer params (for use in stacked blocks)
 * All timer types except STACKED to prevent infinite nesting
 */
export type SingleTimerParams =
  | EMOMParams
  | AMRAPParams
  | IntervalWorkRestParams
  | TabataParams
  | ForTimeParams
  | ChipperParams
  | LadderParams
  | DeathByParams;

/**
 * Stacked/Mixed
 * Multiple blocks of different timer types
 */
export interface StackedParams {
  kind: 'STACKED';
  blocks: Array<{
    id: string;
    label: string;                // "Part A", "Block 1", etc.
    timerParams: SingleTimerParams;  // Any timer type except nested stacked
    restAfterSeconds?: number;    // Rest time after this block
  }>;
}

/**
 * Union of all supported timer parameter types
 */
export type TimerParams =
  | SingleTimerParams
  | StackedParams;

// ============================================================================
// Timer Segments & Runtime State
// ============================================================================

/**
 * Segment types representing different phases in a timer
 */
export type SegmentKind =
  | 'work'      // Active work period
  | 'rest'      // Rest/recovery period
  | 'prep'      // Preparation/countdown before start
  | 'complete'; // Final completion state

/**
 * A segment represents a discrete phase within a timer
 * (e.g., "Work Round 1", "Rest Round 1", "Prep")
 */
export interface TimerSegment {
  id: string;
  label: string;
  kind: SegmentKind;
  durationMs: number;
  order: number;
  loopIndex?: number; // For repeated patterns (round #, cycle #)
}

/**
 * Timer runtime status
 */
export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

/**
 * Complete runtime state for a timer
 */
export interface TimerRuntimeState {
  status: TimerStatus;
  segments: TimerSegment[];
  currentSegmentIndex: number;
  segmentElapsedMs: number;
  totalElapsedMs: number;
  startedAtMs: number | null;
  pausedAtMs: number | null;
  pauseAccumulatedMs: number;
}

// ============================================================================
// Timer Templates
// ============================================================================

/**
 * Field type for timer parameter schemas
 */
export type TimerParamFieldType = 'number' | 'integer';

/**
 * Schema definition for a timer parameter field
 */
export interface TimerParamFieldSchema {
  name: string;
  label: string;
  type: TimerParamFieldType;
  min?: number;
  max?: number;
  step?: number;
  default?: number;
}

/**
 * Schema for timer parameters (used for UI forms)
 */
export interface TimerParamSchema {
  fields: TimerParamFieldSchema[];
}

/**
 * Pre-configured timer template
 */
export interface TimerTemplate {
  id: string;
  type: TimerType;
  category: TimerCategory;
  name: string;
  description: string;
  defaultParams: TimerParams;
  paramSchema: TimerParamSchema;
  recommendedFor: string[]; // Tags: 'hyrox', 'metcon', 'strength', etc.
}

// ============================================================================
// Workout Timer Configuration
// ============================================================================

/**
 * Timer attachment scope
 */
export type TimerScope = 'workout' | 'block';

/**
 * Timer configuration attached to a workout or block
 */
export interface WorkoutTimerConfig {
  id: string;
  templateId: string;
  params: TimerParams;
  scope: TimerScope;
  blockId?: string;
  confidence?: 'high' | 'medium' | 'low';
  aiGenerated?: boolean;
  autoStart?: boolean;
}
