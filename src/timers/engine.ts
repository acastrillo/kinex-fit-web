/**
 * Timer Engine
 *
 * Pure functions for timer segment building and state management.
 * Platform-agnostic - zero browser/DOM dependencies.
 * All functions are pure (no side effects) for easy testing and React Native compatibility.
 */

import type {
  TimerParams,
  EMOMParams,
  AMRAPParams,
  IntervalWorkRestParams,
  TabataParams,
  ForTimeParams,
  ChipperParams,
  LadderParams,
  DeathByParams,
  StackedParams,
  TimerSegment,
  TimerRuntimeState,
  SegmentKind,
} from './types';

function assertUnreachable(value: never): never {
  throw new Error(`Unsupported timer params kind: ${(value as any)?.kind ?? 'unknown'}`);
}

// ============================================================================
// Segment ID Generation
// ============================================================================

let segmentIdCounter = 0;

function nextSegmentId(): string {
  segmentIdCounter += 1;
  return `seg_${segmentIdCounter}`;
}

/**
 * Reset the segment ID counter (useful for testing)
 */
export function resetSegmentIdCounter(): void {
  segmentIdCounter = 0;
}

// ============================================================================
// Segment Creation Helpers
// ============================================================================

function createSegment(
  label: string,
  kind: SegmentKind,
  durationSeconds: number,
  order: number,
  loopIndex?: number
): TimerSegment {
  return {
    id: nextSegmentId(),
    label,
    kind,
    durationMs: Math.max(0, durationSeconds * 1000),
    order,
    loopIndex,
  };
}

// ============================================================================
// Segment Builders for Each Timer Type
// ============================================================================

/**
 * Build segments for EMOM timer
 * Each minute is a 'work' segment
 */
function buildEMOMSegments(params: EMOMParams): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  const totalRounds = params.totalMinutes;

  for (let round = 1; round <= totalRounds; round++) {
    segments.push(
      createSegment(
        `Minute ${round}`,
        'work',
        params.intervalSeconds,
        order++,
        round
      )
    );
  }

  return segments;
}

/**
 * Build segments for AMRAP timer
 * Single continuous 'work' segment
 */
function buildAMRAPSegments(params: AMRAPParams): TimerSegment[] {
  return [
    createSegment('AMRAP', 'work', params.durationSeconds, 0, 1),
  ];
}

/**
 * Build segments for Interval Work/Rest timer
 * Alternates between work and rest for specified rounds
 */
function buildIntervalWorkRestSegments(params: IntervalWorkRestParams): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  for (let round = 1; round <= params.totalRounds; round++) {
    // Work segment
    segments.push(
      createSegment(
        `Work ${round}`,
        'work',
        params.workSeconds,
        order++,
        round
      )
    );

    // Rest segment (if rest duration > 0)
    if (params.restSeconds > 0) {
      segments.push(
        createSegment(
          `Rest ${round}`,
          'rest',
          params.restSeconds,
          order++,
          round
        )
      );
    }
  }

  return segments;
}

/**
 * Build segments for Tabata timer
 * Short intense work periods with brief rest
 */
function buildTabataSegments(params: TabataParams): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  for (let round = 1; round <= params.rounds; round++) {
    // Work segment
    segments.push(
      createSegment(
        `Work ${round}`,
        'work',
        params.workSeconds,
        order++,
        round
      )
    );

    // Rest segment (if rest duration > 0)
    if (params.restSeconds > 0) {
      segments.push(
        createSegment(
          `Rest ${round}`,
          'rest',
          params.restSeconds,
          order++,
          round
        )
      );
    }
  }

  return segments;
}

/**
 * Build segments for For Time timer
 * Single continuous 'work' segment counting up (time cap optional)
 * For "For Time" workouts, we use the time cap as a maximum duration
 * but the user can complete early and mark done manually
 */
function buildForTimeSegments(params: ForTimeParams): TimerSegment[] {
  // Use time cap if set, otherwise default to 60 minutes max
  const duration = params.timeCapSeconds ?? 60 * 60;
  return [
    createSegment('For Time', 'work', duration, 0, 1),
  ];
}

/**
 * Build segments for Chipper timer
 * Each exercise is a separate work segment
 */
function buildChipperSegments(params: ChipperParams): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  params.exercises.forEach((exercise, index) => {
    segments.push(
      createSegment(
        `${exercise.exerciseName} (${exercise.targetReps})`,
        'work',
        // Chipper exercises don't have fixed durations - they're rep-based
        // Use time cap divided by exercises, or default to unlimited tracking
        params.timeCapSeconds
          ? Math.ceil(params.timeCapSeconds / params.exercises.length)
          : 10 * 60, // Default 10 min per exercise as placeholder
        order++,
        index + 1
      )
    );
  });

  return segments;
}

