/**
 * Workout Card Transformer
 *
 * Handles transformation between exercise arrays and card-based layouts.
 * Implements workout repetition logic (e.g., "5 sets" = repeat card sequence 5 times).
 */

import type {
  WorkoutCard,
  ExerciseCard,
  RestCard,
  WorkoutRepetition,
  WorkoutCardLayout,
} from '@/types/workout-card';

/**
 * Exercise format from edit page
 */
interface EditExercise {
  id: string;
  name: string;
  sets: number;
  reps: number | string;
  weight?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
  distance?: string | null;
  time?: string | null;
  timing?: string | null;
  setDetails?: Array<{
    id?: string | null;
    reps?: string | number | null;
    weight?: string | number | null;
  }> | null;
}

/**
 * Expand exercises into a flat array of cards with repetition logic
 *
 * Example: "5 sets of 10 swings, 10 squats, rest between each set"
 * Input: [swing exercise, squat exercise], { sets: 5, restBetweenExercises: true }
 * Output: [swing card, squat card, rest card] × 5 = 15 cards total
 *
 * @param exercises - Array of exercises
 * @param repetition - Repetition metadata (rounds, sets, rest pattern)
 * @returns Flat array of workout cards
 */
export function expandWorkoutToCards(
  exercises: EditExercise[],
  repetition?: WorkoutRepetition,
  options?: {
    amrapBlockId?: string | null;
    emomBlockId?: string | null;
  }
): WorkoutCard[] {
  const cards: WorkoutCard[] = [];
  const hasSetDetails = exercises.some(
    (exercise) => exercise.setDetails && exercise.setDetails.length > 0
  );

  // Determine number of repetitions
  const repeatCount = hasSetDetails ? 1 : (repetition?.rounds || repetition?.sets || 1);

  // Determine if we should insert rest cards
  const shouldInsertRestBetweenExercises =
    !hasSetDetails && (repetition?.restBetweenExercises ?? false);
  const shouldInsertRestBetweenRounds =
    !hasSetDetails && (repetition?.restBetweenRounds ?? false);
  const defaultRestDuration = repetition?.defaultRestDuration || 60;

  // Build single sequence of cards (one "set")
  const buildSequence = (repetitionIndex: number): WorkoutCard[] => {
    const sequence: WorkoutCard[] = [];

    exercises.forEach((exercise, exerciseIndex) => {
      const setDetails = exercise.setDetails?.length ? exercise.setDetails : null;
      const amrapBlockId = options?.amrapBlockId ?? null;
      const emomBlockId = options?.emomBlockId ?? null;

      if (setDetails) {
        const totalRepetitions = setDetails.length;
        setDetails.forEach((detail, detailIndex) => {
          const resolvedWeight = detail?.weight ?? exercise.weight ?? null;
          const exerciseCard: ExerciseCard = {
            id: `${exercise.id}-set${detail?.id || detailIndex}-${Date.now()}`,
            type: 'exercise',
            name: exercise.name,
            sets: 1,
            reps: detail?.reps ?? exercise.reps ?? "",
            weight: typeof resolvedWeight === "number" ? String(resolvedWeight) : resolvedWeight,
            distance: exercise.distance || null,
            time: exercise.time || null,
            timing: exercise.timing || null,
            restSeconds: exercise.restSeconds || null,
            notes: exercise.notes || null,
            isEditing: false,
            originalExerciseId: exercise.id,
            repetitionIndex: totalRepetitions > 1 ? detailIndex : undefined,
            totalRepetitions: totalRepetitions > 1 ? totalRepetitions : undefined,
            setDetailId: detail?.id ?? null,
            amrapBlockId,
            emomBlockId,
          };
          sequence.push(exerciseCard);
        });
      } else {
        // Create exercise card
        const exerciseCard: ExerciseCard = {
          id: `${exercise.id}-rep${repetitionIndex}-${Date.now()}`,
          type: 'exercise',
          name: exercise.name,
          sets: 1,  // Each card represents 1 set
          reps: exercise.reps ?? "",
          weight: exercise.weight || null,
          distance: exercise.distance || null,
          time: exercise.time || null,
          timing: exercise.timing || null,
          restSeconds: exercise.restSeconds || null,
          notes: exercise.notes || null,
          isEditing: false,
          originalExerciseId: exercise.id,
          repetitionIndex,
          totalRepetitions: repeatCount,  // Pass total repetitions for "Set X of N" display
          amrapBlockId,
          emomBlockId,
        };

        sequence.push(exerciseCard);
      }

      // Insert rest card after exercise (if not last exercise in sequence)
      if (shouldInsertRestBetweenExercises && exerciseIndex < exercises.length - 1) {
        const restCard: RestCard = {
          id: `rest-${exercise.id}-rep${repetitionIndex}-${Date.now()}`,
          type: 'rest',
          duration: exercise.restSeconds || defaultRestDuration,
          repetitionIndex,
        };
        sequence.push(restCard);
      }
    });

    // Insert rest card at end of full sequence (between rounds/sets)
    if (shouldInsertRestBetweenRounds && repetitionIndex < repeatCount - 1) {
      const restCard: RestCard = {
        id: `rest-end-rep${repetitionIndex}-${Date.now()}`,
        type: 'rest',
        duration: defaultRestDuration,
        notes: `Rest before round ${repetitionIndex + 2}`,
        repetitionIndex,
      };
      sequence.push(restCard);
    }

    return sequence;
  };

  // Generate repeated sequences
  for (let i = 0; i < repeatCount; i++) {
    const sequence = buildSequence(i);
    cards.push(...sequence);
  }

  return cards;
}

