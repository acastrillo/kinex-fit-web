Alright, let’s wire this into Spotter properly 😈

I’ll give you three things in order:

1. **A guide you can paste straight into your Claude Code agent**
2. **Actual TypeScript files** (types, engine, hook, templates)
3. **JSON schema + LLM prompt** so Spotter can auto-pick timers from IG captions

---

## 1️⃣ Guide for Claude Code Agent (copy-paste this)

````text
You are my TypeScript and React/React Native assistant for a workout app.

Goal:
Implement a reusable "Timer" system that works for both web (Next.js/React) and mobile (React Native/Expo). The system should:
- Support several timer types (EMOM, Work/Rest, AMRAP, etc.).
- Attach timers to entire workouts or specific blocks.
- Run via a pure engine that is independent of UI.
- Use a React hook for running timers in the client.
- Be friendly for LLM integration (timer config via JSON).

### FILE STRUCTURE

Create the following files (adjust paths to my repo if needed):

- src/timers/types.ts
- src/timers/templates.ts
- src/timers/engine.ts
- src/timers/useTimerRunner.tsx

Later I’ll integrate these into my existing Workout model & UI.

---

### 1. TIMER TYPES & MODELS (src/timers/types.ts)

Define the core types:

- TimerCategory:
  - 'BASIC' | 'INTERVAL' | 'STRENGTH' | 'RECOVERY' | 'SESSION'

- TimerType:
  - 'STOPWATCH'
  - 'COUNTDOWN'
  - 'INTERVAL_WORK_REST'
  - 'EMOM'
  - 'AMRAP'
  - 'ROUNDS_FOR_TIME'
  - 'TABATA'
  - 'SETS_FIXED_REST'
  - 'DENSITY_BLOCK'
  - 'BREATHING_BOX'
  - 'STRETCH_BLOCK'
  - 'SESSION_CAP'
  - 'BLOCK_TIMER'

Define discriminated union for TimerParams with `kind` field:

- WorkRestParams
- EmomParams
- AmrapParams
- RoundsForTimeParams
- TabataParams
- SetsFixedRestParams
- DensityBlockParams
- BreathingBoxParams
- StretchBlockParams
- SessionCapParams
- BlockTimerParams

Each has fields:
- See in detail in the implementation section below (I’ll provide exact interfaces).

Define:

- interface TimerTemplate
  - id, type, category, name, description
  - defaultParams: TimerParams
  - paramSchema: generic schema used to render forms (simple type info is enough)
  - recommendedFor: string[] (tags like 'hyrox', 'metcon', 'strength', etc.)

- interface TimerSegment
  - id: string
  - label: string
  - kind: 'work' | 'rest' | 'transition' | 'breathing' | 'stretch' | 'meta'
  - durationMs: number
  - order: number
  - loopIndex?: number

- Timer runtime types:
  - TimerStatus: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
  - interface TimerRuntimeState:
    - status: TimerStatus
    - segments: TimerSegment[]
    - currentSegmentIndex: number
    - segmentElapsedMs: number
    - totalElapsedMs: number
    - startedAtMs: number | null
    - pausedAtMs: number | null
    - pauseAccumulatedMs: number

Also define:

- interface WorkoutTimerConfig:
  - id: string
  - templateId: string
  - params: TimerParams
  - scope: 'WORKOUT' | 'BLOCK'
  - blockId?: string

---

### 2. TIMER TEMPLATES (src/timers/templates.ts)

Implement a constant `TIMER_TEMPLATES: TimerTemplate[]` with a few seed templates:

- EMOM_BASIC
  - type: 'EMOM'
  - default: 12 minutes, 60-second interval

- INTERVAL_40_20_X10
  - type: 'INTERVAL_WORK_REST'
  - default: 40s work / 20s rest / 10 rounds

- AMRAP_12
  - type: 'AMRAP'
  - default: 12 min

- BREATHING_BOX_4x4
  - type: 'BREATHING_BOX'
  - default: 4-4-4-4 x 10 cycles

- SESSION_CAP_45
  - type: 'SESSION_CAP'
  - default: 45 minutes

Keep paramSchema simple:
- fields: { name, label, type: 'number' | 'integer', min, max }[]

Also export helper:
- `getTimerTemplateById(id: string): TimerTemplate | undefined`

---

### 3. TIMER ENGINE (src/timers/engine.ts)

Implement pure functions:

- `buildSegmentsFromParams(params: TimerParams): TimerSegment[]`
  - For each `kind`, create segments:
    - INTERVAL_WORK_REST:
      - Alternate work/rest segments for totalRounds
    - EMOM:
      - Each minute/interval is a 'work' segment of intervalSeconds
    - AMRAP:
      - Single 'work' segment of durationSeconds
    - ROUNDS_FOR_TIME:
      - For each round: add 'work' segment (use a label like "Round X")
      - If optionalRestBetweenRoundsSeconds is provided, add 'rest' segment in between
      - If timeCapSeconds exists, you can ignore it in segments, it's just for UX
    - TABATA:
      - work/rest segments repeated for rounds
    - SETS_FIXED_REST:
      - For each set: one 'work' segment with estimatedSetDurationSeconds (or default 30s) + one 'rest' segment of restSeconds
    - DENSITY_BLOCK:
      - Single 'work' segment of blockDurationSeconds
    - BREATHING_BOX:
      - For each cycle: segments for Inhale (breathing), Hold Top (breathing), Exhale (breathing), Hold Bottom (breathing)
    - STRETCH_BLOCK:
      - For each position: one 'stretch' segment of holdSecondsPerPosition
    - SESSION_CAP:
      - Single 'meta' segment of totalSeconds
    - BLOCK_TIMER:
      - For each block: one 'meta' segment with block.durationSeconds

