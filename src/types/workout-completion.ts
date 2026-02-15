export type WeightUnit = "lbs" | "kg";
export type DistanceUnit = "m" | "km" | "mi";

export interface WorkoutExerciseMetric {
  cardId: string;
  exerciseId: string;
  exerciseName: string;
  completed: boolean;
  isRun: boolean;
  targetReps?: string | number | null;
  targetWeight?: string | null;
  roundCompleted?: number | null;
  roundTotal?: number | null;
  reps?: number | null;
  weight?: number | null;
  weightUnit?: WeightUnit | null;
  distance?: number | null;
  distanceUnit?: DistanceUnit | null;
  timeSeconds?: number | null;
  notes?: string | null;
}

export type PRCategory =
  | "WEIGHT_REPS"
  | "LONGEST_RUN_DISTANCE"
  | "FASTEST_RUN";

export interface WorkoutPRHighlight {
  exerciseName: string;
  category: PRCategory;
  message: string;
  value: string;
}
