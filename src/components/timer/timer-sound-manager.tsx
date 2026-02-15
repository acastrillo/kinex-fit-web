"use client";

/**
 * Timer Sound Manager
 *
 * Manages audio cues for workout timer transitions, countdowns, and completion.
 * Uses Web Audio API for reliable, low-latency sound playback.
 */

import { useCallback, useRef, useEffect } from 'react';
import { getAudioContext } from '@/types/browser-compat';

// ============================================================================
// Types
// ============================================================================

export type SoundType =
  | 'countdown_3'      // 3 seconds remaining
  | 'countdown_2'      // 2 seconds remaining
  | 'countdown_1'      // 1 second remaining
  | 'segment_start'    // New segment started
  | 'segment_end'      // Segment ended
  | 'work_start'       // Work period started
  | 'rest_start'       // Rest period started
  | 'block_complete'   // Block completed (stacked workouts)
  | 'workout_complete' // Entire workout completed
  | 'warning_10s'      // 10 seconds warning
  | 'warning_5s';      // 5 seconds warning

export interface TimerSoundManagerOptions {
  enabled?: boolean;
  volume?: number;
  onError?: (error: Error) => void;
}

export interface TimerSoundManagerReturn {
  playSound: (type: SoundType) => void;
  playCountdown: (seconds: number) => void;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  isEnabled: boolean;
  volume: number;
}

// ============================================================================
// Sound Configurations
// ============================================================================

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  rampDown?: boolean;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  countdown_3: { frequency: 600, duration: 0.15, type: 'sine', volume: 0.3 },
  countdown_2: { frequency: 700, duration: 0.15, type: 'sine', volume: 0.35 },
  countdown_1: { frequency: 800, duration: 0.2, type: 'sine', volume: 0.4 },
  segment_start: { frequency: 880, duration: 0.3, type: 'sine', volume: 0.4, rampDown: true },
  segment_end: { frequency: 440, duration: 0.2, type: 'sine', volume: 0.3, rampDown: true },
  work_start: { frequency: 1000, duration: 0.15, type: 'square', volume: 0.3 },
  rest_start: { frequency: 500, duration: 0.3, type: 'sine', volume: 0.25 },
  block_complete: { frequency: 660, duration: 0.4, type: 'sine', volume: 0.35, rampDown: true },
  workout_complete: { frequency: 880, duration: 0.5, type: 'sine', volume: 0.4, rampDown: true },
  warning_10s: { frequency: 550, duration: 0.1, type: 'sine', volume: 0.2 },
  warning_5s: { frequency: 650, duration: 0.12, type: 'sine', volume: 0.25 },
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTimerSoundManager(
  options: TimerSoundManagerOptions = {}
): TimerSoundManagerReturn {
  const {
    enabled: initialEnabled = true,
    volume: initialVolume = 0.5,
    onError,
  } = options;

  const enabledRef = useRef(initialEnabled);
  const volumeRef = useRef(Math.max(0, Math.min(1, initialVolume)));
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first interaction
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = getAudioContext();
      } catch (error) {
        console.warn('Failed to create AudioContext:', error);
        if (onError) onError(error as Error);
        return null;
      }
    }
    return audioContextRef.current;
  }, [onError]);

  // Play a single tone
  const playTone = useCallback((config: SoundConfig) => {
    const audioContext = getOrCreateAudioContext();
    if (!audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = config.frequency;
      oscillator.type = config.type;

      const effectiveVolume = config.volume * volumeRef.current;

      if (config.rampDown) {
        gainNode.gain.setValueAtTime(effectiveVolume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + config.duration
        );
      } else {
        gainNode.gain.setValueAtTime(effectiveVolume, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + config.duration);
      }

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration + 0.05);
    } catch (error) {
      console.warn('Failed to play sound:', error);
      if (onError) onError(error as Error);
    }
  }, [getOrCreateAudioContext, onError]);

  // Play sound by type
  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;

    const config = SOUND_CONFIGS[type];
    if (!config) {
      console.warn(`Unknown sound type: ${type}`);
      return;
    }

    playTone(config);

    // Special handling for completion sounds (play multiple tones)
    if (type === 'workout_complete') {
      setTimeout(() => playTone({ ...config, frequency: 1047 }), 200);
      setTimeout(() => playTone({ ...config, frequency: 1319 }), 400);
    } else if (type === 'block_complete') {
      setTimeout(() => playTone({ ...config, frequency: 880 }), 150);
    }
  }, [playTone]);

  // Play countdown beep for specific second
  const playCountdown = useCallback((seconds: number) => {
    if (!enabledRef.current) return;

    switch (seconds) {
      case 3:
        playSound('countdown_3');
        break;
      case 2:
        playSound('countdown_2');
        break;
      case 1:
        playSound('countdown_1');
        break;
      case 10:
        playSound('warning_10s');
        break;
      case 5:
        playSound('warning_5s');
        break;
      default:
        // No sound for other seconds
        break;
    }
  }, [playSound]);

  // Control functions
  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    playSound,
    playCountdown,
    setEnabled,
    setVolume,
    isEnabled: enabledRef.current,
    volume: volumeRef.current,
  };
}

// ============================================================================
// Sound Provider Component (optional context-based approach)
// ============================================================================

import { createContext, useContext, useState, type ReactNode } from 'react';

interface SoundContextValue {
  enabled: boolean;
  volume: number;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  playSound: (type: SoundType) => void;
  playCountdown: (seconds: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function TimerSoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [volume, setVolumeState] = useState(0.5);

  const soundManager = useTimerSoundManager({
    enabled,
    volume,
  });

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    soundManager.setEnabled(value);
  }, [soundManager]);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    soundManager.setVolume(value);
  }, [soundManager]);

  return (
    <SoundContext.Provider
      value={{
        enabled,
        volume,
        setEnabled,
        setVolume,
        playSound: soundManager.playSound,
        playCountdown: soundManager.playCountdown,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useTimerSound(): SoundContextValue {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useTimerSound must be used within a TimerSoundProvider');
  }
  return context;
}