- `createInitialTimerState(params: TimerParams): TimerRuntimeState`
  - Build segments and return a state with:
    - status: 'IDLE'
    - segments
    - currentSegmentIndex: 0
    - segmentElapsedMs: 0
    - totalElapsedMs: 0
    - startedAtMs: null
    - pausedAtMs: null
    - pauseAccumulatedMs: 0

- `startTimer(state: TimerRuntimeState, nowMs: number): TimerRuntimeState`
  - if already RUNNING, return state
  - set:
    - status: 'RUNNING'
    - startedAtMs: nowMs
    - pausedAtMs: null
    - pauseAccumulatedMs: 0
    - segmentElapsedMs = 0
    - totalElapsedMs = 0
    - currentSegmentIndex = 0

- `pauseTimer(state: TimerRuntimeState, nowMs: number): TimerRuntimeState`
  - if not RUNNING, return state
  - set status: 'PAUSED', pausedAtMs: nowMs

- `resumeTimer(state: TimerRuntimeState, nowMs: number): TimerRuntimeState`
  - if not PAUSED or pausedAtMs is null, return state
  - increase pauseAccumulatedMs += nowMs - pausedAtMs
  - set pausedAtMs: null, status: 'RUNNING'

- `resetTimer(state: TimerRuntimeState): TimerRuntimeState`
  - return a new state with same segments but back to IDLE:
    - status: 'IDLE'
    - currentSegmentIndex = 0
    - segmentElapsedMs = 0
    - totalElapsedMs = 0
    - startedAtMs = null
    - pausedAtMs = null
    - pauseAccumulatedMs = 0

- `tickTimer(state: TimerRuntimeState, nowMs: number): TimerRuntimeState`
  - If state.status !== 'RUNNING' or startedAtMs is null → return state.
  - Compute effective elapsed:
    - effectiveElapsedMs = nowMs - startedAtMs - pauseAccumulatedMs
    - If effectiveElapsedMs < 0, clamp to 0
  - Compute which segment we’re in:
    - Iterate segments and subtract durations until remaining time falls inside a segment.
    - currentSegmentIndex = that index
    - segmentElapsedMs = remainingWithinSegment
    - totalElapsedMs = effectiveElapsedMs
  - If effectiveElapsedMs >= totalDurationMs (sum of all segment durations):
    - status: 'COMPLETED'
    - currentSegmentIndex: last segment index
    - segmentElapsedMs: last segment durationMs
  - Return updated state.

Export all helpers for testing.

---

### 4. REACT HOOK (src/timers/useTimerRunner.tsx)

Implement a hook that wraps the engine:

- `useTimerRunner(params: TimerParams | null)`

Behavior:
- If `params` is null → return an IDLE state and no-op controls.
- On mount or when params change:
  - create fresh initial state via `createInitialTimerState(params)`
- Maintain state with `useState`.
- `useEffect`:
  - If state.status !== 'RUNNING', do nothing.
  - Else setInterval to call `setState(prev => tickTimer(prev, Date.now()))` every 200ms.
  - Clear interval on unmount or when status changes.

Return from hook:

```ts
{
  state,            // TimerRuntimeState
  start: () => void,
  pause: () => void,
  resume: () => void,
  reset: () => void,
  isLastSegment: boolean,
  currentSegment: TimerSegment | null,
  nextSegment: TimerSegment | null,
  totalDurationMs: number
}
````

Compute totalDurationMs once from segments.

The hook must be UI-agnostic so I can use it in /web and /mobile.

---

### 5. BASIC TESTING / VALIDATION

At minimum:

* For Work/Rest 30/30 x 2:

  * buildSegmentsFromParams → 4 segments (work, rest, work, rest).
  * Each duration correct.
  * totalDurationMs = 120, and tickTimer at t=0, 29s, 30s, 59s, 60s, 90s, 120s works as expected.

* For EMOM 3 min (60-second intervals):

  * 3 segments of 60s each.
  * At 150s → index 2.
  * At 181s → status COMPLETED.

---

When you implement, prioritize:

* Type correctness
* Clear comments
* No UI-specific assumptions

I’ll handle UI layer and workout integration separately.

````

---

## 2️⃣ Actual TypeScript Files

You can use these directly or point Claude at them as a reference.

---

### `src/timers/types.ts`

```ts
// src/timers/types.ts

export type TimerCategory =
  | 'BASIC'
  | 'INTERVAL'
  | 'STRENGTH'
  | 'RECOVERY'
  | 'SESSION';

