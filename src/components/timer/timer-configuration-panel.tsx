"use client";

/**
 * Timer Configuration Panel
 *
 * Configurable form for timer parameters based on selected timer type.
 * Allows users to customize duration, rounds, intervals, etc.
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Timer,
  Plus,
  Minus,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TimerParams,
  EMOMParams,
  AMRAPParams,
  TabataParams,
  IntervalWorkRestParams,
  ForTimeParams,
  ChipperParams,
  LadderParams,
  DeathByParams,
  StackedParams,
} from '@/timers';
import type { ExtendedTimerType } from '@/types/timer-session';

// ============================================================================
// Types
// ============================================================================

export interface TimerConfigurationPanelProps {
  timerType: ExtendedTimerType;
  initialParams?: TimerParams;
  onParamsChange: (params: TimerParams) => void;
  onStart?: () => void;
  showStartButton?: boolean;
  exercises?: Array<{ id: string; name: string }>;
}

// ============================================================================
// Default Parameters for Each Timer Type
// ============================================================================

function getDefaultParams(type: ExtendedTimerType): TimerParams {
  switch (type) {
    case 'EMOM':
      return { kind: 'EMOM', intervalSeconds: 60, totalMinutes: 12 };
    case 'AMRAP':
      return { kind: 'AMRAP', durationSeconds: 12 * 60 };
    case 'TABATA':
      return { kind: 'TABATA', workSeconds: 20, restSeconds: 10, rounds: 8 };
    case 'INTERVAL_WORK_REST':
      return { kind: 'INTERVAL_WORK_REST', workSeconds: 40, restSeconds: 20, totalRounds: 10 };
    case 'FOR_TIME':
      return { kind: 'FOR_TIME', timeCapSeconds: 20 * 60 };
    case 'CHIPPER':
      return { kind: 'CHIPPER', exercises: [], timeCapSeconds: 30 * 60 };
    case 'LADDER':
      return { kind: 'LADDER', pattern: [21, 15, 9], direction: 'descending' };
    case 'DEATH_BY':
      return { kind: 'DEATH_BY', exerciseName: 'Burpees', startingReps: 1, incrementPerMinute: 1, maxMinutes: 20 };
    case 'STACKED':
      return { kind: 'STACKED', blocks: [] };
    default:
      return { kind: 'AMRAP', durationSeconds: 12 * 60 };
  }
}

// ============================================================================
// Helper Components
// ============================================================================

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

function NumberInput({
  label,
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  suffix,
}: NumberInputProps) {
  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const num = parseInt(e.target.value, 10);
              if (!isNaN(num) && num >= min && num <= max) {
                onChange(num);
              }
            }}
            className="text-center text-lg font-mono pr-12"
            min={min}
            max={max}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

// ============================================================================
// Timer-Specific Configuration Forms
// ============================================================================

function EMOMConfiguration({
  params,
  onChange,
}: {
  params: EMOMParams;
  onChange: (params: EMOMParams) => void;
}) {
  return (
    <div className="space-y-4">
      <NumberInput
        label="Total Minutes"
        value={params.totalMinutes}
        onChange={(v) => onChange({ ...params, totalMinutes: v })}
        min={1}
        max={60}
        suffix="min"
      />
      <NumberInput
        label="Interval Length"
        value={params.intervalSeconds}
        onChange={(v) => onChange({ ...params, intervalSeconds: v })}
        min={15}
        max={180}
        step={5}
        suffix="sec"
      />
      <div className="p-3 bg-surface rounded-lg text-sm text-muted-foreground">
        Total time: <span className="font-medium text-foreground">{formatDuration(params.totalMinutes * 60)}</span>
      </div>
    </div>
  );
}

function AMRAPConfiguration({
  params,
  onChange,
}: {
  params: AMRAPParams;
  onChange: (params: AMRAPParams) => void;
}) {
  const minutes = Math.floor(params.durationSeconds / 60);
  const seconds = params.durationSeconds % 60;

  return (
    <div className="space-y-4">
      <NumberInput
        label="Duration (minutes)"
        value={minutes}
        onChange={(v) => onChange({ ...params, durationSeconds: v * 60 + seconds })}
        min={1}
        max={60}
        suffix="min"
      />
      <NumberInput
        label="Additional seconds"
        value={seconds}
        onChange={(v) => onChange({ ...params, durationSeconds: minutes * 60 + v })}
        min={0}
        max={59}
        step={5}
        suffix="sec"
      />
      <div className="p-3 bg-surface rounded-lg text-sm text-muted-foreground">
        Total time: <span className="font-medium text-foreground">{formatDuration(params.durationSeconds)}</span>
      </div>
    </div>
  );
}

function TabataConfiguration({
  params,
  onChange,
}: {
  params: TabataParams;
  onChange: (params: TabataParams) => void;
}) {
  const totalTime = params.rounds * (params.workSeconds + params.restSeconds);

  return (
    <div className="space-y-4">
      <NumberInput
        label="Work Time"
        value={params.workSeconds}
        onChange={(v) => onChange({ ...params, workSeconds: v })}
        min={5}
        max={120}
        step={5}
        suffix="sec"
      />
      <NumberInput
        label="Rest Time"
        value={params.restSeconds}
        onChange={(v) => onChange({ ...params, restSeconds: v })}
        min={5}
        max={60}
        step={5}
        suffix="sec"
      />
      <NumberInput
        label="Rounds"
        value={params.rounds}
        onChange={(v) => onChange({ ...params, rounds: v })}
        min={1}
        max={20}
      />
      <div className="p-3 bg-surface rounded-lg text-sm text-muted-foreground">
        Total time: <span className="font-medium text-foreground">{formatDuration(totalTime)}</span>
        <span className="block text-xs mt-1">
          {params.rounds} rounds of {params.workSeconds}s work / {params.restSeconds}s rest
        </span>
      </div>
    </div>
  );
}

function IntervalConfiguration({
  params,
  onChange,
}: {
  params: IntervalWorkRestParams;
  onChange: (params: IntervalWorkRestParams) => void;
}) {
  const totalTime = params.totalRounds * (params.workSeconds + params.restSeconds);

  return (
    <div className="space-y-4">
      <NumberInput
        label="Work Time"
        value={params.workSeconds}
        onChange={(v) => onChange({ ...params, workSeconds: v })}
        min={5}
        max={600}
        step={5}
        suffix="sec"
      />
      <NumberInput
        label="Rest Time"
        value={params.restSeconds}
        onChange={(v) => onChange({ ...params, restSeconds: v })}
        min={0}
        max={600}
        step={5}
        suffix="sec"
      />
      <NumberInput
        label="Total Rounds"
        value={params.totalRounds}
        onChange={(v) => onChange({ ...params, totalRounds: v })}
        min={1}
        max={50}
      />
      <div className="p-3 bg-surface rounded-lg text-sm text-muted-foreground">
        Total time: <span className="font-medium text-foreground">{formatDuration(totalTime)}</span>
      </div>
    </div>
  );
}

function ForTimeConfiguration({
  params,
  onChange,
}: {
  params: ForTimeParams;
  onChange: (params: ForTimeParams) => void;
}) {
  const hasTimeCap = params.timeCapSeconds !== undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="timeCap"
          checked={hasTimeCap}
          onChange={(e) => {
            if (e.target.checked) {
              onChange({ ...params, timeCapSeconds: 20 * 60 });
            } else {
              const { timeCapSeconds, ...rest } = params;
              onChange(rest as ForTimeParams);
            }
          }}
          className="h-4 w-4"
        />
        <Label htmlFor="timeCap">Set time cap</Label>
      </div>
      {hasTimeCap && (
        <NumberInput
          label="Time Cap"
          value={Math.floor((params.timeCapSeconds || 1200) / 60)}
          onChange={(v) => onChange({ ...params, timeCapSeconds: v * 60 })}
          min={1}
          max={60}
          suffix="min"
        />
      )}
      <div className="p-3 bg-surface rounded-lg text-sm text-muted-foreground">
        {hasTimeCap
          ? `Complete as fast as possible (max ${formatDuration(params.timeCapSeconds || 0)})`
          : 'Complete as fast as possible (no time cap)'}
      </div>
    </div>
  );
}

function LadderConfiguration({
  params,
  onChange,
}: {
  params: LadderParams;
  onChange: (params: LadderParams) => void;
}) {
  const [patternInput, setPatternInput] = useState(params.pattern.join('-'));

  const handlePatternChange = (value: string) => {
    setPatternInput(value);
    const nums = value.split('-').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
    if (nums.length > 0) {
      onChange({ ...params, pattern: nums });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Rep Pattern (e.g., 21-15-9)</Label>
        <Input
          value={patternInput}
          onChange={(e) => handlePatternChange(e.target.value)}
          placeholder="21-15-9"
          className="font-mono"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Direction</Label>
        <Select
          value={params.direction}
          onValueChange={(v) => onChange({ ...params, direction: v as LadderParams['direction'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="descending">Descending (21-15-9)</SelectItem>
            <SelectItem value="ascending">Ascending (9-15-21)</SelectItem>
            <SelectItem value="pyramid">Pyramid (1-2-3-2-1)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <NumberInput
        label="Rest Between Rounds (optional)"
        value={params.restBetweenRoundsSeconds || 0}
        onChange={(v) => onChange({ ...params, restBetweenRoundsSeconds: v > 0 ? v : undefined })}
        min={0}
        max={300}
        step={5}
        suffix="sec"
      />
      <div className="p-3 bg-surface rounded-lg text-sm text-muted-foreground">
        {params.pattern.length} rounds: {params.pattern.join(' - ')} reps
      </div>
    </div>
  );
}

function DeathByConfiguration({
  params,
  onChange,
}: {
  params: DeathByParams;
  onChange: (params: DeathByParams) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Exercise Name</Label>
        <Input
          value={params.exerciseName}
          onChange={(e) => onChange({ ...params, exerciseName: e.target.value })}
          placeholder="Burpees"
        />
      </div>
      <NumberInput
        label="Starting Reps"
        value={params.startingReps}
        onChange={(v) => onChange({ ...params, startingReps: v })}
        min={1}
        max={20}
      />
      <NumberInput
        label="Increment Per Minute"
        value={params.incrementPerMinute}
        onChange={(v) => onChange({ ...params, incrementPerMinute: v })}
        min={1}
        max={5}
      />
      <NumberInput
        label="Max Minutes (cap)"
        value={params.maxMinutes || 20}
        onChange={(v) => onChange({ ...params, maxMinutes: v })}
        min={5}
        max={30}
        suffix="min"
      />
      <div className="p-3 bg-surface rounded-lg text-sm text-muted-foreground">
        Min 1: {params.startingReps} reps, Min 2: {params.startingReps + params.incrementPerMinute} reps...
        <span className="block text-xs mt-1">
          Continue until you can&apos;t complete the reps in 60s
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TimerConfigurationPanel({
  timerType,
  initialParams,
  onParamsChange,
  onStart,
  showStartButton = true,
  exercises = [],
}: TimerConfigurationPanelProps) {
  const [params, setParams] = useState<TimerParams>(
    initialParams || getDefaultParams(timerType)
  );

  // Reset params when timer type changes
  useEffect(() => {
    if (!initialParams || initialParams.kind !== timerType) {
      const newParams = getDefaultParams(timerType);
      setParams(newParams);
      onParamsChange(newParams);
    }
  }, [timerType, initialParams, onParamsChange]);

  const handleParamsChange = (newParams: TimerParams) => {
    setParams(newParams);
    onParamsChange(newParams);
  };

  const handleReset = () => {
    const defaultParams = getDefaultParams(timerType);
    setParams(defaultParams);
    onParamsChange(defaultParams);
  };

  const renderConfiguration = () => {
    switch (params.kind) {
      case 'EMOM':
        return (
          <EMOMConfiguration
            params={params}
            onChange={handleParamsChange}
          />
        );
      case 'AMRAP':
        return (
          <AMRAPConfiguration
            params={params}
            onChange={handleParamsChange}
          />
        );
      case 'TABATA':
        return (
          <TabataConfiguration
            params={params}
            onChange={handleParamsChange}
          />
        );
      case 'INTERVAL_WORK_REST':
        return (
          <IntervalConfiguration
            params={params}
            onChange={handleParamsChange}
          />
        );
      case 'FOR_TIME':
        return (
          <ForTimeConfiguration
            params={params}
            onChange={handleParamsChange}
          />
        );
      case 'LADDER':
        return (
          <LadderConfiguration
            params={params}
            onChange={handleParamsChange}
          />
        );
      case 'DEATH_BY':
        return (
          <DeathByConfiguration
            params={params}
            onChange={handleParamsChange}
          />
        );
      case 'CHIPPER':
      case 'STACKED':
        return (
          <div className="p-4 bg-surface rounded-lg text-center text-muted-foreground">
            <p>Advanced configuration coming soon</p>
            <p className="text-xs mt-2">Use AI enhancement for best results</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="h-5 w-5 text-primary" />
            Timer Settings
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderConfiguration()}

        {showStartButton && onStart && (
          <Button onClick={onStart} className="w-full" size="lg">
            <ChevronRight className="h-5 w-5 mr-2" />
            Start Timer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
