"use client";

/**
 * Timer Block Navigator
 *
 * Navigation for stacked/mixed workouts with multiple timer blocks.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface TimerBlock {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

export interface TimerBlockNavigatorProps {
  blocks: TimerBlock[];
  currentBlockIndex: number;
  onBlockSelect?: (index: number) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TimerBlockNavigator({
  blocks,
  currentBlockIndex,
  onBlockSelect,
  className,
}: TimerBlockNavigatorProps) {
  if (blocks.length === 0) return null;

  const canGoBack = currentBlockIndex > 0;
  const canGoForward = currentBlockIndex < blocks.length - 1;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Block Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {blocks.map((block, index) => (
          <button
            key={block.id}
            onClick={() => onBlockSelect?.(index)}
            disabled={!onBlockSelect}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900',
              index === currentBlockIndex
                ? 'bg-primary text-primary-foreground'
                : block.status === 'completed'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-surface text-muted-foreground border border-border hover:border-primary/50',
              onBlockSelect && 'cursor-pointer hover:scale-105 active:scale-95'
            )}
          >
            {block.status === 'completed' ? (
              <CheckCircle className="h-3.5 w-3.5" />
            ) : index === currentBlockIndex ? (
              <PlayCircle className="h-3.5 w-3.5" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            <span>{block.label}</span>
          </button>
        ))}
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-1">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className={cn(
              'h-1 rounded-full transition-all',
              index === currentBlockIndex
                ? 'w-8 bg-primary'
                : block.status === 'completed'
                ? 'w-4 bg-green-500'
                : 'w-4 bg-muted'
            )}
          />
        ))}
      </div>

      {/* Navigation Arrows (optional) */}
      {onBlockSelect && blocks.length > 2 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBlockSelect(currentBlockIndex - 1)}
            disabled={!canGoBack}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Block {currentBlockIndex + 1} of {blocks.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBlockSelect(currentBlockIndex + 1)}
            disabled={!canGoForward}
            className="text-muted-foreground"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Block Navigator (for header)
// ============================================================================

export interface CompactBlockNavigatorProps {
  currentBlockIndex: number;
  totalBlocks: number;
  currentLabel: string;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
}

export function CompactBlockNavigator({
  currentBlockIndex,
  totalBlocks,
  currentLabel,
  onPrevious,
  onNext,
  className,
}: CompactBlockNavigatorProps) {
  const canGoBack = currentBlockIndex > 0;
  const canGoForward = currentBlockIndex < totalBlocks - 1;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {onPrevious && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onPrevious}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      <Badge variant="secondary" className="font-medium">
        {currentLabel}
      </Badge>

      <span className="text-xs text-muted-foreground">
        {currentBlockIndex + 1}/{totalBlocks}
      </span>

      {onNext && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNext}
          disabled={!canGoForward}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