export type TimerType =
  | 'STOPWATCH'
  | 'COUNTDOWN'
  | 'INTERVAL_WORK_REST'
  | 'EMOM'
  | 'AMRAP'
  | 'ROUNDS_FOR_TIME'
  | 'TABATA'
  | 'SETS_FIXED_REST'
  | 'DENSITY_BLOCK'
  | 'BREATHING_BOX'
  | 'STRETCH_BLOCK'
  | 'SESSION_CAP'
  | 'BLOCK_TIMER';

// -------- Timer parameter unions (discriminated by `kind`) --------

export interface WorkRestParams {
  kind: 'INTERVAL_WORK_REST';
  workSeconds: number;
  restSeconds: number;
  totalRounds: number;
}

export interface EmomParams {
  kind: 'EMOM';
  intervalSeconds: number;  // usually 60
  totalMinutes: number;     // or totalRounds; we keep minutes for simplicity
}

export interface AmrapParams {
  kind: 'AMRAP';
  durationSeconds: number;
}

export interface RoundsForTimeParams {
  kind: 'ROUNDS_FOR_TIME';
  rounds: number;
  optionalRestBetweenRoundsSeconds?: number;
  timeCapSeconds?: number | null; // used for UX, not required for segments
}

export interface TabataParams {
  kind: 'TABATA';
  workSeconds: number;
  restSeconds: number;
  rounds: number;
}

export interface SetsFixedRestParams {
  kind: 'SETS_FIXED_REST';
  sets: number;
  restSeconds: number;
  estimatedSetDurationSeconds?: number; // if not provided, default ~30s
}

export interface DensityBlockParams {
  kind: 'DENSITY_BLOCK';
  blockDurationSeconds: number;
}

export interface BreathingBoxParams {
  kind: 'BREATHING_BOX';
  inhaleSeconds: number;
  holdTopSeconds: number;
  exhaleSeconds: number;
  holdBottomSeconds: number;
  totalCycles: number;
}

export interface StretchBlockParams {
  kind: 'STRETCH_BLOCK';
  holdSecondsPerPosition: number;
  totalPositions: number;
}

export interface SessionCapParams {
  kind: 'SESSION_CAP';
  totalSeconds: number;
}

export interface BlockTimerParams {
  kind: 'BLOCK_TIMER';
  blocks: {
    id: string;
    label: string;
    durationSeconds: number;
  }[];
}

/**
 * Union of all supported timer parameter types.
 */
export type TimerParams =
  | WorkRestParams
  | EmomParams
  | AmrapParams
  | RoundsForTimeParams
  | TabataParams
  | SetsFixedRestParams
  | DensityBlockParams
  | BreathingBoxParams
  | StretchBlockParams
  | SessionCapParams
  | BlockTimerParams;

// -------- Template / schema definitions --------

export type TimerParamFieldType = 'number' | 'integer';

export interface TimerParamFieldSchema {
  name: string;
  label: string;
  type: TimerParamFieldType;
  min?: number;
  max?: number;
  step?: number;
}

export interface TimerParamSchema {
  fields: TimerParamFieldSchema[];
}

export interface TimerTemplate {
  id: string;
  type: TimerType;
  category: TimerCategory;
  name: string;
  description: string;
  defaultParams: TimerParams;
  paramSchema: TimerParamSchema;
  recommendedFor: string[]; // e.g. ['hyrox', 'metcon', 'strength']
}

// -------- Segments & runtime state --------

export type SegmentKind =
  | 'work'
  | 'rest'
  | 'transition'
  | 'breathing'
  | 'stretch'
  | 'meta';

export interface TimerSegment {
  id: string;
  label: string;
  kind: SegmentKind;
  durationMs: number;
  order: number;
  loopIndex?: number; // for repeated patterns (round #, cycle #, etc.)
}

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

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

// -------- Timer config attached to a workout --------

export type TimerScope = 'WORKOUT' | 'BLOCK';

export interface WorkoutTimerConfig {
  id: string;
  templateId: string;
  params: TimerParams;
  scope: TimerScope;
  blockId?: string;
}
````

---

### `src/timers/templates.ts`

