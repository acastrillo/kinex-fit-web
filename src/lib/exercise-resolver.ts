import exercisesData from "./knowledge-base/exercises.json";
import { invokeClaude, logUsage } from "./ai/bedrock-client";
import {
  matchExercise,
  suggestExercises,
} from "./knowledge-base/exercise-matcher";

interface KnowledgeBaseExercise {
  canonical: string;
  aliases: string[];
  category: string;
  muscleGroups: string[];
  equipment: string[];
  movementPattern: string;
}

interface LlmResolution {
  rawName: string;
  canonicalName: string | null;
  confidence?: number;
}

export interface ResolvedExercise {
  rawName: string;
  canonicalName: string | null;
  canonicalId: string | null;
  exerciseId: string | null;
  exerciseName: string | null;
  matched: boolean;
  confidence: number;
  source: "knowledge-base" | "llm" | "none";
  category: string | null;
  muscleGroups: string[];
  equipment: string[];
  movementPattern: string | null;
}

export interface ResolveExerciseNamesOptions {
  actorId?: string;
  subscriptionTier?: string;
}

const KNOWLEDGE_BASE = exercisesData.exercises as KnowledgeBaseExercise[];
const MIN_FUZZY_CONFIDENCE = 0.82;

export async function resolveExerciseNames(
  rawNames: string[],
  options: ResolveExerciseNamesOptions = {}
): Promise<ResolvedExercise[]> {
  const trimmedNames = rawNames.map((name) => name.trim());
  const initialResults = trimmedNames.map(resolveWithKnowledgeBase);
  const unresolvedNames = trimmedNames.filter((_, index) => !initialResults[index].matched);

  if (unresolvedNames.length === 0) {
    return initialResults;
  }

  try {
    const llmResults = await resolveWithLlm(unresolvedNames, options);
    const llmResultMap = new Map(llmResults.map((result) => [normalizeName(result.rawName), result]));

    return initialResults.map((result) => {
      if (result.matched) {
        return result;
      }

      const llmResolution = llmResultMap.get(normalizeName(result.rawName));
      if (!llmResolution?.canonicalName) {
        return result;
      }

      const exercise = findExerciseByCanonicalName(llmResolution.canonicalName);
      if (!exercise) {
        return result;
      }

      return buildResolvedExercise(
        result.rawName,
        exercise,
        "llm",
        clampConfidence(llmResolution.confidence, 0.6)
      );
    });
  } catch (error) {
    console.error("[ExerciseResolver] LLM fallback failed:", error);
    return initialResults;
  }
}

function resolveWithKnowledgeBase(rawName: string): ResolvedExercise {
  const exactMatch = findExactExercise(rawName);
  if (exactMatch) {
    return buildResolvedExercise(rawName, exactMatch, "knowledge-base", 1);
  }

  const fuzzyMatch = matchExercise(rawName, MIN_FUZZY_CONFIDENCE);
  if (fuzzyMatch) {
    return buildResolvedExercise(rawName, fuzzyMatch, "knowledge-base", 0.88);
  }

  return buildUnmatchedExercise(rawName);
}

async function resolveWithLlm(
  rawNames: string[],
  options: ResolveExerciseNamesOptions
): Promise<LlmResolution[]> {
  const knowledgeBasePrompt = KNOWLEDGE_BASE.map((exercise) => ({
    canonical: exercise.canonical,
    aliases: exercise.aliases,
  }));

  const candidateHints = rawNames.map((rawName) => ({
    rawName,
    candidates: suggestExercises(rawName, 5).map((exercise) => ({
      canonical: exercise.canonical,
      aliases: exercise.aliases,
    })),
  }));

  const response = await invokeClaude({
    systemPrompt: `You resolve raw workout exercise names to a fixed canonical exercise list for a fitness app.

Return ONLY valid JSON with this shape:
{
  "results": [
    {
      "rawName": "original name",
      "canonicalName": "canonical exercise name or null",
      "confidence": 0.0
    }
  ]
}

Rules:
- Keep the same order and count as the input.
- Choose only canonicalName values that exist in the knowledge base.
- Use null when you are not confident.
- Confidence must be between 0 and 1.
- Never include explanations or markdown.`,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          rawNames,
          candidateHints,
          knowledgeBase: knowledgeBasePrompt,
        }),
      },
    ],
    maxTokens: 1200,
    temperature: 0,
    model: "haiku",
    latencyOptimized: true,
  });

  if (options.actorId) {
    await logUsage("exercise-resolution", options.actorId, response, {
      subscriptionTier: options.subscriptionTier || "guest",
      success: true,
    });
  }

  let parsed: { results?: LlmResolution[] } | null = null;
  try {
    let jsonText = response.content.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1);
    }

    parsed = JSON.parse(jsonText) as { results?: LlmResolution[] };
  } catch (error) {
    console.error("[ExerciseResolver] Failed to parse LLM response:", error);
    console.error("[ExerciseResolver] Raw response:", response.content);
    throw new Error("Exercise resolution returned invalid JSON");
  }

  return Array.isArray(parsed?.results) ? parsed.results : [];
}

function buildResolvedExercise(
  rawName: string,
  exercise: KnowledgeBaseExercise,
  source: ResolvedExercise["source"],
  confidence: number
): ResolvedExercise {
  const exerciseId = toExerciseId(exercise.canonical);

  return {
    rawName,
    canonicalName: exercise.canonical,
    canonicalId: exerciseId,
    exerciseId,
    exerciseName: toDisplayName(exercise.canonical),
    matched: true,
    confidence,
    source,
    category: exercise.category,
    muscleGroups: exercise.muscleGroups,
    equipment: exercise.equipment,
    movementPattern: exercise.movementPattern,
  };
}

function buildUnmatchedExercise(rawName: string): ResolvedExercise {
  return {
    rawName,
    canonicalName: null,
    canonicalId: null,
    exerciseId: null,
    exerciseName: null,
    matched: false,
    confidence: 0,
    source: "none",
    category: null,
    muscleGroups: [],
    equipment: [],
    movementPattern: null,
  };
}

function findExactExercise(rawName: string): KnowledgeBaseExercise | null {
  const normalizedRawName = normalizeName(rawName);

  for (const exercise of KNOWLEDGE_BASE) {
    if (normalizeName(exercise.canonical) === normalizedRawName) {
      return exercise;
    }

    if (exercise.aliases.some((alias) => normalizeName(alias) === normalizedRawName)) {
      return exercise;
    }
  }

  return null;
}

function findExerciseByCanonicalName(canonicalName: string): KnowledgeBaseExercise | null {
  const normalizedCanonicalName = normalizeName(canonicalName);
  return (
    KNOWLEDGE_BASE.find((exercise) => normalizeName(exercise.canonical) === normalizedCanonicalName) ||
    matchExercise(canonicalName, 0.95) ||
    null
  );
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
}

function toExerciseId(canonicalName: string): string {
  return normalizeName(canonicalName).replace(/\s+/g, "-");
}

function toDisplayName(canonicalName: string): string {
  return canonicalName
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function clampConfidence(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}
