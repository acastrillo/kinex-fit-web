# Kinex Fit - AI Integration (AWS Bedrock)

**Last Updated:** January 2025
**AI Provider:** AWS Bedrock (Claude Models)
**Purpose:** Complete documentation of AI features, prompts, and cost optimization

---

## Table of Contents

1. [Overview](#overview)
2. [Why AWS Bedrock?](#why-aws-bedrock)
3. [Claude Models](#claude-models)
4. [AI Features](#ai-features)
5. [Prompt Engineering](#prompt-engineering)
6. [Cost Optimization](#cost-optimization)
7. [Usage Tracking](#usage-tracking)
8. [Request Flow](#request-flow)
9. [Error Handling](#error-handling)
10. [Testing & Monitoring](#testing--monitoring)

---

## Overview

Kinex Fit uses **AWS Bedrock** with **Claude models** (Anthropic) for AI-powered features:

1. **Workout Generation** - Natural language → structured workout
2. **Workout Enhancement** - Clean up messy OCR text from Instagram
3. **Workout of the Day** - Daily AI-generated workout recommendations
4. **Workout of the Week** - Weekly training program generation
5. **Timer Suggestions** - AI recommends workout timers (EMOM, AMRAP, etc.)

### Key Statistics

- **Models Available:** Claude Opus 4.5, Sonnet 4.5, Haiku 4.5
- **Average Request Cost:** $0.01-0.03 (Sonnet)
- **Average Response Time:** 3-5 seconds
- **Token Limit:** 4,096 output tokens (configurable up to 200k)
- **Cost Savings:** ~50% with prompt caching

---

## Why AWS Bedrock?

### Comparison with OpenAI

| Feature | AWS Bedrock | OpenAI |
|---------|-------------|--------|
| **Cost (per 1M tokens)** | $3/$15 (Sonnet) | $5/$15 (GPT-4 Turbo) |
| **Prompt Caching** | 90% discount on cached tokens | No native caching |
| **Integration** | Same AWS account, IAM roles | Separate API, API keys |
| **Data Privacy** | Data stays in AWS | Data sent to OpenAI servers |
| **Latency Optimization** | 42-77% faster with optimization | Standard |
| **Model Selection** | Claude only | GPT-4, GPT-3.5, etc. |

### Why We Chose Bedrock

1. **Cost Efficiency** - ~40% cheaper than OpenAI for comparable quality
2. **AWS Integration** - Same IAM roles, VPC, no external API keys
3. **Prompt Caching** - Massive savings on repeated context (training profiles)
4. **Data Privacy** - User data never leaves our AWS account
5. **Latency Optimization** - Up to 77% faster responses with performance config

---

## Claude Models

### Available Models

**File:** `src/lib/ai/bedrock-client.ts`

```typescript
const MODEL_IDS: Record<ClaudeModel, string> = {
  opus: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
  sonnet: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  haiku: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
};
```

### Model Comparison

| Model | Input Cost | Output Cost | Quality | Speed | Use Case |
|-------|-----------|-------------|---------|-------|----------|
| **Claude Opus 4.5** | $15/1M tokens | $75/1M tokens | Highest | Slowest | Premium features, complex workouts |
| **Claude Sonnet 4.5** (default) | $3/1M tokens | $15/1M tokens | Balanced | Medium | Standard workout generation |
| **Claude Haiku 4.5** | $0.25/1M tokens | $1.25/1M tokens | Fast | Fastest | Simple tasks, timer suggestions |

### Pricing Calculation

```typescript
// Example: Generate a workout with Sonnet
// Input: 2,000 tokens (system prompt + training profile + user request)
// Output: 800 tokens (workout JSON)

const inputCost = 2000 * ($3 / 1_000_000) = $0.006
const outputCost = 800 * ($15 / 1_000_000) = $0.012
const totalCost = $0.018 (1.8 cents)

// With caching (second request, same user):
const cachedInputCost = 2000 * ($3 / 1_000_000) * 0.1 = $0.0006
const outputCost = 800 * ($15 / 1_000_000) = $0.012
const totalCost = $0.0126 (1.26 cents) - 30% savings!
```

---

## AI Features

### 1. Workout Generation

**Endpoint:** `POST /api/ai/generate-workout`
**Model:** Claude Sonnet 4.5 (default)
**Average Cost:** $0.015-0.025 per request

**Input:**
```json
{
  "prompt": "Give me a leg day workout with squats and deadlifts",
  "preferences": {
    "duration": 60,
    "equipment": ["barbell", "dumbbells"],
    "goals": ["strength", "hypertrophy"]
  }
}
```

**Output:**
```json
{
  "success": true,
  "workout": {
    "title": "Leg Day - Squat & Deadlift Focus",
    "exercises": [
      {
        "name": "Back Squat",
        "sets": 5,
        "reps": 5,
        "weight": "275lbs (87% 1RM)",
        "restSeconds": 180,
        "notes": "Focus on depth and bar speed"
      },
      ...
    ]
  },
  "tokensUsed": 1350,
  "cost": 0.0135,
  "quotaRemaining": 29
}
```

**Implementation:** `src/lib/ai/workout-generator.ts`

---

### 2. Workout Enhancement

**Endpoint:** `POST /api/ai/enhance-workout`
**Model:** Claude Sonnet 4.5
**Average Cost:** $0.008-0.015 per request

**Use Case:** Clean up messy OCR text from Instagram posts

**Input (messy OCR text):**
```
A1 Squats x10x3
A2 Push ups x15x3

B1 DL 5x5 @ 70%
B2 Pull-ups AMRAP x3
```

**Output (structured):**
```json
{
  "title": "Full Body Strength Circuit",
  "exercises": [
    {
      "name": "Back Squat",
      "sets": 3,
      "reps": 10,
      "notes": "Superset with push-ups"
    },
    {
      "name": "Push-ups",
      "sets": 3,
      "reps": 15,
      "notes": "Superset with squats"
    },
    {
      "name": "Deadlift",
      "sets": 5,
      "reps": 5,
      "weight": "70% of 1RM",
      "restSeconds": 180
    },
    {
      "name": "Pull-ups",
      "sets": 3,
      "reps": "AMRAP"
    }
  ]
}
```

**Implementation:** `src/lib/ai/workout-enhancer.ts`

---

### 3. Workout of the Day (WOD)

**Endpoint:** `POST /api/ai/workout-of-the-day`
**Model:** Claude Sonnet 4.5
**Frequency:** Cached for 24 hours per user
**Average Cost:** $0.02 per generation

**Personalization:**
- Uses training profile (PRs, equipment, goals)
- Adapts to experience level
- Suggests appropriate weights based on PRs
- Varies workout style (strength, hypertrophy, conditioning)

**Implementation:** `src/app/api/ai/workout-of-the-day/route.ts`

---

### 4. Workout of the Week (WOW)

**Endpoint:** `POST /api/ai/workout-of-the-week`
**Model:** Claude Opus 4.5 (higher quality)
**Frequency:** Weekly (Pro/Elite tiers only)
**Average Cost:** $0.15 per generation
**Quota Policy:** Does **not** count toward user AI request quotas (paid tiers only)

**Output:** Complete 7-day training program with:
- Progressive overload
- Proper recovery between sessions
- Balance of muscle groups
- Deload week recommendations

**Implementation:** `src/app/api/ai/workout-of-the-week/route.ts`

---

### 5. Timer Suggestions

**Endpoint:** `POST /api/ai/suggest-timer`
**Model:** Claude Haiku 4.5 (fast & cheap)
**Average Cost:** $0.002 per request

**Input:** Workout exercises
**Output:** Suggested timer type (EMOM, AMRAP, Tabata, Intervals)

**Example:**
```
Input: Circuit of burpees, kettlebell swings, box jumps
Output: "EMOM 20:00 (1 min work, rest remaining time)"
Rationale: "High-intensity exercises benefit from structured rest periods"
```

---

## Prompt Engineering

### System Prompt Structure

**File:** `src/lib/ai/workout-generator.ts`

```typescript
const systemPrompt = `You are an expert personal trainer and workout designer.

**Your responsibilities:**
1. Create comprehensive workouts with warm-up, main exercises, cool-down
2. Personalize based on user profile (PRs, equipment, goals, experience)
3. Follow exercise science principles (compounds first, proper volume)
4. Suggest appropriate weights based on user's PRs (70-85% of 1RM)
5. Respect constraints (injuries, equipment limitations)

**Workout structure requirements:**
- Warm-up: 5-10 minutes of dynamic stretching
- Main work: 4-8 exercises (compounds first, isolations last)
- Cool-down: 5-10 minutes of static stretching
- Each exercise: sets, reps, rest times, form cues

**Rep ranges by goal:**
- Strength: 3-6 reps @ 85-90% 1RM, 3-5 min rest
- Hypertrophy: 8-12 reps @ 70-80% 1RM, 60-90s rest
- Endurance: 12-20 reps @ 60-70% 1RM, 30-60s rest

**Output format:** JSON with this structure:
{
  "title": "Workout Title",
  "description": "Brief description",
  "exercises": [...]
}
`;
```

### Training Profile Context (Cached)

```typescript
const profileContext = `
**User Training Profile:**
- Experience: Intermediate
- Training Days: 4 days per week
- Equipment: Barbell, dumbbells, rack, bench, resistance bands
- Goals: Strength, hypertrophy
- Constraints: Left shoulder impingement (avoid overhead pressing)

**Personal Records:**
- Back Squat: 315 lbs (2024-12-15)
- Bench Press: 225 lbs (2024-12-20)
- Deadlift: 405 lbs (2024-12-10)

**Important personalization notes:**
- Use PRs to suggest appropriate working weights
- Only use available equipment
- Align workout with goals: strength, hypertrophy
- Respect constraints and avoid contraindicated exercises
`;
```

**Key Insight:** This profile context is marked with `cache_control: { type: "ephemeral" }` so it's cached for 5 minutes. Second request from same user pays only 10% of input cost!

---

### User Request (Dynamic)

```typescript
const userMessage = {
  role: 'user',
  content: 'Give me a leg day workout with squats and deadlifts'
};
```

### Complete Request

```typescript
const response = await invokeClaude({
  systemPrompt: [
    {
      type: 'text',
      text: basePrompt,
      cache_control: { type: 'ephemeral' }
    },
    {
      type: 'text',
      text: profileContext,
      cache_control: { type: 'ephemeral' }
    }
  ],
  messages: [userMessage],
  maxTokens: 4096,
  temperature: 0.7,  // Balanced creativity
  model: 'sonnet'
});
```

---

## Cost Optimization

### 1. Prompt Caching

**How it works:**
- First request: Full cost ($3/1M input tokens)
- Cached content (5 min TTL): 90% discount ($0.30/1M tokens)
- Saves ~50% on average for repeat users

**What to cache:**
- ✅ System prompts (rarely change)
- ✅ Training profile context (changes infrequently)
- ❌ User request (always unique)

**Implementation:**
```typescript
{
  type: 'text',
  text: profileContext,
  cache_control: { type: 'ephemeral' }  // Mark for caching
}
```

**Example Savings:**

| Request # | Input Tokens | Cached Tokens | Input Cost |
|-----------|--------------|---------------|------------|
| 1st (new user) | 2000 | 0 | $0.006 |
| 2nd (same user, 2 min later) | 2000 | 1800 | $0.0012 |
| 3rd (same user, 10 min later) | 2000 | 0 | $0.006 (cache expired) |

**Savings:** 80% on 2nd request!

---

### 2. Model Selection

**Decision tree:**

```
Is this a complex workout (Workout of the Week)?
  → Yes: Use Claude Opus (highest quality, $15/$75)
  → No: Continue

Is this a simple task (timer suggestion)?
  → Yes: Use Claude Haiku (fastest, cheapest, $0.25/$1.25)
  → No: Continue

Default: Use Claude Sonnet (balanced, $3/$15)
```

**Code:**
```typescript
const model = task === 'wow' ? 'opus'
            : task === 'timer' ? 'haiku'
            : 'sonnet';

const response = await invokeClaude({
  model,
  // ... other params
});
```

---

### 3. Latency Optimization

**Feature:** Bedrock Performance Config
**Speed Improvement:** 42-77% faster responses
**Trade-off:** Slightly higher cost (still cheaper than OpenAI)

**Implementation:**
```typescript
const response = await invokeClaude({
  messages: [...],
  latencyOptimized: true  // Enable fast inference
});
```

**Use Cases:**
- Real-time UI updates
- User-facing features where speed matters
- NOT for batch processing (not worth extra cost)

---

### 4. Batch Processing

**Use Case:** Generate 10 workouts at once (e.g., admin dashboard)

**Naive approach (sequential):**
```typescript
// BAD: Takes 50 seconds (5 sec each)
for (const request of requests) {
  await invokeClaude(request);
}
```

**Optimized approach (parallel):**
```typescript
// GOOD: Takes 15 seconds (3 workers in parallel)
import { invokeClaudeBatch } from './bedrock-client';

const responses = await invokeClaudeBatch(requests, {
  concurrency: 3  // Run 3 at a time
});
```

---

## Usage Tracking

### Token Tracking (Per Request)

**File:** `src/lib/ai/bedrock-client.ts`

```typescript
export interface BedrockResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens?: number;  // First time cached
    cacheReadInputTokens?: number;      // Subsequent cached reads
  };
  cost: {
    input: number;
    output: number;
    cache: number;
    total: number;
  };
}
```

### User-Level Tracking (DynamoDB)

**Table:** `spotter-users`

```typescript
{
  "userId": "user-123",
  "aiRequestsUsed": 12,          // This month
  "aiRequestsLimit": 30,         // Tier-based
  "currentMonthTokens": 25000,
  "currentMonthCost": 0.45,      // USD
  "totalTokens": 150000,         // All-time
  "totalCost": 2.34,             // All-time USD
  "lastCostReset": "2025-01-01T00:00:00Z"
}
```

### Cost Reset Logic

```typescript
// Reset on first of month
if (currentDate.getMonth() !== lastResetDate.getMonth()) {
  await dynamoClient.update({
    TableName: 'spotter-users',
    Key: { id: userId },
    UpdateExpression: `
      SET currentMonthCost = :zero,
          currentMonthTokens = :zero,
          aiRequestsUsed = :zero,
          lastCostReset = :now
    `,
    ExpressionAttributeValues: {
      ':zero': 0,
      ':now': new Date().toISOString()
    }
  });
}
```

---

### Admin Cost Monitoring

**Endpoint:** `GET /api/admin/ai-cost-monitoring`
**Purpose:** Track total AI spend across all users

**Response:**
```json
{
  "currentMonth": {
    "totalCost": 45.67,
    "totalTokens": 2500000,
    "requestCount": 1234,
    "averageCostPerRequest": 0.037,
    "topUsers": [
      { "userId": "user-123", "cost": 5.67, "requests": 150 },
      { "userId": "user-456", "cost": 4.23, "requests": 120 }
    ]
  },
  "allTime": {
    "totalCost": 234.56,
    "totalTokens": 15000000,
    "requestCount": 6789
  }
}
```

---

## Request Flow

### Complete AI Workout Generation Flow

```
1. USER REQUEST
   └─> Frontend: WorkoutGenerationForm submits
       POST /api/ai/generate-workout
       Body: { prompt: "leg day with squats" }

2. API ROUTE
   └─> src/app/api/ai/generate-workout/route.ts
       ├─ Verify JWT session (NextAuth)
       ├─ Check rate limit (30 req/hour via Upstash)
       ├─ Check AI quota (tier-based: free=1, pro=30/month)
       └─ Fetch user training profile from DynamoDB

3. BEDROCK CLIENT
   └─> src/lib/ai/bedrock-client.ts:invokeClaude()
       ├─ Build system prompt (exercise science principles)
       ├─ Add training profile context (with cache_control)
       ├─ Add user request
       ├─ Call AWS Bedrock API (Claude Sonnet 4.5)
       └─ Wait for response (~3-5 seconds)

4. RESPONSE PARSING
   └─> Extract JSON workout from Claude response
       ├─ Parse exercises, sets, reps, weights
       ├─ Validate structure (Zod schema)
       └─ Calculate tokens used & cost

5. USAGE TRACKING
   └─> src/lib/ai/usage-tracking.ts:logAIUsage()
       ├─ Update user.aiRequestsUsed++
       ├─ Update user.currentMonthTokens += tokens
       ├─ Update user.currentMonthCost += cost
       └─ Store detailed log in DynamoDB

6. SAVE WORKOUT
   └─> DynamoDB: spotter-workouts table
       ├─ workoutId: uuid()
       ├─ source: "ai"
       ├─ aiModel: "claude-sonnet-4.5"
       ├─ aiCost: 0.0135
       └─ exercises: [...]

7. RETURN TO FRONTEND
   └─> HTTP 200 OK
       {
         "success": true,
         "workout": {...},
         "tokensUsed": 1350,
         "cost": 0.0135,
         "quotaRemaining": 29
       }

8. FRONTEND UPDATE
   └─> Display workout with "Start Workout" button
       Update Zustand store
       Show success toast
```

---

## Error Handling

### Common Errors

| Error Type | Cause | HTTP Code | Solution |
|-----------|-------|-----------|----------|
| **ThrottlingException** | Rate limit exceeded | 429 | Retry with exponential backoff |
| **ValidationException** | Invalid request format | 400 | Check request schema |
| **AccessDeniedException** | Missing IAM permissions | 403 | Verify IAM role |
| **ModelTimeoutError** | Request took >30 seconds | 504 | Reduce max_tokens or retry |
| **ServiceUnavailableException** | Bedrock service down | 503 | Retry later |

### Retry Strategy

```typescript
async function invokeWithRetry(params: BedrockInvokeParams, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await invokeClaude(params);
    } catch (error) {
      if (error.name === 'ThrottlingException' && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### Fallback Strategies

1. **Model Downgrade**
   ```typescript
   try {
     return await invokeClaude({ model: 'opus', ... });
   } catch (error) {
     // Fallback to Sonnet if Opus fails
     return await invokeClaude({ model: 'sonnet', ... });
   }
   ```

2. **Graceful Degradation**
   ```typescript
   try {
     const workout = await generateAIWorkout(prompt);
     return workout;
   } catch (error) {
     // Fall back to template-based workout
     return generateTemplateWorkout(prompt);
   }
   ```

---

## Testing & Monitoring

### Health Check

**Endpoint:** `GET /api/ai/test-connection`
**Purpose:** Verify Bedrock credentials and model access

```typescript
export async function testBedrockConnection(): Promise<boolean> {
  try {
    const response = await invokeClaude({
      messages: [{
        role: 'user',
        content: 'Reply with OK to confirm connectivity.'
      }],
      systemPrompt: 'You are a health check. Output exactly "OK".',
      maxTokens: 2,
      temperature: 0
    });
    return response.content.trim().toUpperCase().startsWith('OK');
  } catch {
    return false;
  }
}
```

**Cost:** ~$0.0001 (1 cent for 100 tests)

---

### Monitoring Metrics

**CloudWatch Metrics:**
1. **InvocationCount** - Total Bedrock API calls
2. **InvocationLatency** - Response time (p50, p95, p99)
3. **ThrottlingExceptions** - Rate limit hits
4. **ModelErrors** - Failed requests

**Custom Application Metrics:**
```typescript
logger.info('[Bedrock Usage]', {
  operation: 'workout_generation',
  userId: user.id,
  inputTokens: 2000,
  outputTokens: 800,
  cacheHit: true,
  cacheReadTokens: 1800,
  cost: 0.0135,
  latency: 3245,  // ms
  model: 'sonnet'
});
```

---

### Cost Alerts

**CloudWatch Alarm:**
```
Metric: Custom/AISpend/MonthlyTotal
Threshold: $100/month
Action: Email admin + Slack notification
```

**Per-User Cost Cap:**
```typescript
if (user.currentMonthCost > 10.00) {  // $10 cap per user
  throw new Error('Monthly AI cost limit exceeded');
}
```

---

## Best Practices

### 1. Always Use Prompt Caching

❌ **Bad:**
```typescript
const response = await invokeClaude({
  systemPrompt: largePrompt,  // No caching
  messages: [...]
});
```

✅ **Good:**
```typescript
const response = await invokeClaude({
  systemPrompt: [
    {
      type: 'text',
      text: largePrompt,
      cache_control: { type: 'ephemeral' }  // Enable caching
    }
  ],
  messages: [...]
});
```

### 2. Track Everything

```typescript
// Always log usage for cost tracking
await logUsage('workout_generation', userId, response, {
  subscriptionTier: user.subscriptionTier,
  workoutId: workout.id,
  success: true
});
```

### 3. Validate AI Output

```typescript
import { z } from 'zod';

const WorkoutSchema = z.object({
  title: z.string(),
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.number().min(1),
    reps: z.union([z.number(), z.string()])
  }))
});

const workout = WorkoutSchema.parse(JSON.parse(response.content));
```

### 4. Handle Quota Limits

```typescript
if (user.aiRequestsUsed >= user.aiRequestsLimit) {
  return res.status(403).json({
    error: 'AI quota exceeded',
    upgradeUrl: '/subscription',
    nextResetDate: '2025-02-01'
  });
}
```

---

## Next Steps

- Read [API-REFERENCE.md](API-REFERENCE.md) for AI endpoint documentation
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system integration
- Read [FRONTEND.md](FRONTEND.md) for AI feature UI components
- Review [BEDROCK-PERFORMANCE-OPTIMIZATIONS.md](BEDROCK-PERFORMANCE-OPTIMIZATIONS.md) for advanced optimization

---

**Last Updated:** January 2025
**Maintained By:** Development Team
**Questions?** Check AWS Bedrock documentation or contact the team