```ts
// src/timers/templates.ts

import {
  TimerTemplate,
  TimerParams,
} from './types';

export const TIMER_TEMPLATES: TimerTemplate[] = [
  {
    id: 'EMOM_BASIC',
    type: 'EMOM',
    category: 'INTERVAL',
    name: 'EMOM',
    description:
      'Every interval, complete your work, then rest for the remainder.',
    defaultParams: {
      kind: 'EMOM',
      intervalSeconds: 60,
      totalMinutes: 12,
    },
    paramSchema: {
      fields: [
        {
          name: 'totalMinutes',
          label: 'Total minutes',
          type: 'integer',
          min: 1,
          max: 60,
        },
        {
          name: 'intervalSeconds',
          label: 'Interval length (seconds)',
          type: 'integer',
          min: 15,
          max: 180,
        },
      ],
    },
    recommendedFor: ['hyrox', 'metcon', 'conditioning'],
  },
  {
    id: 'INTERVAL_40_20_X10',
    type: 'INTERVAL_WORK_REST',
    category: 'INTERVAL',
    name: '40/20 x10',
    description: 'Classic 40s work, 20s rest, for 10 rounds.',
    defaultParams: {
      kind: 'INTERVAL_WORK_REST',
      workSeconds: 40,
      restSeconds: 20,
      totalRounds: 10,
    },
    paramSchema: {
      fields: [
        {
          name: 'workSeconds',
          label: 'Work (seconds)',
          type: 'integer',
          min: 5,
          max: 600,
        },
        {
          name: 'restSeconds',
          label: 'Rest (seconds)',
          type: 'integer',
          min: 0,
          max: 600,
        },
        {
          name: 'totalRounds',
          label: 'Total rounds',
          type: 'integer',
          min: 1,
          max: 100,
        },
      ],
    },
    recommendedFor: ['hyrox', 'metcon', 'conditioning'],
  },
  {
    id: 'AMRAP_12',
    type: 'AMRAP',
    category: 'INTERVAL',
    name: '12 min AMRAP',
    description: 'Complete as many rounds as possible in 12 minutes.',
    defaultParams: {
      kind: 'AMRAP',
      durationSeconds: 12 * 60,
    },
    paramSchema: {
      fields: [
        {
          name: 'durationSeconds',
          label: 'Duration (seconds)',
          type: 'integer',
          min: 60,
          max: 3600,
        },
      ],
    },
    recommendedFor: ['hyrox', 'metcon'],
  },
  {
    id: 'BREATHING_BOX_4X4',
    type: 'BREATHING_BOX',
    category: 'RECOVERY',
    name: 'Box Breathing 4-4-4-4',
    description:
      'Inhale, hold, exhale, hold – 4 seconds each, repeated for calming.',
    defaultParams: {
      kind: 'BREATHING_BOX',
      inhaleSeconds: 4,
      holdTopSeconds: 4,
      exhaleSeconds: 4,
      holdBottomSeconds: 4,
      totalCycles: 10,
    },
    paramSchema: {
      fields: [
        {
          name: 'inhaleSeconds',
          label: 'Inhale (seconds)',
          type: 'integer',
          min: 2,
          max: 10,
        },
        {
          name: 'holdTopSeconds',
          label: 'Hold (top) seconds',
          type: 'integer',
          min: 0,
          max: 15,
        },
        {
          name: 'exhaleSeconds',
          label: 'Exhale (seconds)',
          type: 'integer',
          min: 2,
          max: 10,
        },
        {
          name: 'holdBottomSeconds',
          label: 'Hold (bottom) seconds',
          type: 'integer',
          min: 0,
          max: 15,
        },
        {
          name: 'totalCycles',
          label: 'Total cycles',
          type: 'integer',
          min: 1,
          max: 50,
        },
      ],
    },
    recommendedFor: ['recovery', 'cooldown'],
  },
  {
    id: 'SESSION_CAP_45',
    type: 'SESSION_CAP',
    category: 'SESSION',
    name: '45 min Session Cap',
    description: 'A hard cap of 45 minutes for the full session.',
    defaultParams: {
      kind: 'SESSION_CAP',
      totalSeconds: 45 * 60,
    },
    paramSchema: {
      fields: [
        {
          name: 'totalSeconds',
          label: 'Total session length (seconds)',
          type: 'integer',
          min: 5 * 60,
          max: 3 * 60 * 60,
        },
      ],
    },
    recommendedFor: ['time-boxing', 'planning'],
  },
];

export function getTimerTemplateById(
  id: string,
): TimerTemplate | undefined {
  return TIMER_TEMPLATES.find((t) => t.id === id);
}

// Optionally: helper to merge custom params onto default params safely
export function mergeTimerParams<T extends TimerParams>(
  defaultParams: T,
  overrides: Partial<T> | undefined,
): T {
  return {
    ...defaultParams,
    ...(overrides ?? {}),
  };
}
```

---

### `src/timers/engine.ts`