/**
 * Build segments for Ladder timer
 * Each round with different rep counts
 */
function buildLadderSegments(params: LadderParams): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  params.pattern.forEach((reps, index) => {
    // Work segment for this rep count
    segments.push(
      createSegment(
        `Round ${index + 1} (${reps} reps)`,
        'work',
        // Ladders don't have fixed durations - estimate based on reps
        // Use time cap divided by total rounds, or 60 seconds per round default
        params.timeCapSeconds
          ? Math.ceil(params.timeCapSeconds / params.pattern.length)
          : 60,
        order++,
        index + 1
      )
    );

    // Rest segment between rounds (if configured and not the last round)
    if (params.restBetweenRoundsSeconds && index < params.pattern.length - 1) {
      segments.push(
        createSegment(
          `Rest`,
          'rest',
          params.restBetweenRoundsSeconds,
          order++,
          index + 1
        )
      );
    }
  });

  return segments;
}

/**
 * Build segments for Death By timer
 * Each minute adds more reps - minute 1 = startingReps, minute 2 = startingReps + increment, etc.
 */
function buildDeathBySegments(params: DeathByParams): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  // Default to 20 minutes if not specified
  const maxMinutes = params.maxMinutes ?? 20;

  for (let minute = 1; minute <= maxMinutes; minute++) {
    const reps = params.startingReps + (minute - 1) * params.incrementPerMinute;

    segments.push(
      createSegment(
        `Minute ${minute}: ${reps} ${params.exerciseName}`,
        'work',
        60, // Each minute is 60 seconds
        order++,
        minute
      )
    );
  }

  return segments;
}

/**
 * Build segments for Stacked timer
 * Combines multiple timer blocks with optional rest between
 */
function buildStackedSegments(params: StackedParams): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  params.blocks.forEach((block, blockIndex) => {
    // Get segments for this block's timer type
    const blockSegments = buildSegmentsFromParams(block.timerParams);

    // Add block label prefix to each segment and adjust order
    blockSegments.forEach((segment, segIndex) => {
      segments.push({
        ...segment,
        id: nextSegmentId(),
        label: `${block.label}: ${segment.label}`,
        order: order++,
        loopIndex: segment.loopIndex,
      });
    });

    // Add rest segment after block (if configured and not the last block)
    if (block.restAfterSeconds && blockIndex < params.blocks.length - 1) {
      segments.push(
        createSegment(
          `Rest before ${params.blocks[blockIndex + 1]?.label || 'next block'}`,
          'rest',
          block.restAfterSeconds,
          order++,
          blockIndex + 1
        )
      );
    }
  });

  return segments;
}

// ============================================================================
// Public Segment Builder
// ============================================================================

/**
 * Build timer segments from parameters
 * Returns an array of segments representing the timer's phases
 */
export function buildSegmentsFromParams(params: TimerParams): TimerSegment[] {
  switch (params.kind) {
    case 'EMOM':
      return buildEMOMSegments(params);
    case 'AMRAP':
      return buildAMRAPSegments(params);
    case 'INTERVAL_WORK_REST':
      return buildIntervalWorkRestSegments(params);
    case 'TABATA':
      return buildTabataSegments(params);
    case 'FOR_TIME':
      return buildForTimeSegments(params);
    case 'CHIPPER':
      return buildChipperSegments(params);
    case 'LADDER':
      return buildLadderSegments(params);
    case 'DEATH_BY':
      return buildDeathBySegments(params);
    case 'STACKED':
      return buildStackedSegments(params);
    default: {
      return assertUnreachable(params as never);
    }
  }
}

// ============================================================================
// Timer State Management
// ============================================================================

/**
 * Create initial timer state from parameters
 */
export function createInitialTimerState(params: TimerParams): TimerRuntimeState {
  const segments = buildSegmentsFromParams(params);

  return {
    status: 'IDLE',
    segments,
    currentSegmentIndex: 0,
    segmentElapsedMs: 0,
    totalElapsedMs: 0,
    startedAtMs: null,
    pausedAtMs: null,
    pauseAccumulatedMs: 0,
  };
}

/**
 * Start the timer
 * Sets status to RUNNING and initializes timestamps
 */
export function startTimer(
  state: TimerRuntimeState,
  nowMs: number
): TimerRuntimeState {
  // If already running, no-op
  if (state.status === 'RUNNING') {
    return state;
  }

  return {
    ...state,
    status: 'RUNNING',
    startedAtMs: nowMs,
    pausedAtMs: null,
    pauseAccumulatedMs: 0,
    segmentElapsedMs: 0,
    totalElapsedMs: 0,
    currentSegmentIndex: 0,
  };
}

/**
 * Pause the timer
 * Preserves current progress for resume
 */
