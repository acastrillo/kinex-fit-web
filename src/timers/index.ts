/**
 * Timer System - Public API
 *
 * Platform-agnostic timer engine for workout timers.
 * Zero browser/DOM dependencies - works in React Native.
 */

// Export types
export type {
  TimerCategory,
  TimerType,
  EMOMParams,
  AMRAPParams,
  IntervalWorkRestParams,
  TabataParams,
  ForTimeParams,
  ChipperParams,
  LadderParams,
  DeathByParams,
  SingleTimerParams,
  StackedParams,
  TimerParams,
  SegmentKind,
  TimerSegment,
  TimerStatus,
  TimerRuntimeState,
  TimerParamFieldType,
  TimerParamFieldSchema,
  TimerParamSchema,
  TimerTemplate,
  TimerScope,
  WorkoutTimerConfig,
} from './types';

// Export templates and helpers
export {
  TIMER_TEMPLATES,
  getTimerTemplateById,
  getTemplatesByType,
  getTemplatesByCategory,
  getTemplatesByTags,
  mergeTimerParams,
} from './templates';

// Export engine functions
export {
  buildSegmentsFromParams,
  createInitialTimerState,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  tickTimer,
  computeTotalDurationMs,
  getRemainingInSegmentMs,
  getTotalRemainingMs,
  getCurrentSegment,
  getNextSegment,
  isLastSegment,
  getProgressPercentage,
  resetSegmentIdCounter,
} from './engine';