```ts
// src/timers/engine.ts

import {
  TimerParams,
  WorkRestParams,
  EmomParams,
  AmrapParams,
  RoundsForTimeParams,
  TabataParams,
  SetsFixedRestParams,
  DensityBlockParams,
  BreathingBoxParams,
  StretchBlockParams,
  SessionCapParams,
  BlockTimerParams,
  TimerSegment,
  TimerRuntimeState,
  SegmentKind,
} from './types';

let segmentIdCounter = 0;
function nextSegmentId() {
  segmentIdCounter += 1;
  return `seg_${segmentIdCounter}`;
}

function createSegment(
  label: string,
  kind: SegmentKind,
  durationSeconds: number,
  order: number,
  loopIndex?: number,
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

// ----- Builders for each param kind -----

function buildWorkRestSegments(
  params: WorkRestParams,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;
  for (let round = 1; round <= params.totalRounds; round++) {
    segments.push(
      createSegment(
        `Work ${round}`,
        'work',
        params.workSeconds,
        order++,
        round,
      ),
    );
    if (params.restSeconds > 0) {
      segments.push(
        createSegment(
          `Rest ${round}`,
          'rest',
          params.restSeconds,
          order++,
          round,
        ),
      );
    }
  }
  return segments;
}

function buildEmomSegments(params: EmomParams): TimerSegment[] {
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
        round,
      ),
    );
  }
  return segments;
}

function buildAmrapSegments(params: AmrapParams): TimerSegment[] {
  return [
    createSegment(
      'AMRAP',
      'work',
      params.durationSeconds,
      0,
      1,
    ),
  ];
}

function buildRoundsForTimeSegments(
  params: RoundsForTimeParams,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  // We can't know actual work duration per round; treat each as a placeholder
  const assumedRoundSeconds = 60; // purely UX; can be adjusted later

  for (let round = 1; round <= params.rounds; round++) {
    segments.push(
      createSegment(
        `Round ${round}`,
        'work',
        assumedRoundSeconds,
        order++,
        round,
      ),
    );
    if (
      params.optionalRestBetweenRoundsSeconds &&
      round < params.rounds
    ) {
      segments.push(
        createSegment(
          `Rest after round ${round}`,
          'rest',
          params.optionalRestBetweenRoundsSeconds,
          order++,
          round,
        ),
      );
    }
  }

  // Time cap is a UX concern; if we want, we could replace total duration
  // with the cap, but for now we keep it as an external constraint.

  return segments;
}

function buildTabataSegments(
  params: TabataParams,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;
  for (let round = 1; round <= params.rounds; round++) {
    segments.push(
      createSegment(
        `Work ${round}`,
        'work',
        params.workSeconds,
        order++,
        round,
      ),
    );
    if (params.restSeconds > 0) {
      segments.push(
        createSegment(
          `Rest ${round}`,
          'rest',
          params.restSeconds,
          order++,
          round,
        ),
      );
    }
  }
  return segments;
}

function buildSetsFixedRestSegments(
  params: SetsFixedRestParams,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;
  const workSeconds =
    params.estimatedSetDurationSeconds ?? 30;

  for (let set = 1; set <= params.sets; set++) {
    segments.push(
      createSegment(
        `Set ${set}`,
        'work',
        workSeconds,
        order++,
        set,
      ),
    );
    if (params.restSeconds > 0 && set < params.sets) {
      segments.push(
        createSegment(
          `Rest after set ${set}`,
          'rest',
          params.restSeconds,
          order++,
          set,
        ),
      );
    }
  }

  return segments;
}

function buildDensityBlockSegments(
  params: DensityBlockParams,
): TimerSegment[] {
  return [
    createSegment(
      'Density block',
      'work',
      params.blockDurationSeconds,
      0,
      1,
    ),
  ];
}

function buildBreathingBoxSegments(
  params: BreathingBoxParams,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;

  for (let cycle = 1; cycle <= params.totalCycles; cycle++) {
    if (params.inhaleSeconds > 0) {
      segments.push(
        createSegment(
          `Inhale (cycle ${cycle})`,
          'breathing',
          params.inhaleSeconds,
          order++,
          cycle,
        ),
      );
    }
    if (params.holdTopSeconds > 0) {
      segments.push(
        createSegment(
          `Hold (top, cycle ${cycle})`,
          'breathing',
          params.holdTopSeconds,
          order++,
          cycle,
        ),
      );
    }
    if (params.exhaleSeconds > 0) {
      segments.push(
        createSegment(
          `Exhale (cycle ${cycle})`,
          'breathing',
          params.exhaleSeconds,
          order++,
          cycle,
        ),
      );
    }
    if (params.holdBottomSeconds > 0) {
      segments.push(
        createSegment(
          `Hold (bottom, cycle ${cycle})`,
          'breathing',
          params.holdBottomSeconds,
          order++,
          cycle,
        ),
      );
    }
  }

  return segments;
}

function buildStretchBlockSegments(
  params: StretchBlockParams,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;
  for (let pos = 1; pos <= params.totalPositions; pos++) {
    segments.push(
      createSegment(
        `Position ${pos}`,
        'stretch',
        params.holdSecondsPerPosition,
        order++,
        pos,
      ),
    );
  }
  return segments;
}

function buildSessionCapSegments(
  params: SessionCapParams,
): TimerSegment[] {
  return [
    createSegment(
      'Session cap',
      'meta',
      params.totalSeconds,
      0,
      1,
    ),
  ];
}

function buildBlockTimerSegments(
  params: BlockTimerParams,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  let order = 0;
  params.blocks.forEach((block, index) => {
    segments.push(
      createSegment(
        block.label,
        'meta',
        block.durationSeconds,
        order++,
        index + 1,
      ),
    );
  });
  return segments;
}

// ----- Public builder -----

export function buildSegmentsFromParams(
  params: TimerParams,
): TimerSegment[] {
  switch (params.kind) {
    case 'INTERVAL_WORK_REST':
      return buildWorkRestSegments(params);
    case 'EMOM':
      return buildEmomSegments(params);
    case 'AMRAP':
      return buildAmrapSegments(params);
    case 'ROUNDS_FOR_TIME':
      return buildRoundsForTimeSegments(params);
    case 'TABATA':
      return buildTabataSegments(params);
    case 'SETS_FIXED_REST':
      return buildSetsFixedRestSegments(params);
    case 'DENSITY_BLOCK':
      return buildDensityBlockSegments(params);
    case 'BREATHING_BOX':
      return buildBreathingBoxSegments(params);
    case 'STRETCH_BLOCK':
      return buildStretchBlockSegments(params);
    case 'SESSION_CAP':
      return buildSessionCapSegments(params);
    case 'BLOCK_TIMER':
      return buildBlockTimerSegments(params);
    default: {
      const _exhaustiveCheck: never = params;
      throw new Error(
        `Unsupported timer params kind: ${(params as any).kind}`,
      );
    }
  }
}

// ----- Runtime state helpers -----

export function createInitialTimerState(
  params: TimerParams,
): TimerRuntimeState {
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

export function startTimer(
  state: TimerRuntimeState,
  nowMs: number,
): TimerRuntimeState {
  if (state.status === 'RUNNING') return state;

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

export function pauseTimer(
  state: TimerRuntimeState,
  nowMs: number,
): TimerRuntimeState {
  if (state.status !== 'RUNNING') return state;
  return {
    ...state,
    status: 'PAUSED',
    pausedAtMs: nowMs,
  };
}

export function resumeTimer(
  state: TimerRuntimeState,
  nowMs: number,
): TimerRuntimeState {
  if (state.status !== 'PAUSED' || state.pausedAtMs == null) {
    return state;
  }

  const pausedDuration = nowMs - state.pausedAtMs;
  return {
    ...state,
    status: 'RUNNING',
    pauseAccumulatedMs:
      state.pauseAccumulatedMs + Math.max(0, pausedDuration),
    pausedAtMs: null,
  };
}

export function resetTimer(
  state: TimerRuntimeState,
): TimerRuntimeState {
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

export function computeTotalDurationMs(
  segments: TimerSegment[],
): number {
  return segments.reduce(
    (sum, seg) => sum + seg.durationMs,
    0,
  );
}

export function tickTimer(
  state: TimerRuntimeState,
  nowMs: number,
): TimerRuntimeState {
  if (state.status !== 'RUNNING') return state;
  if (state.startedAtMs == null) return state;
  if (state.segments.length === 0) return state;

  const totalDurationMs = computeTotalDurationMs(
    state.segments,
  );

  const rawElapsed =
    nowMs - state.startedAtMs - state.pauseAccumulatedMs;
  const effectiveElapsedMs = Math.max(0, rawElapsed);

  if (effectiveElapsedMs >= totalDurationMs) {
    // Timer complete
    const lastIndex = state.segments.length - 1;
    return {
      ...state,
      status: 'COMPLETED',
      currentSegmentIndex: lastIndex,
      totalElapsedMs: totalDurationMs,
      segmentElapsedMs: state.segments[lastIndex].durationMs,
    };
  }

  // Find segment based on cumulative durations
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

  const currentSegment = state.segments[currentIndex];

  return {
    ...state,
    currentSegmentIndex: currentIndex,
    segmentElapsedMs: remaining,
    totalElapsedMs: effectiveElapsedMs,
  };
}
```