export function pauseTimer(
  state: TimerRuntimeState,
  nowMs: number
): TimerRuntimeState {
  // Only pause if currently running
  if (state.status !== 'RUNNING') {
    return state;
  }

  return {
    ...state,
    status: 'PAUSED',
    pausedAtMs: nowMs,
  };
}

/**
 * Resume the timer from paused state
 * Accounts for time spent paused
 */
export function resumeTimer(
  state: TimerRuntimeState,
  nowMs: number
): TimerRuntimeState {
  // Only resume if paused
  if (state.status !== 'PAUSED' || state.pausedAtMs === null) {
    return state;
  }

  const pausedDuration = nowMs - state.pausedAtMs;

  return {
    ...state,
    status: 'RUNNING',
    pauseAccumulatedMs: state.pauseAccumulatedMs + Math.max(0, pausedDuration),
    pausedAtMs: null,
  };
}

/**
 * Reset the timer to initial state
 * Preserves segments but resets all progress
 */
export function resetTimer(state: TimerRuntimeState): TimerRuntimeState {
  return {
    ...state,
    status: 'IDLE',
    currentSegmentIndex: 0,
    segmentElapsedMs: 0,
    totalElapsedMs: 0,
    startedAtMs: null,
    pausedAtMs: null,
    pauseAccumulatedMs: 0,
  };
}

/**
 * Compute total duration of all segments in milliseconds
 */
export function computeTotalDurationMs(segments: TimerSegment[]): number {
  return segments.reduce((sum, seg) => sum + seg.durationMs, 0);
}

/**
 * Tick the timer forward
 * Updates current segment and elapsed time based on current timestamp
 * Returns updated state with segment/completion detection
 */
export function tickTimer(
  state: TimerRuntimeState,
  nowMs: number
): TimerRuntimeState {
  // Only tick if running
  if (state.status !== 'RUNNING') {
    return state;
  }

  // Must have valid start time
  if (state.startedAtMs === null) {
    return state;
  }

  // Must have segments
  if (state.segments.length === 0) {
    return state;
  }

  const totalDurationMs = computeTotalDurationMs(state.segments);

  // Calculate effective elapsed time (accounting for pauses)
  const rawElapsed = nowMs - state.startedAtMs - state.pauseAccumulatedMs;
  const effectiveElapsedMs = Math.max(0, rawElapsed);

  // Check if timer is complete
  if (effectiveElapsedMs >= totalDurationMs) {
    const lastIndex = state.segments.length - 1;
    return {
      ...state,
      status: 'COMPLETED',
      currentSegmentIndex: lastIndex,
      totalElapsedMs: totalDurationMs,
      segmentElapsedMs: state.segments[lastIndex].durationMs,
    };
  }

  // Find current segment based on cumulative durations
  let remaining = effectiveElapsedMs;
  let currentIndex = 0;

  for (let i = 0; i < state.segments.length; i++) {
    const seg = state.segments[i];
    if (remaining < seg.durationMs) {
      currentIndex = i;
      break;
    }
    remaining -= seg.durationMs;
  }

  return {
    ...state,
    currentSegmentIndex: currentIndex,
    segmentElapsedMs: remaining,
    totalElapsedMs: effectiveElapsedMs,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get remaining time in current segment (milliseconds)
 */
export function getRemainingInSegmentMs(state: TimerRuntimeState): number {
  const currentSegment = state.segments[state.currentSegmentIndex];
  if (!currentSegment) return 0;

  return Math.max(0, currentSegment.durationMs - state.segmentElapsedMs);
}

/**
 * Get remaining time in entire timer (milliseconds)
 */
export function getTotalRemainingMs(state: TimerRuntimeState): number {
  const totalDuration = computeTotalDurationMs(state.segments);
  return Math.max(0, totalDuration - state.totalElapsedMs);
}

/**
 * Get current segment
 */
export function getCurrentSegment(state: TimerRuntimeState): TimerSegment | null {
  return state.segments[state.currentSegmentIndex] ?? null;
}

/**
 * Get next segment (null if on last segment)
 */
export function getNextSegment(state: TimerRuntimeState): TimerSegment | null {
  return state.segments[state.currentSegmentIndex + 1] ?? null;
}

/**
 * Check if currently on the last segment
 */
export function isLastSegment(state: TimerRuntimeState): boolean {
  return state.currentSegmentIndex === state.segments.length - 1;
}

/**
 * Get progress percentage (0-100)
 */
export function getProgressPercentage(state: TimerRuntimeState): number {
  const totalDuration = computeTotalDurationMs(state.segments);
  if (totalDuration === 0) return 100;

  return Math.min(100, Math.round((state.totalElapsedMs / totalDuration) * 100));
}