/**
 * Collapse cards back to exercise array for saving
 *
 * Combines repeated cards into exercise objects with set counts.
 * Filters out rest cards as they're not saved as separate exercises.
 *
 * @param cards - Array of workout cards
 * @returns Array of exercises suitable for saving
 */
export function collapseCardsToExercises(cards: WorkoutCard[]): EditExercise[] {
  // Group exercise cards by original exercise ID and name
  const exerciseMap = new Map<string, ExerciseCard[]>();

  cards.forEach((card) => {
    if (card.type === 'exercise') {
      const key = card.originalExerciseId || card.name;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, []);
      }
      exerciseMap.get(key)!.push(card);
    }
  });

  const summariseValues = (values: Array<string | number | null | undefined>): string | null => {
    const cleaned = values
      .map((value) => (value == null ? "" : String(value)).trim())
      .filter((value) => value.length > 0);

    if (!cleaned.length) return null;

    const unique = Array.from(new Set(cleaned));
    return unique.length === 1 ? unique[0] : unique.join(" / ");
  };

  // Convert grouped cards back to exercises
  const exercises: EditExercise[] = [];

  exerciseMap.forEach((cardGroup) => {
    if (cardGroup.length === 0) return;

    // Use first card as template
    const firstCard = cardGroup[0];

    // Count total sets (number of cards with same exercise)
    const totalSets = cardGroup.length;

    const hasSetDetails = cardGroup.some((card) => card.setDetailId);
    const setDetails = hasSetDetails
      ? cardGroup.map((card, index) => ({
          id: card.setDetailId || `set-${index}`,
          reps: card.reps ?? null,
          weight: card.weight ?? null,
        }))
      : null;

    const exercise: EditExercise = {
      id: firstCard.originalExerciseId || firstCard.id,
      name: firstCard.name,
      sets: totalSets,
      reps: summariseValues(cardGroup.map((card) => card.reps)) ?? "",
      weight: summariseValues(cardGroup.map((card) => card.weight)) || undefined,
      distance: firstCard.distance || undefined,
      time: firstCard.time || undefined,
      timing: firstCard.timing || undefined,
      restSeconds: firstCard.restSeconds || undefined,
      notes: firstCard.notes || undefined,
      setDetails,
    };

    exercises.push(exercise);
  });

  return exercises;
}

/**
 * Create a blank exercise card for "Add Exercise" functionality
 */
export function createBlankExerciseCard(): ExerciseCard {
  return {
    id: `ex-${Date.now()}-${Math.random()}`,
    type: 'exercise',
    name: '',
    sets: 1,
    reps: '',
    weight: null,
    distance: null,
    timing: null,
    restSeconds: 60,
    notes: null,
    isEditing: true,  // Start in edit mode
    amrapBlockId: null,
    emomBlockId: null,
  };
}

/**
 * Create a rest card
 */
export function createRestCard(duration: number = 60, notes?: string): RestCard {
  return {
    id: `rest-${Date.now()}-${Math.random()}`,
    type: 'rest',
    duration,
    notes: notes || null,
  };
}

/**
 * Prepare editor card layout for persistence (strip transient edit state).
 */
export function buildCardLayout(cards: WorkoutCard[]): WorkoutCardLayout[] {
  return cards.map((card) => {
    if (card.type === 'exercise') {
      const { isEditing, ...rest } = card;
      return rest;
    }
    return card;
  });
}

/**
 * Ensure stored card layout is ready for editor use.
 */
export function normaliseCardLayout(layout: WorkoutCardLayout[]): WorkoutCard[] {
  return layout.map((card) =>
    card.type === 'exercise'
      ? { ...card, reps: card.reps ?? "", isEditing: false }
      : card
  );
}

/**
 * Detect workout repetition pattern from exercise data
 *
 * Analyzes exercise structure to determine if workout should be expanded
 * into repeated card sequences.
 */
export function detectRepetitionPattern(
  exercises: EditExercise[],
  workoutType?: string
): WorkoutRepetition | undefined {
  // If no exercises, no repetition
  if (exercises.length === 0) return undefined;

  // Check if all exercises have same set count > 1
  const firstSets = exercises[0].sets;
  const allSameSets = exercises.every((ex) => ex.sets === firstSets);

  if (allSameSets && firstSets > 1) {
    // Detected "5 sets of [exercises]" pattern
    return {
      sets: firstSets,
      pattern: 'circuit',
      restBetweenExercises: false,  // No rest between exercises
      restBetweenRounds: true,  // Rest between sets/rounds
      defaultRestDuration: exercises[0].restSeconds || 60,
    };
  }

  // Check workout type for special patterns
  if (workoutType === 'emom' || workoutType === 'amrap') {
    return {
      rounds: 1,  // EMOM/AMRAP typically shown as single sequence
      pattern: workoutType as 'emom' | 'amrap',
      restBetweenExercises: false,
    };
  }

  // Default: no repetition, show as-is
  return undefined;
}