---

### `src/timers/useTimerRunner.tsx`

```ts
// src/timers/useTimerRunner.tsx

import { useEffect, useMemo, useState } from 'react';
import {
  TimerParams,
  TimerRuntimeState,
  TimerSegment,
} from './types';
import {
  createInitialTimerState,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  tickTimer,
  computeTotalDurationMs,
} from './engine';

interface UseTimerRunnerResult {
  state: TimerRuntimeState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  isLastSegment: boolean;
  currentSegment: TimerSegment | null;
  nextSegment: TimerSegment | null;
  totalDurationMs: number;
}

/**
 * Hook to run a timer on the client using the pure engine.
 * Works for both web and React Native.
 */
export function useTimerRunner(
  params: TimerParams | null,
): UseTimerRunnerResult {
  const [state, setState] = useState<TimerRuntimeState>(() =>
    params
      ? createInitialTimerState(params)
      : createInitialTimerState({
          kind: 'AMRAP',
          durationSeconds: 0,
        }),
  );

  // Re-init when params change
  useEffect(() => {
    if (!params) return;
    setState(createInitialTimerState(params));
  }, [params]);

  // Tick loop
  useEffect(() => {
    if (state.status !== 'RUNNING') return;

    const intervalMs = 200;
    const id = setInterval(() => {
      setState((prev) => tickTimer(prev, Date.now()));
    }, intervalMs);

    return () => clearInterval(id);
  }, [state.status]);

  const totalDurationMs = useMemo(
    () => computeTotalDurationMs(state.segments),
    [state.segments],
  );

  const currentSegment: TimerSegment | null =
    state.segments[state.currentSegmentIndex] ?? null;

  const nextSegment: TimerSegment | null =
    state.segments[state.currentSegmentIndex + 1] ?? null;

  const isLastSegment =
    state.currentSegmentIndex === state.segments.length - 1;

  const handleStart = () => {
    setState((prev) => startTimer(prev, Date.now()));
  };

  const handlePause = () => {
    setState((prev) => pauseTimer(prev, Date.now()));
  };

  const handleResume = () => {
    setState((prev) => resumeTimer(prev, Date.now()));
  };

  const handleReset = () => {
    setState((prev) => resetTimer(prev));
  };

  return {
    state,
    start: handleStart,
    pause: handlePause,
    resume: handleResume,
    reset: handleReset,
    isLastSegment,
    currentSegment,
    nextSegment,
    totalDurationMs,
  };
}
```

