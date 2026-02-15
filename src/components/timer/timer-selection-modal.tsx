"use client";

/**
 * Timer Selection Modal
 *
 * Modal for selecting timer type when starting a workout.
 * Shows auto-detected timer recommendation and manual selection options.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Timer,
  Clock,
  Repeat,
  Zap,
  ListOrdered,
  Layers,
  Skull,
  ArrowRight,
  Sparkles,
  Loader2,
  PlayCircle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimerType, TimerParams } from '@/timers';
import type { ExtendedTimerType } from '@/types/timer-session';

// ============================================================================
// Types
// ============================================================================

export interface TimerSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutTitle: string;
  detectedType?: ExtendedTimerType | null;
  detectedReason?: string;
  existingTimerConfig?: {
    params: TimerParams;
    aiGenerated?: boolean;
    reason?: string;
  };
  onSelectTimer: (type: ExtendedTimerType, params?: TimerParams) => void;
  onEnhanceWithAI?: () => Promise<void>;
  onTrackOnly?: () => void;
}

// ============================================================================
// Timer Type Definitions
// ============================================================================

interface TimerTypeOption {
  type: ExtendedTimerType;
  name: string;
  shortName: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  examples: string[];
}

const TIMER_TYPE_OPTIONS: TimerTypeOption[] = [
  {
    type: 'EMOM',
    name: 'EMOM',
    shortName: 'EMOM',
    description: 'Every Minute On the Minute',
    icon: <Clock className="h-6 w-6" />,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    examples: ['10 burpees per minute', '12-min EMOM'],
  },
  {
    type: 'AMRAP',
    name: 'AMRAP',
    shortName: 'AMRAP',
    description: 'As Many Rounds As Possible',
    icon: <Repeat className="h-6 w-6" />,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    examples: ['12-min AMRAP', '20-min cap'],
  },
  {
    type: 'FOR_TIME',
    name: 'For Time',
    shortName: 'For Time',
    description: 'Complete as fast as possible',
    icon: <Timer className="h-6 w-6" />,
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    examples: ['21-15-9', 'Fran', 'Grace'],
  },
  {
    type: 'TABATA',
    name: 'Tabata',
    shortName: 'Tabata',
    description: '20s work / 10s rest intervals',
    icon: <Zap className="h-6 w-6" />,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    examples: ['8 rounds', '4 minutes total'],
  },
  {
    type: 'CHIPPER',
    name: 'Chipper',
    shortName: 'Chipper',
    description: 'Complete exercises in sequence',
    icon: <ListOrdered className="h-6 w-6" />,
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    examples: ['50-40-30-20-10', 'One direction'],
  },
  {
    type: 'LADDER',
    name: 'Ladder',
    shortName: 'Ladder',
    description: 'Increasing/decreasing reps',
    icon: <ArrowRight className="h-6 w-6 rotate-90" />,
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    examples: ['1-2-3-4-5-4-3-2-1', '21-15-9'],
  },
  {
    type: 'DEATH_BY',
    name: 'Death By',
    shortName: 'Death By',
    description: 'Add reps each minute until failure',
    icon: <Skull className="h-6 w-6" />,
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    examples: ['Death by burpees', '+1 rep/min'],
  },
  {
    type: 'STACKED',
    name: 'Stacked',
    shortName: 'Stacked',
    description: 'Multiple timer blocks combined',
    icon: <Layers className="h-6 w-6" />,
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    examples: ['EMOM + AMRAP', 'Multi-part WOD'],
  },
  {
    type: 'INTERVAL_WORK_REST',
    name: 'Intervals',
    shortName: 'Intervals',
    description: 'Work/rest interval training',
    icon: <Timer className="h-6 w-6" />,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    examples: ['40s on / 20s off', 'Circuit training'],
  },
];

// ============================================================================
// Component
// ============================================================================

export function TimerSelectionModal({
  open,
  onOpenChange,
  workoutId,
  workoutTitle,
  detectedType,
  detectedReason,
  existingTimerConfig,
  onSelectTimer,
  onEnhanceWithAI,
  onTrackOnly,
}: TimerSelectionModalProps) {
  const [selectedType, setSelectedType] = useState<ExtendedTimerType | null>(
    detectedType || existingTimerConfig?.params?.kind || null
  );
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Update selected type when detected type changes
  useEffect(() => {
    if (detectedType) {
      setSelectedType(detectedType);
    } else if (existingTimerConfig?.params?.kind) {
      setSelectedType(existingTimerConfig.params.kind);
    }
  }, [detectedType, existingTimerConfig]);

  const handleEnhanceWithAI = async () => {
    if (!onEnhanceWithAI) return;
    setIsEnhancing(true);
    try {
      await onEnhanceWithAI();
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleStartTimer = () => {
    if (selectedType) {
      onSelectTimer(selectedType, existingTimerConfig?.params);
    }
  };

  const recommendedOption = TIMER_TYPE_OPTIONS.find(
    (opt) => opt.type === (detectedType || existingTimerConfig?.params?.kind)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Choose Your Timer
          </DialogTitle>
          <DialogDescription>
            Select a timer format for <span className="font-medium text-foreground">{workoutTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recommended Timer (if detected) */}
          {recommendedOption && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
                {existingTimerConfig?.aiGenerated && (
                  <Badge variant="outline" className="text-xs">
                    AI Generated
                  </Badge>
                )}
              </div>
              <button
                onClick={() => setSelectedType(recommendedOption.type)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all",
                  "hover:scale-[1.01] active:scale-[0.99]",
                  selectedType === recommendedOption.type
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 bg-surface"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-lg", recommendedOption.color)}>
                    {recommendedOption.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-lg">{recommendedOption.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {recommendedOption.description}
                    </div>
                    {(detectedReason || existingTimerConfig?.reason) && (
                      <div className="text-xs text-muted-foreground italic">
                        {detectedReason || existingTimerConfig?.reason}
                      </div>
                    )}
                  </div>
                  {selectedType === recommendedOption.type && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <ChevronRight className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* All Timer Options */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              {recommendedOption ? 'Or choose another format:' : 'Select a timer format:'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TIMER_TYPE_OPTIONS.filter(
                (opt) => opt.type !== recommendedOption?.type
              ).map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    selectedType === option.type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 bg-surface/50"
                  )}
                >
                  <div className={cn("inline-flex p-2 rounded-md mb-2", option.color)}>
                    {option.icon}
                  </div>
                  <div className="font-medium text-sm">{option.shortName}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Enhancement Button */}
          {onEnhanceWithAI && !existingTimerConfig?.aiGenerated && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                onClick={handleEnhanceWithAI}
                disabled={isEnhancing}
                className="w-full"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing workout...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Enhance with AI
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Let AI analyze your workout and suggest the best timer configuration
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {onTrackOnly && (
              <Button
                variant="ghost"
                onClick={onTrackOnly}
                className="flex-1 text-muted-foreground"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                No Timer (Track Only)
              </Button>
            )}
            <Button
              onClick={handleStartTimer}
              disabled={!selectedType}
              className="flex-1"
              size="lg"
            >
              <Timer className="h-5 w-5 mr-2" />
              {selectedType ? `Start with ${TIMER_TYPE_OPTIONS.find(o => o.type === selectedType)?.shortName}` : 'Select a Timer'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
