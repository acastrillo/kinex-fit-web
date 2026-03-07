interface SampleExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  restSeconds: number;
  notes?: string;
}

interface SampleWorkoutDefinition {
  id: string;
  title: string;
  description: string;
  summary: string;
  sourceLabel: string;
  exercises: SampleExercise[];
}

const SAMPLE_WORKOUTS: SampleWorkoutDefinition[] = [
  {
    id: "sample_push_hypertrophy",
    title: "Push Hypertrophy Sample",
    description: "A simple upper-body sample workout to preview Kinex Fit's card-based editor.",
    summary: "5-move push session focused on chest, shoulders, and triceps.",
    sourceLabel: "sample-gallery",
    exercises: [
      {
        id: "sample-ex-1",
        name: "Incline Dumbbell Press",
        sets: 4,
        reps: "8-10",
        weight: "Moderate",
        restSeconds: 90,
      },
      {
        id: "sample-ex-2",
        name: "Seated Shoulder Press",
        sets: 3,
        reps: "10-12",
        weight: "Moderate",
        restSeconds: 75,
      },
      {
        id: "sample-ex-3",
        name: "Cable Fly",
        sets: 3,
        reps: "12-15",
        weight: "Light-Moderate",
        restSeconds: 60,
      },
      {
        id: "sample-ex-4",
        name: "Lateral Raise",
        sets: 3,
        reps: "15",
        weight: "Light",
        restSeconds: 45,
      },
      {
        id: "sample-ex-5",
        name: "Rope Triceps Pushdown",
        sets: 3,
        reps: "12-15",
        weight: "Moderate",
        restSeconds: 45,
      },
    ],
  },
];

export function createSampleWorkoutDraft(sampleId = SAMPLE_WORKOUTS[0].id) {
  const sample = SAMPLE_WORKOUTS.find((item) => item.id === sampleId) ?? SAMPLE_WORKOUTS[0];
  const now = new Date().toISOString();
  const draftId = `guest_${sample.id}_${Date.now()}`;

  return {
    id: draftId,
    title: sample.title,
    content: sample.description,
    llmData: {
      title: sample.title,
      summary: sample.summary,
      exercises: sample.exercises,
      workoutType: "standard",
      structure: {
        type: "standard",
      },
      workoutV1: {
        name: sample.title,
        totalDuration: 35,
        difficulty: "moderate",
        tags: ["sample", "guest-preview"],
      },
      breakdown: [
        "Preview the card-based workout editor immediately",
        "Save up to 3 guest workouts locally before signing up",
      ],
    },
    author: {
      username: "kinex",
    },
    createdAt: now,
    source: sample.sourceLabel,
    type: "sample",
    thumbnailUrl: null,
  };
}