---

## 3️⃣ JSON Schema + Prompt for Spotter (Timer Auto-Pick from IG Caption)

### 3.1 JSON Output Shape

When your IG caption parser runs, you want an object roughly like:

```json
{
  "workout_style": "hyrox",
  "primary_goal": "conditioning",
  "suggested_timer": {
    "type": "EMOM",
    "reason": "Caption describes repeated stations with fixed time windows typical of Hyrox/metcon.",
    "params": {
      "kind": "EMOM",
      "intervalSeconds": 60,
      "totalMinutes": 20
    }
  }
}
```

Here’s a **concrete JSON schema** (conceptual, not strict JSON Schema draft):

```json
{
  "type": "object",
  "properties": {
    "workout_style": {
      "type": "string",
      "enum": [
        "hyrox",
        "metcon",
        "strength",
        "endurance",
        "recovery",
        "mixed",
        "unknown"
      ]
    },
    "primary_goal": {
      "type": "string",
      "enum": [
        "conditioning",
        "strength",
        "hypertrophy",
        "mobility",
        "skill",
        "mixed",
        "unknown"
      ]
    },
    "suggested_timer": {
      "type": ["object", "null"],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "INTERVAL_WORK_REST",
            "EMOM",
            "AMRAP",
            "ROUNDS_FOR_TIME",
            "TABATA",
            "SETS_FIXED_REST",
            "DENSITY_BLOCK",
            "BREATHING_BOX",
            "STRETCH_BLOCK",
            "SESSION_CAP",
            "BLOCK_TIMER"
          ]
        },
        "reason": { "type": "string" },
        "params": {
          "oneOf": [
            {
              "description": "INTERVAL_WORK_REST",
              "type": "object",
              "properties": {
                "kind": { "const": "INTERVAL_WORK_REST" },
                "workSeconds": { "type": "integer" },
                "restSeconds": { "type": "integer" },
                "totalRounds": { "type": "integer" }
              },
              "required": [
                "kind",
                "workSeconds",
                "restSeconds",
                "totalRounds"
              ]
            },
            {
              "description": "EMOM",
              "type": "object",
              "properties": {
                "kind": { "const": "EMOM" },
                "intervalSeconds": { "type": "integer" },
                "totalMinutes": { "type": "integer" }
              },
              "required": [
                "kind",
                "intervalSeconds",
                "totalMinutes"
              ]
            },
            {
              "description": "AMRAP",
              "type": "object",
              "properties": {
                "kind": { "const": "AMRAP" },
                "durationSeconds": { "type": "integer" }
              },
              "required": ["kind", "durationSeconds"]
            },
            {
              "description": "ROUNDS_FOR_TIME",
              "type": "object",
              "properties": {
                "kind": { "const": "ROUNDS_FOR_TIME" },
                "rounds": { "type": "integer" },
                "optionalRestBetweenRoundsSeconds": {
                  "type": ["integer", "null"]
                },
                "timeCapSeconds": {
                  "type": ["integer", "null"]
                }
              },
              "required": ["kind", "rounds"]
            },
            {
              "description": "TABATA",
              "type": "object",
              "properties": {
                "kind": { "const": "TABATA" },
                "workSeconds": { "type": "integer" },
                "restSeconds": { "type": "integer" },
                "rounds": { "type": "integer" }
              },
              "required": [
                "kind",
                "workSeconds",
                "restSeconds",
                "rounds"
              ]
            },
            {
              "description": "SETS_FIXED_REST",
              "type": "object",
              "properties": {
                "kind": { "const": "SETS_FIXED_REST" },
                "sets": { "type": "integer" },
                "restSeconds": { "type": "integer" },
                "estimatedSetDurationSeconds": {
                  "type": ["integer", "null"]
                }
              },
              "required": ["kind", "sets", "restSeconds"]
            },
            {
              "description": "DENSITY_BLOCK",
              "type": "object",
              "properties": {
                "kind": { "const": "DENSITY_BLOCK" },
                "blockDurationSeconds": { "type": "integer" }
              },
              "required": ["kind", "blockDurationSeconds"]
            },
            {
              "description": "BREATHING_BOX",
              "type": "object",
              "properties": {
                "kind": { "const": "BREATHING_BOX" },
                "inhaleSeconds": { "type": "integer" },
                "holdTopSeconds": { "type": "integer" },
                "exhaleSeconds": { "type": "integer" },
                "holdBottomSeconds": { "type": "integer" },
                "totalCycles": { "type": "integer" }
              },
              "required": [
                "kind",
                "inhaleSeconds",
                "holdTopSeconds",
                "exhaleSeconds",
                "holdBottomSeconds",
                "totalCycles"
              ]
            },
            {
              "description": "STRETCH_BLOCK",
              "type": "object",
              "properties": {
                "kind": { "const": "STRETCH_BLOCK" },
                "holdSecondsPerPosition": {
                  "type": "integer"
                },
                "totalPositions": { "type": "integer" }
              },
              "required": [
                "kind",
                "holdSecondsPerPosition",
                "totalPositions"
              ]
            },
            {
              "description": "SESSION_CAP",
              "type": "object",
              "properties": {
                "kind": { "const": "SESSION_CAP" },
                "totalSeconds": { "type": "integer" }
              },
              "required": ["kind", "totalSeconds"]
            }
          ]
        }
      },
      "required": ["type", "reason", "params"]
    }
  },
  "required": ["workout_style", "primary_goal", "suggested_timer"]
}
```

You don’t have to implement full JSON Schema validation; just keep this as your mental model and TS types.

---

### 3.2 Prompt Template for Spotter Timer Agent

You can use something like this for your LLM agent that parses IG captions:

```text
You are Spotter's Workout Timer Agent.

Your job:
- Read a social media workout caption and any parsed workout data.
- Infer the workout style and primary goal.
- Decide whether to recommend a workout timer (EMOM, AMRAP, intervals, etc.).
- Output a JSON object that follows the exact structure described below, with no extra keys or text.

Workout styles (workout_style):
- "hyrox"       → Hyrox-style stations, sleds, runs, wall balls, ski erg, rower.
- "metcon"      → CrossFit / bootcamp style mixed-modal conditioning.
- "strength"    → Heavy lifting, sets and reps, long rests.
- "endurance"   → Long runs, rows, rides, distance emphasis.
- "recovery"    → Mobility, stretching, breathing.
- "mixed"       → A blend of multiple styles.
- "unknown"     → Not clear.

Primary goals (primary_goal):
- "conditioning"
- "strength"
- "hypertrophy"
- "mobility"
- "skill"
- "mixed"
- "unknown"

Timer types you can choose from (suggested_timer.type):
- "INTERVAL_WORK_REST"
- "EMOM"
- "AMRAP"
- "ROUNDS_FOR_TIME"
- "TABATA"
- "SETS_FIXED_REST"
- "DENSITY_BLOCK"
- "BREATHING_BOX"
- "STRETCH_BLOCK"
- "SESSION_CAP"

Timer params must respect these rules:

- INTERVAL_WORK_REST:
  - params.kind = "INTERVAL_WORK_REST"
  - workSeconds: integer
  - restSeconds: integer
  - totalRounds: integer

- EMOM:
  - params.kind = "EMOM"
  - intervalSeconds: integer
  - totalMinutes: integer

- AMRAP:
  - params.kind = "AMRAP"
  - durationSeconds: integer

- ROUNDS_FOR_TIME:
  - params.kind = "ROUNDS_FOR_TIME"
  - rounds: integer
  - optionalRestBetweenRoundsSeconds: integer or null
  - timeCapSeconds: integer or null

- TABATA:
  - params.kind = "TABATA"
  - workSeconds: integer
  - restSeconds: integer
  - rounds: integer

- SETS_FIXED_REST:
  - params.kind = "SETS_FIXED_REST"
  - sets: integer
  - restSeconds: integer
  - estimatedSetDurationSeconds: integer or null

- DENSITY_BLOCK:
  - params.kind = "DENSITY_BLOCK"
  - blockDurationSeconds: integer

- BREATHING_BOX:
  - params.kind = "BREATHING_BOX"
  - inhaleSeconds: integer
  - holdTopSeconds: integer
  - exhaleSeconds: integer
  - holdBottomSeconds: integer
  - totalCycles: integer

- STRETCH_BLOCK:
  - params.kind = "STRETCH_BLOCK"
  - holdSecondsPerPosition: integer
  - totalPositions: integer

- SESSION_CAP:
  - params.kind = "SESSION_CAP"
  - totalSeconds: integer

If the caption obviously suggests a certain style, pick a timer consistent with it, for example:
- Hyrox / metcon with multiple stations and fixed distance runs:
  - EMOM, AMRAP, INTERVAL_WORK_REST, or ROUNDS_FOR_TIME.
- Strength with sets & reps:
  - SETS_FIXED_REST, DENSITY_BLOCK, or SESSION_CAP.
- Recovery / mobility:
  - STRETCH_BLOCK or BREATHING_BOX.

If no timer is appropriate, set "suggested_timer" to null.

You MUST output valid JSON ONLY, following this shape:

{
  "workout_style": "hyrox | metcon | strength | endurance | recovery | mixed | unknown",
  "primary_goal": "conditioning | strength | hypertrophy | mobility | skill | mixed | unknown",
  "suggested_timer": {
    "type": "INTERVAL_WORK_REST | EMOM | AMRAP | ROUNDS_FOR_TIME | TABATA | SETS_FIXED_REST | DENSITY_BLOCK | BREATHING_BOX | STRETCH_BLOCK | SESSION_CAP",
    "reason": "Short natural language explanation of why this timer matches the workout.",
    "params": { ...one of the timer param schemas above... }
  }
}

If no timer fits logically, use:
{
  "workout_style": "...",
  "primary_goal": "...",
  "suggested_timer": null
}

Now I will give you:
1) The raw caption text.
2) Any structured workout data the parser already extracted.

You respond with JSON only.
```

---

If you want, next step I can wire this into your existing `Workout` type (with blocks) and sketch a basic Timer UI component (web + RN) that uses `useTimerRunner` and shows progress + segment labels.
