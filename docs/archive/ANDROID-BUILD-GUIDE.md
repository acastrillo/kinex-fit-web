# Kinex Fit Android Build Guide

**Last Updated:** December 26, 2024
**Backend Status:** ✅ 100% Production Ready
**Web App:** https://kinexfit.com
**Approach:** React Native + Shared TypeScript Business Logic

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What's Already Built](#whats-already-built)
3. [Backend Architecture](#backend-architecture)
4. [Authentication Strategy](#authentication-strategy)
5. [Shared Business Logic](#shared-business-logic)
6. [API Reference](#api-reference)
7. [Android Implementation Plan](#android-implementation-plan)
8. [Code Examples](#code-examples)
9. [Testing & Deployment](#testing--deployment)

---

## Executive Summary

### What is Kinex Fit?

Kinex Fit is a comprehensive fitness tracking platform that allows users to:
- Track workouts with detailed exercise, set, and rep data
- Scan workout images using OCR (Instagram screenshots, gym whiteboards)
- Monitor personal records (PRs) and progress over time
- Schedule workouts on a calendar
- Track body metrics (weight, measurements, body fat)
- Access AI-powered workout generation and enhancement (paid tiers)
- Sync data across web and mobile platforms

### Current State (December 2024)

**✅ Production Backend Deployed:**
- Next.js 14 API routes running on AWS ECS
- URL: `https://kinexfit.com`
- DynamoDB for all data storage
- Stripe for subscriptions (Live Mode)
- Cognito + Google OAuth for authentication
- S3 for image storage
- 20+ API endpoints fully operational

**✅ Key Features Deployed:**
- Card carousel workout session with auto-advance rest timer
- AI workout generation and enhancement (Claude Haiku)
- AI timer suggestions (EMOM, AMRAP, Tabata, Intervals)
- Workout completions tracking with duration
- Personal records calculation (7 different 1RM formulas)
- Body metrics tracking
- Instagram workout import
- OCR workout scanning (Tesseract/AWS Textract)

**🎯 Android App Objective:**

Build a native Android app (React Native/Expo) that:
1. Reuses 80% of business logic from the web app
2. Authenticates via Cognito with bearer tokens
3. Syncs with existing backend APIs (no new endpoints needed)
4. Implements the card carousel workout session UX
5. Provides offline-first experience with MMKV caching
6. Delivers feature parity with web app

---

## What's Already Built

### Backend APIs (100% Ready)

All endpoints are deployed and working. Only need to add bearer token authentication middleware.

**Workouts API:**
```
GET    /api/workouts                    - List all user workouts
GET    /api/workouts/[id]               - Get workout details
POST   /api/workouts                    - Create workout
PATCH  /api/workouts/[id]               - Update workout
DELETE /api/workouts/[id]               - Delete workout
GET    /api/workouts/scheduled          - Get scheduled workouts
POST   /api/workouts/[id]/schedule      - Schedule workout for date
DELETE /api/workouts/[id]/schedule      - Unschedule workout
POST   /api/workouts/[id]/complete      - Mark workout complete (with duration)
GET    /api/workouts/stats              - Get workout statistics
GET    /api/workouts/[id]/completions   - Get completion history
POST   /api/workouts/[id]/completions   - Add completion record
GET    /api/workouts/completions/stats  - Get completion analytics
```

**Body Metrics API:**
```
GET    /api/body-metrics         - List all metrics
POST   /api/body-metrics         - Create metric
GET    /api/body-metrics/[date]  - Get metric by date (YYYY-MM-DD)
PATCH  /api/body-metrics/[date]  - Update metric
DELETE /api/body-metrics/[date]  - Delete metric
GET    /api/body-metrics/latest  - Get most recent metric
```

**Import & OCR API:**
```
POST /api/ocr              - Process workout image via OCR
POST /api/instagram-fetch  - Parse Instagram workout URL
POST /api/upload-image     - Upload to S3, get presigned URL
POST /api/ingest           - General data ingestion
```

**AI API:**
```
POST /api/ai/enhance-workout    - AI-enhance parsed workout
POST /api/ai/generate-workout   - Generate workout from prompt
POST /api/ai/suggest-timer      - Suggest timer config for workout
GET  /api/ai/test-connection    - Test Bedrock connectivity
```

**User & Profile API:**
```
GET   /api/user/profile   - Get user training profile
PATCH /api/user/profile   - Update training profile
```

**Stripe/Subscriptions API:**
```
POST /api/stripe/checkout  - Create checkout session
POST /api/stripe/portal    - Create customer portal session
POST /api/stripe/webhook   - Handle Stripe webhooks
GET  /api/stripe/subscription - Get subscription status
POST /api/stripe/cancel    - Cancel subscription
```

**Auth API:**
```
/api/auth/*  - NextAuth endpoints (Cognito + Google OAuth)
```

### Business Logic Files (Ready to Extract)

These TypeScript files have zero React dependencies and can be moved to a shared package:

**1. Type Definitions:**
```typescript
// src/lib/dynamodb.ts
- DynamoDBUser (with subscription fields)
- DynamoDBWorkout (with exercises[], scheduling, timer config)
- DynamoDBBodyMetric
- WorkoutCompletion

// src/types/workout-card.ts
- WorkoutCard, ExerciseCard, RestCard
- WorkoutRepetition types

// src/lib/training-profile.ts
- TrainingProfile, PersonalRecord, TrainingConstraint
```

**2. Workout Parsing:**
```typescript
// src/lib/smartWorkoutParser.ts (500+ lines)
- exerciseDatabase (100+ exercises with categories)
- detectWorkoutStructure()
- parseWorkoutText()
- normalizeExerciseName()
- parseSetNotation() - "3x10", "5x5", "AMRAP", etc.

// src/lib/igParser.ts + igParser_toV1.ts
- Instagram content extraction
- Parse Instagram workout formats
```

**3. Workout Transformations:**
```typescript
// src/lib/workout/card-transformer.ts
- expandWorkoutToCards() - Convert exercises to card sequence
- collapseCardsToExercises() - Reverse transformation
- Workout repetition logic (sets/rounds/AMRAP)
```

**4. Calculations:**
```typescript
// src/lib/pr-calculator.ts (350+ lines)
- calculateBrzycki() - 1RM formula
- calculateEpley() - 1RM formula
- calculateLander() - 1RM formula
- calculateLombardi() - 1RM formula
- calculateMayhew() - 1RM formula
- calculateOConner() - 1RM formula
- calculateWathan() - 1RM formula
- detectPRs() - Identify personal records
- parseWeight() - Parse "135 lbs" to { value: 135, unit: 'lbs' }

// src/lib/exercise-history.ts
- extractExercisesFromWorkout()
- groupExercisesByMuscleGroup()
- calculateTotalVolume()

// src/lib/body-metrics.ts
- calculateBMI()
- convertWeight() - lbs ↔ kg
- convertMeasurement() - in ↔ cm
```

**5. Training Profile:**
```typescript
// src/lib/training-profile.ts (200+ lines)
- TrainingProfile interface
- defaultTrainingProfile
- EQUIPMENT_OPTIONS (50+ equipment types)
- TRAINING_GOALS (15+ goal options)
- Experience levels, workout splits, training locations
```

**6. Feature Gating & Quotas:**
```typescript
// src/lib/feature-gating.tsx
- Subscription tier definitions (Free/Core/Pro/Elite)
- Feature gates (workouts max, OCR quotas, AI limits)
- Quota checking logic
- Pricing: Core $8.99, Pro $13.99, Elite $24.99

// src/lib/rate-limit.ts
- Rate limiting rules by tier
- Request throttling logic
```

**7. Timer Logic:**
```typescript
// Timer configuration types and defaults
- EMOM (Every Minute On the Minute)
- AMRAP (As Many Rounds As Possible)
- INTERVAL_WORK_REST (Circuit training)
- TABATA (High-intensity intervals)
```

---

## Backend Architecture

### Tech Stack

```
┌─────────────────────────────────────────┐
│  Android App (React Native)             │
│  - Expo framework                       │
│  - @kinex-fit/shared business logic    │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS API Calls (Bearer Token)
               │
┌──────────────▼──────────────────────────┐
│  Backend API (Next.js 14)               │
│  URL: https://kinexfit.com │
│  - /api/workouts/*                      │
│  - /api/body-metrics/*                  │
│  - /api/ocr, /api/instagram-fetch       │
│  - /api/ai/*                            │
│  - /api/stripe/*                        │
│  - /api/user/*                          │
└──────────────┬──────────────────────────┘
               │
               ├──► DynamoDB (AWS)
               │    - users table (EmailIndex GSI)
               │    - workouts table
               │    - body-metrics table
               │    - workout-completions table
               │    - stripeCustomerId-index GSI
               │
               ├──► Stripe (Live Mode)
               │    - Subscriptions
               │    - Customer Portal
               │    - Webhooks
               │
               ├──► AWS Bedrock (Claude Haiku)
               │    - AI workout generation
               │    - AI workout enhancement
               │    - AI timer suggestions
               │
               └──► AWS Services
                    - S3 (workout images)
                    - Cognito (authentication)
                    - CloudWatch (logs)
                    - ECS (container hosting)
```

### Database Schema (DynamoDB)

**users table:**
```typescript
{
  id: string (UUID, partition key)
  email: string (unique, indexed via EmailIndex GSI)
  firstName: string | null
  lastName: string | null

  // Authentication
  provider: "google" | "credentials" | "cognito"

  // Subscription
  subscriptionTier: "free" | "core" | "pro" | "elite"
  subscriptionStatus: "active" | "inactive" | "trialing" | "canceled"
  stripeCustomerId: string (indexed via stripeCustomerId-index GSI)
  stripeSubscriptionId: string
  subscriptionStartDate: string (ISO)
  subscriptionEndDate: string (ISO)
  trialEndsAt: string (ISO)

  // Usage Quotas
  ocrQuotaUsed: number
  ocrQuotaLimit: number
  ocrQuotaResetDate: string (ISO)
  workoutsSaved: number
  aiRequestsUsed: number
  aiRequestsLimit: number
  lastAiRequestReset: string (ISO)

  // Training Profile
  trainingProfile: {
    experience: "beginner" | "intermediate" | "advanced"
    goals: string[]
    equipment: string[]
    workoutSplit: string
    location: string
  }

  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

**workouts table:**
```typescript
{
  userId: string (partition key)
  workoutId: string (sort key, UUID)
  title: string
  description: string | null
  content: string // Markdown workout content
  source: "user" | "ai" | "import" | "ocr"
  type: "strength" | "cardio" | "mixed"
  difficulty: "beginner" | "intermediate" | "advanced"
  tags: string[]
  totalDuration: number // minutes estimate

  exercises: [{
    id: string (UUID)
    name: string
    notes: string | null
    sets: number
    reps: string | number
    weight: string | number | null
    restSeconds: number | null
    setDetails: [{
      id: string
      reps: string | number | null
      weight: string | number | null
    }]
  }]

  // Timer Configuration
  timerConfig: {
    params: {
      kind: "EMOM" | "AMRAP" | "INTERVAL_WORK_REST" | "TABATA"
      // EMOM
      intervalSeconds?: number
      totalMinutes?: number
      // AMRAP
      durationSeconds?: number
      // INTERVAL_WORK_REST
      workSeconds?: number
      restSeconds?: number
      totalRounds?: number
      prepSeconds?: number
      // TABATA
      rounds?: number
    }
    aiGenerated?: boolean
    reason?: string // AI explanation
  } | null

  // Scheduling & Completion
  status: "draft" | "scheduled" | "completed" | null
  scheduledDate: string (ISO) | null
  completedDate: string (ISO) | null
  completedAt: string (ISO timestamp) | null
  durationSeconds: number | null // Actual workout duration

  // Media
  imageUrls: string[] // S3 URLs
  thumbnailUrl: string | null

  // Metadata
  author: { username: string } | null
  llmData: object | null // AI generation metadata
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

**workout-completions table:**
```typescript
{
  userId: string (partition key)
  completionId: string (sort key, UUID)
  workoutId: string (indexed via workoutId-index GSI)
  completedAt: string (ISO timestamp)
  durationSeconds: number
  notes?: string
  exercises?: [{
    exerciseId: string
    completed: boolean
    completedAt?: string
  }]
}
```

**body-metrics table:**
```typescript
{
  userId: string (partition key)
  date: string (sort key, YYYY-MM-DD)
  weight: number | null
  weightUnit: "lbs" | "kg"
  bodyFat: number | null // percentage
  measurements: {
    chest?: number
    waist?: number
    hips?: number
    thighs?: number
    arms?: number
    measurementUnit: "in" | "cm"
  }
  notes?: string
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

### Subscription Tiers

| Tier | Monthly | Annual | Features | Limits |
|------|---------|--------|----------|--------|
| **Free** | $0 | $0 | - 3 workouts/week<br>- 1 Instagram import/month<br>- 1 AI request/month<br>- 90-day history | Limited features |
| **Core** | $8.99 | $69.99<br>($5.83/mo) | - Unlimited workouts<br>- 3 Instagram imports/week<br>- 10 AI requests/month<br>- Unlimited history | PR tracking, body metrics, basic analytics |
| **Pro** | $13.99 | $109.99<br>($9.17/mo) | - Everything in Core<br>- Unlimited Instagram imports<br>- 30 AI requests/month | Advanced analytics, templates, data export |
| **Elite** | $24.99 | $199.99<br>($16.67/mo) | - Everything in Pro<br>- 100 AI requests/month<br>- Priority support | Early access, custom templates, API access |

---

## Authentication Strategy

### Current Web Auth (Cookie-Based)

The web app uses NextAuth with:
- **Cookie sessions** (`next-auth.session-token`)
- **Google OAuth** via Cognito federated identity
- **Email/Password** via Cognito user pools

### Android Auth (Bearer Token)

For Android, we need to add **bearer token support** while maintaining cookie auth for web.

**Step 1: Create Mobile Cognito App Client**

In AWS Cognito User Pool console:
```bash
# Create new app client with:
- App client name: "kinex-fit-mobile"
- Enable PKCE (Proof Key for Code Exchange)
- Add callback URL: spotbuddy://callback
- Add sign-out URL: spotbuddy://signout
- Enable Google OAuth federated sign-in
- Token expiration: Access 1hr, Refresh 30 days
```

**Step 2: Add Bearer Token Middleware**

Create `src/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Verifier for Cognito access tokens
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_MOBILE_CLIENT_ID!,
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public routes
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/stripe/webhook')
  ) {
    return NextResponse.next();
  }

  // Check for cookie session (web)
  const sessionToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (sessionToken) {
    // Web auth via cookie - add userId to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', sessionToken.sub!);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Check for bearer token (mobile)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const payload = await verifier.verify(token);

      // Map Cognito sub to our user ID
      const userId = payload.sub;

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', userId);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  }

  // No valid auth found
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

export const config = {
  matcher: [
    '/api/workouts/:path*',
    '/api/body-metrics/:path*',
    '/api/user/:path*',
    '/api/ai/:path*',
    '/api/ocr',
    '/api/instagram-fetch',
    '/api/upload-image',
    '/api/stripe/checkout',
    '/api/stripe/portal',
    '/api/stripe/cancel',
    '/api/stripe/subscription',
  ],
};
```

**Step 3: Update API Routes to Use User ID**

All API routes can now read userId from headers:
```typescript
// In any API route
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use userId to fetch user-specific data
  const workouts = await getWorkoutsForUser(userId);
  return NextResponse.json({ workouts });
}
```

---

## Shared Business Logic

### Creating the Shared Package

**Step 1: Set Up Workspace**

```bash
# In web repo root
mkdir -p packages/shared
cd packages/shared
npm init -y
```

**Step 2: Package Structure**

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.ts
│   │   ├── workout.ts
│   │   ├── exercise.ts
│   │   ├── body-metrics.ts
│   │   └── subscription.ts
│   ├── parsers/
│   │   ├── smartWorkoutParser.ts
│   │   └── igParser.ts
│   ├── transformers/
│   │   └── card-transformer.ts
│   ├── calculators/
│   │   ├── pr-calculator.ts
│   │   ├── exercise-history.ts
│   │   └── body-metrics.ts
│   ├── profile/
│   │   └── training-profile.ts
│   ├── subscriptions/
│   │   ├── feature-gating.ts
│   │   └── rate-limits.ts
│   ├── constants/
│   │   ├── exercises.ts
│   │   └── muscle-groups.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Step 3: package.json**

```json
{
  "name": "@kinex-fit/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**Step 4: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 5: Usage in Web App**

```json
// web-app/package.json
{
  "dependencies": {
    "@kinex-fit/shared": "workspace:*"
  }
}
```

**Step 6: Usage in Android App**

```json
// android-app/package.json
{
  "dependencies": {
    "@kinex-fit/shared": "file:../kinex-fit-web/packages/shared"
  }
}
```

### Key Shared Modules

**1. Workout Parser (src/parsers/smartWorkoutParser.ts):**

```typescript
export interface ParsedWorkout {
  title?: string;
  exercises: ParsedExercise[];
  notes?: string;
}

export interface ParsedExercise {
  name: string;
  sets?: number;
  reps?: string | number;
  weight?: string | number;
  restSeconds?: number;
  notes?: string;
  setDetails?: Array<{
    reps: string | number;
    weight?: string | number;
  }>;
}

export function parseWorkoutText(text: string): ParsedWorkout {
  // 500+ lines of parsing logic
  // Returns structured workout from text
}

export const exerciseDatabase = [
  { name: 'Squat', category: 'legs', muscleGroup: 'quads' },
  { name: 'Bench Press', category: 'chest', muscleGroup: 'chest' },
  // 100+ exercises...
];
```

**2. PR Calculator (src/calculators/pr-calculator.ts):**

```typescript
export interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
  workoutId: string;
}

export function calculateBrzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (36 / (37 - reps));
}

export function calculateEpley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function detectPRs(
  workouts: Workout[]
): Record<string, PersonalRecord[]> {
  // Logic to find PRs across all workouts
}
```

**3. Feature Gating (src/subscriptions/feature-gating.ts):**

```typescript
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    workoutsPerWeek: 3,
    ocrQuotaMonthly: 1,
    aiRequestsMonthly: 1,
    historyDays: 90,
  },
  core: {
    name: 'Core',
    price: 8.99,
    workoutsPerWeek: Infinity,
    ocrQuotaMonthly: 12,
    aiRequestsMonthly: 10,
    historyDays: Infinity,
  },
  pro: {
    name: 'Pro',
    price: 13.99,
    workoutsPerWeek: Infinity,
    ocrQuotaMonthly: Infinity,
    aiRequestsMonthly: 30,
    historyDays: Infinity,
  },
  elite: {
    name: 'Elite',
    price: 24.99,
    workoutsPerWeek: Infinity,
    ocrQuotaMonthly: Infinity,
    aiRequestsMonthly: 100,
    historyDays: Infinity,
  },
};

export function canUseFeature(
  user: User,
  feature: string
): boolean {
  const tier = SUBSCRIPTION_TIERS[user.subscriptionTier];
  // Check quota logic
}
```

---

## API Reference

### Authentication

All mobile API requests must include:
```
Authorization: Bearer <cognito_access_token>
```

### Workouts API

**Get All Workouts:**
```http
GET /api/workouts
Authorization: Bearer <token>

Response 200:
{
  "workouts": [
    {
      "workoutId": "uuid",
      "userId": "uuid",
      "title": "Chest & Triceps",
      "description": "Heavy bench focus",
      "exercises": [
        {
          "id": "uuid",
          "name": "Bench Press",
          "sets": 4,
          "reps": "8-10",
          "weight": 185,
          "restSeconds": 120,
          "setDetails": [
            { "id": "uuid", "reps": 10, "weight": 185 },
            { "id": "uuid", "reps": 9, "weight": 185 },
            { "id": "uuid", "reps": 8, "weight": 185 },
            { "id": "uuid", "reps": 8, "weight": 185 }
          ]
        }
      ],
      "timerConfig": {
        "params": {
          "kind": "INTERVAL_WORK_REST",
          "workSeconds": 45,
          "restSeconds": 15,
          "totalRounds": 4,
          "prepSeconds": 10
        },
        "aiGenerated": true,
        "reason": "Detected circuit-style workout with multiple exercises"
      },
      "status": "completed",
      "completedAt": "2024-12-02T18:30:00Z",
      "durationSeconds": 3600,
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ]
}
```

**Create Workout:**
```http
POST /api/workouts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Leg Day",
  "description": "Squat focus",
  "exercises": [
    {
      "name": "Squat",
      "sets": 5,
      "reps": 5,
      "weight": 225,
      "restSeconds": 180
    },
    {
      "name": "Romanian Deadlift",
      "sets": 3,
      "reps": 10,
      "weight": 135,
      "restSeconds": 90
    }
  ],
  "tags": ["legs", "strength"]
}

Response 201:
{
  "workout": {
    "workoutId": "new-uuid",
    "userId": "uuid",
    "title": "Leg Day",
    // ... full workout object
  }
}
```

**Complete Workout:**
```http
POST /api/workouts/:id/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "completedDate": "2024-12-02",
  "completedAt": "2024-12-02T18:30:00Z",
  "durationSeconds": 3600
}

Response 200:
{
  "success": true,
  "workoutId": "uuid",
  "completedDate": "2024-12-02",
  "completedAt": "2024-12-02T18:30:00Z",
  "durationSeconds": 3600,
  "status": "completed"
}
```

**Get Completions:**
```http
GET /api/workouts/:id/completions
Authorization: Bearer <token>

Response 200:
{
  "completions": [
    {
      "completionId": "uuid",
      "workoutId": "uuid",
      "completedAt": "2024-12-02T18:30:00Z",
      "durationSeconds": 3600,
      "notes": "Felt strong today"
    }
  ]
}
```

**Get Stats:**
```http
GET /api/workouts/completions/stats
Authorization: Bearer <token>

Response 200:
{
  "totalCompletions": 150,
  "last30Days": 12,
  "last7Days": 4,
  "averageDuration": 3200,
  "longestWorkout": 5400,
  "currentStreak": 7,
  "longestStreak": 14
}
```

### Body Metrics API

**Get All Metrics:**
```http
GET /api/body-metrics
Authorization: Bearer <token>

Response 200:
{
  "metrics": [
    {
      "userId": "uuid",
      "date": "2024-12-01",
      "weight": 185.5,
      "weightUnit": "lbs",
      "bodyFat": 15.2,
      "measurements": {
        "chest": 42,
        "waist": 32,
        "arms": 15.5,
        "measurementUnit": "in"
      }
    }
  ]
}
```

**Create Metric:**
```http
POST /api/body-metrics
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2024-12-02",
  "weight": 186.0,
  "weightUnit": "lbs",
  "bodyFat": 15.0
}

Response 201:
{
  "metric": { /* created metric */ }
}
```

### AI API

**Generate Workout:**
```http
POST /api/ai/generate-workout
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "Create a chest and triceps workout for strength",
  "trainingProfile": {
    "experience": "intermediate",
    "goals": ["strength", "hypertrophy"],
    "equipment": ["barbell", "dumbbells", "bench"]
  }
}

Response 200:
{
  "workout": {
    "title": "Chest & Triceps Strength",
    "exercises": [/* AI-generated exercises */],
    "estimatedDuration": 60
  },
  "usage": {
    "inputTokens": 150,
    "outputTokens": 300,
    "cost": 0.002
  }
}
```

**Suggest Timer:**
```http
POST /api/ai/suggest-timer
Authorization: Bearer <token>
Content-Type: application/json

{
  "workout": {
    "title": "HIIT Circuit",
    "exercises": [/* exercises */]
  }
}

Response 200:
{
  "timerConfig": {
    "params": {
      "kind": "TABATA",
      "workSeconds": 20,
      "restSeconds": 10,
      "rounds": 8,
      "prepSeconds": 10
    },
    "aiGenerated": true,
    "reason": "High-intensity circuit detected. Tabata protocol optimal for short, intense bursts."
  }
}
```

### OCR API

**Process Image:**
```http
POST /api/ocr
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "image": <file>,
  "provider": "tesseract" // or "textract"
}

Response 200:
{
  "text": "Bench Press 3x8 @ 185lbs\nSquat 5x5 @ 225lbs",
  "parsedWorkout": {
    "exercises": [
      { "name": "Bench Press", "sets": 3, "reps": 8, "weight": 185 },
      { "name": "Squat", "sets": 5, "reps": 5, "weight": 225 }
    ]
  },
  "quotaRemaining": 11
}
```

### Subscription API

**Get Status:**
```http
GET /api/stripe/subscription
Authorization: Bearer <token>

Response 200:
{
  "tier": "core",
  "status": "active",
  "currentPeriodEnd": "2025-01-02T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "quotas": {
    "workoutsThisWeek": 5,
    "workoutsLimit": Infinity,
    "ocrUsed": 3,
    "ocrLimit": 12,
    "aiUsed": 2,
    "aiLimit": 10
  }
}
```

**Create Checkout:**
```http
POST /api/stripe/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "tier": "core", // or "pro", "elite"
  "returnUrl": "spotbuddy://subscription/success"
}

Response 200:
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}
```

---

## Android Implementation Plan

### Phase 1: Backend Prep (1 week)

**Tasks:**
1. Create Cognito mobile app client with PKCE
2. Add bearer token middleware to Next.js
3. Test authentication with Postman/curl
4. Extract shared business logic to `packages/shared`
5. Build shared package and publish locally

**Deliverables:**
- [ ] Cognito app client created
- [ ] Middleware deployed to production
- [ ] All API endpoints accept bearer tokens
- [ ] Shared package built and ready

**Code: Test Bearer Token**
```bash
# Get access token from Cognito (use Postman or AWS CLI)
TOKEN="your_cognito_access_token"

# Test API call
curl https://kinexfit.com/api/workouts \
  -H "Authorization: Bearer $TOKEN"
```

### Phase 2: Android Setup (1 week)

**Tasks:**
1. Create Expo app with TypeScript
2. Set up navigation (Auth + Main tabs)
3. Configure theme and styling
4. Install dependencies
5. Set up API client with token management

**Code: Bootstrap App**
```bash
npx create-expo-app@latest kinex-fit-android --template blank-typescript
cd kinex-fit-android

# Install core dependencies
npx expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install expo-router expo-secure-store expo-image-picker expo-camera
npx expo install @tanstack/react-query zustand react-native-mmkv
npx expo install nativewind lucide-react-native

# Install shared package
npm install @kinex-fit/shared@file:../kinex-fit-web/packages/shared
```

**Code: Navigation Structure (app/_layout.tsx)**
```typescript
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="(auth)" />
        ) : (
          <Stack.Screen name="(tabs)" />
        )}
      </Stack>
    </QueryClientProvider>
  );
}
```

**Code: API Client (lib/api-client.ts)**
```typescript
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://kinexfit.com';

class APIClient {
  private async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('accessToken');
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired - trigger refresh or logout
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Convenience methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
```

**Deliverables:**
- [ ] Expo app initialized
- [ ] Navigation working
- [ ] API client configured
- [ ] Theme applied

### Phase 3: Authentication (1 week)

**Tasks:**
1. Implement Cognito PKCE OAuth flow
2. Google OAuth integration
3. Token storage in SecureStore
4. Auto-refresh logic
5. Logout flow

**Code: Auth with Cognito (lib/auth.ts)**
```typescript
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { useAuthRequest, makeRedirectUri } from 'expo-auth-session';

const COGNITO_DOMAIN = 'your-app.auth.us-east-1.amazoncognito.com';
const CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID!;

const discovery = {
  authorizationEndpoint: `https://${COGNITO_DOMAIN}/oauth2/authorize`,
  tokenEndpoint: `https://${COGNITO_DOMAIN}/oauth2/token`,
  revocationEndpoint: `https://${COGNITO_DOMAIN}/oauth2/revoke`,
};

export function useAuth() {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      redirectUri: makeRedirectUri({
        scheme: 'spotbuddy',
        path: 'callback',
      }),
      usePKCE: true,
    },
    discovery
  );

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code);
    }
  }, [response]);

  async function exchangeCodeForToken(code: string) {
    const tokenResponse = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: request!.redirectUri,
        code_verifier: request!.codeVerifier!,
      }),
    });

    const tokens = await tokenResponse.json();

    await SecureStore.setItemAsync('accessToken', tokens.access_token);
    await SecureStore.setItemAsync('refreshToken', tokens.refresh_token);
    await SecureStore.setItemAsync('idToken', tokens.id_token);

    // Update auth state
  }

  return {
    signIn: () => promptAsync(),
    signOut: async () => {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('idToken');
    },
  };
}
```

**Code: Auth Store (store/auth.ts)**
```typescript
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,

  checkAuth: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      // Optionally fetch user profile
      set({ isAuthenticated: true });
    } else {
      set({ isAuthenticated: false });
    }
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ isAuthenticated: false, user: null });
  },
}));
```

**Deliverables:**
- [ ] Google OAuth working
- [ ] Tokens stored securely
- [ ] Auto-refresh implemented
- [ ] Login/logout flows complete

### Phase 4: Core Features (4 weeks)

#### Week 1: Workouts Library

**Tasks:**
1. Fetch workouts with React Query
2. Display in FlatList with search
3. Swipe actions (delete, schedule)
4. Pull-to-refresh
5. Offline cache with MMKV

**Code: Workouts List (app/(tabs)/workouts.tsx)**
```typescript
import { FlatList, View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { WorkoutCard } from '@/components/WorkoutCard';

export default function WorkoutsScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => apiClient.get('/api/workouts'),
  });

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={data?.workouts || []}
        keyExtractor={(item) => item.workoutId}
        renderItem={({ item }) => <WorkoutCard workout={item} />}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}
```

**Code: Workout Card (components/WorkoutCard.tsx)**
```typescript
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Workout } from '@kinex-fit/shared';

interface Props {
  workout: Workout;
}

export function WorkoutCard({ workout }: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/workout/${workout.workoutId}`)}
      className="bg-card p-4 rounded-lg mb-3"
    >
      <Text className="text-xl font-bold text-foreground">
        {workout.title}
      </Text>
      <Text className="text-muted-foreground mt-1">
        {workout.exercises.length} exercises
      </Text>
      {workout.completedAt && (
        <Text className="text-green-500 mt-2">
          Completed {new Date(workout.completedAt).toLocaleDateString()}
        </Text>
      )}
    </Pressable>
  );
}
```

#### Week 2: Add Workout Flows

**Tasks:**
1. Manual entry form
2. Camera OCR integration
3. Instagram import
4. Exercise search with autocomplete

**Code: Add Workout (app/(tabs)/add.tsx)**
```typescript
import { View, TextInput, Button } from 'react-native';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { parseWorkoutText } from '@kinex-fit/shared';

export default function AddWorkoutScreen() {
  const [workoutText, setWorkoutText] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (workout: any) => apiClient.post('/api/workouts', workout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      setWorkoutText('');
    },
  });

  const handleSubmit = () => {
    const parsed = parseWorkoutText(workoutText);
    createMutation.mutate({
      title: parsed.title || 'New Workout',
      exercises: parsed.exercises,
    });
  };

  return (
    <View className="flex-1 p-4 bg-background">
      <TextInput
        className="bg-card p-4 rounded-lg text-foreground"
        multiline
        numberOfLines={10}
        placeholder="Enter workout..."
        value={workoutText}
        onChangeText={setWorkoutText}
      />
      <Button
        title="Create Workout"
        onPress={handleSubmit}
        disabled={createMutation.isPending}
      />
    </View>
  );
}
```

#### Week 3: Stats & PRs

**Tasks:**
1. Calculate PRs client-side
2. Display PR history
3. Charts with Victory Native
4. Group by muscle group

**Code: Stats Screen (app/(tabs)/stats.tsx)**
```typescript
import { View, Text, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { detectPRs } from '@kinex-fit/shared';
import { VictoryLine, VictoryChart } from 'victory-native';

export default function StatsScreen() {
  const { data } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => apiClient.get('/api/workouts'),
  });

  const prs = detectPRs(data?.workouts || []);

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-foreground mb-4">
        Personal Records
      </Text>

      {Object.entries(prs).map(([exercise, records]) => (
        <View key={exercise} className="bg-card p-4 rounded-lg mb-4">
          <Text className="text-xl font-bold text-foreground">
            {exercise}
          </Text>
          <Text className="text-primary text-3xl mt-2">
            {records[0]?.estimated1RM.toFixed(0)} lbs
          </Text>
          <Text className="text-muted-foreground">
            from {records[0]?.weight}x{records[0]?.reps}
          </Text>

          <VictoryChart height={200}>
            <VictoryLine
              data={records.map((r, i) => ({ x: i, y: r.estimated1RM }))}
            />
          </VictoryChart>
        </View>
      ))}
    </ScrollView>
  );
}
```

#### Week 4: Workout Session

**Tasks:**
1. Card carousel with ViewPager
2. Rest timer with countdown
3. Session duration tracking
4. Complete workout API call

**Code: Workout Session (app/workout/[id]/session.tsx)**
```typescript
import { View, Text, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import PagerView from 'react-native-pager-view';

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams();
  const [currentExercise, setCurrentExercise] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [sessionStart] = useState(Date.now());
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);

  const { data } = useQuery({
    queryKey: ['workout', id],
    queryFn: () => apiClient.get(`/api/workouts/${id}`),
  });

  const completeMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/workouts/${id}/complete`, {
      completedDate: new Date().toISOString().split('T')[0],
      completedAt: new Date().toISOString(),
      durationSeconds: Math.floor((Date.now() - sessionStart) / 1000),
    }),
  });

  const handleCompleteExercise = (index: number) => {
    setCompletedExercises(prev => new Set(prev).add(index));

    const exercise = data.workout.exercises[index];
    if (exercise.restSeconds) {
      setRestSeconds(exercise.restSeconds);
      setShowRestTimer(true);
    } else if (index < data.workout.exercises.length - 1) {
      setCurrentExercise(index + 1);
    } else {
      completeMutation.mutate();
    }
  };

  useEffect(() => {
    if (showRestTimer && restSeconds > 0) {
      const timer = setTimeout(() => setRestSeconds(restSeconds - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showRestTimer && restSeconds === 0) {
      setShowRestTimer(false);
      setCurrentExercise(currentExercise + 1);
    }
  }, [showRestTimer, restSeconds]);

  if (!data) return null;

  return (
    <View className="flex-1 bg-background">
      <PagerView
        style={{ flex: 1 }}
        initialPage={currentExercise}
        onPageSelected={(e) => setCurrentExercise(e.nativeEvent.position)}
      >
        {data.workout.exercises.map((exercise, index) => (
          <View key={exercise.id} className="p-4">
            <View className="bg-card p-6 rounded-lg">
              <Text className="text-4xl font-bold text-foreground">
                {exercise.name}
              </Text>

              <Text className="text-2xl text-muted-foreground mt-4">
                {exercise.sets} sets × {exercise.reps} reps
              </Text>

              {exercise.weight && (
                <Text className="text-xl text-primary mt-2">
                  {exercise.weight} lbs
                </Text>
              )}

              {!completedExercises.has(index) && (
                <Pressable
                  onPress={() => handleCompleteExercise(index)}
                  className="bg-primary p-4 rounded-lg mt-6"
                >
                  <Text className="text-center text-xl font-bold">
                    Complete Exercise
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </PagerView>

      {showRestTimer && (
        <View className="absolute inset-0 bg-black/80 items-center justify-center">
          <Text className="text-6xl font-bold text-primary">
            {restSeconds}s
          </Text>
          <Text className="text-xl text-foreground mt-4">
            Rest Time
          </Text>
        </View>
      )}
    </View>
  );
}
```

**Deliverables:**
- [ ] Workout library with search
- [ ] Add workout (manual, OCR, Instagram)
- [ ] Stats and PRs display
- [ ] Workout session with timer

### Phase 5: Polish & Launch (2 weeks)

**Tasks:**
1. Offline sync with MMKV
2. Error handling and retry logic
3. Loading states and skeletons
4. Image optimization
5. Unit and E2E tests
6. Play Store submission

**Code: Offline Cache (lib/offline-cache.ts)**
```typescript
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

export const offlineCache = {
  set(key: string, value: any) {
    storage.set(key, JSON.stringify(value));
  },

  get(key: string) {
    const value = storage.getString(key);
    return value ? JSON.parse(value) : null;
  },

  delete(key: string) {
    storage.delete(key);
  },
};

// Use in React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

**Deliverables:**
- [ ] Offline mode working
- [ ] All error states handled
- [ ] Tests passing
- [ ] APK/AAB built
- [ ] Play Store internal track deployed

---

## Code Examples

### Complete API Integration

**Workouts Repository (repositories/workouts.ts):**
```typescript
import { apiClient } from '@/lib/api-client';
import { Workout } from '@kinex-fit/shared';

export const workoutsRepository = {
  getAll: () =>
    apiClient.get<{ workouts: Workout[] }>('/api/workouts'),

  getById: (id: string) =>
    apiClient.get<{ workout: Workout }>(`/api/workouts/${id}`),

  create: (workout: Partial<Workout>) =>
    apiClient.post<{ workout: Workout }>('/api/workouts', workout),

  update: (id: string, workout: Partial<Workout>) =>
    apiClient.patch<{ workout: Workout }>(`/api/workouts/${id}`, workout),

  delete: (id: string) =>
    apiClient.delete(`/api/workouts/${id}`),

  complete: (id: string, data: {
    completedDate: string;
    completedAt: string;
    durationSeconds: number;
  }) =>
    apiClient.post(`/api/workouts/${id}/complete`, data),

  schedule: (id: string, date: string) =>
    apiClient.post(`/api/workouts/${id}/schedule`, { date }),
};
```

### Camera OCR Integration

**OCR Screen (app/(tabs)/add/ocr.tsx):**
```typescript
import { View, Button, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function OCRScreen() {
  const [image, setImage] = useState<string | null>(null);

  const ocrMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'workout.jpg',
      } as any);

      const response = await fetch(
        'https://kinexfit.com/api/ocr',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getToken()}`,
          },
          body: formData,
        }
      );

      return response.json();
    },
    onSuccess: (data) => {
      // Navigate to workout form with parsed data
      router.push({
        pathname: '/add/manual',
        params: { parsedWorkout: JSON.stringify(data.parsedWorkout) },
      });
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      ocrMutation.mutate(result.assets[0].uri);
    }
  };

  return (
    <View className="flex-1 p-4 bg-background">
      <Button title="Take Photo" onPress={pickImage} />
      {image && (
        <Image
          source={{ uri: image }}
          className="w-full h-64 mt-4 rounded-lg"
        />
      )}
      {ocrMutation.isPending && <Text>Processing...</Text>}
    </View>
  );
}
```

### Subscription Display

**Subscription Screen (app/(tabs)/profile/subscription.tsx):**
```typescript
import { View, Text, Button, Linking } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { SUBSCRIPTION_TIERS } from '@kinex-fit/shared';

export default function SubscriptionScreen() {
  const { data } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => apiClient.get('/api/stripe/subscription'),
  });

  const checkoutMutation = useMutation({
    mutationFn: (tier: string) =>
      apiClient.post('/api/stripe/checkout', {
        tier,
        returnUrl: 'spotbuddy://subscription/success',
      }),
    onSuccess: (response) => {
      Linking.openURL(response.checkoutUrl);
    },
  });

  return (
    <View className="flex-1 p-4 bg-background">
      <Text className="text-2xl font-bold text-foreground mb-4">
        Current Plan: {data?.tier}
      </Text>

      <View className="bg-card p-4 rounded-lg mb-4">
        <Text className="text-foreground">
          Workouts this week: {data?.quotas.workoutsThisWeek}
        </Text>
        <Text className="text-foreground">
          OCR scans: {data?.quotas.ocrUsed} / {data?.quotas.ocrLimit}
        </Text>
        <Text className="text-foreground">
          AI requests: {data?.quotas.aiUsed} / {data?.quotas.aiLimit}
        </Text>
      </View>

      {data?.tier === 'free' && (
        <>
          <Text className="text-xl font-bold text-foreground mb-4">
            Upgrade Your Plan
          </Text>

          {['core', 'pro', 'elite'].map((tier) => (
            <View key={tier} className="bg-card p-4 rounded-lg mb-3">
              <Text className="text-lg font-bold text-foreground">
                {SUBSCRIPTION_TIERS[tier].name}
              </Text>
              <Text className="text-2xl text-primary">
                ${SUBSCRIPTION_TIERS[tier].price}/month
              </Text>
              <Button
                title={`Upgrade to ${tier}`}
                onPress={() => checkoutMutation.mutate(tier)}
              />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
```

---

## Testing & Deployment

### Testing Strategy

**Unit Tests (Jest + React Native Testing Library):**
```typescript
// __tests__/parsers/workout-parser.test.ts
import { parseWorkoutText } from '@kinex-fit/shared';

describe('parseWorkoutText', () => {
  it('should parse basic workout format', () => {
    const text = `
      Bench Press 3x8 @ 185lbs
      Squat 5x5 @ 225lbs
    `;

    const result = parseWorkoutText(text);

    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].name).toBe('Bench Press');
    expect(result.exercises[0].sets).toBe(3);
    expect(result.exercises[0].reps).toBe(8);
    expect(result.exercises[0].weight).toBe(185);
  });
});
```

**Component Tests:**
```typescript
// __tests__/components/WorkoutCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { WorkoutCard } from '@/components/WorkoutCard';

describe('WorkoutCard', () => {
  it('should display workout title', () => {
    const workout = {
      workoutId: '1',
      title: 'Leg Day',
      exercises: [],
    };

    const { getByText } = render(<WorkoutCard workout={workout} />);
    expect(getByText('Leg Day')).toBeTruthy();
  });

  it('should navigate on press', () => {
    const workout = { workoutId: '1', title: 'Test', exercises: [] };
    const { getByText } = render(<WorkoutCard workout={workout} />);

    fireEvent.press(getByText('Test'));
    // Assert navigation
  });
});
```

**E2E Tests (Detox):**
```typescript
// e2e/workouts.e2e.ts
describe('Workout Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should create a workout', async () => {
    await element(by.id('add-tab')).tap();
    await element(by.id('workout-title')).typeText('Test Workout');
    await element(by.id('add-exercise-btn')).tap();
    await element(by.id('exercise-name')).typeText('Squat');
    await element(by.id('save-btn')).tap();

    await expect(element(by.text('Test Workout'))).toBeVisible();
  });
});
```

### Build & Deploy

**Build APK/AAB:**
```bash
# Development build
npx expo run:android

# Production build (AAB for Play Store)
eas build --platform android --profile production

# Production build (APK for direct install)
eas build --platform android --profile production --type apk
```

**EAS Configuration (eas.json):**
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

**Google Play Release Checklist:**
- [ ] Create app listing with screenshots
- [ ] Add privacy policy URL
- [ ] Complete content rating questionnaire
- [ ] Set pricing & distribution (free with IAP)
- [ ] Configure app signing
- [ ] Upload AAB to internal track
- [ ] Test with internal testers
- [ ] Promote to closed beta
- [ ] Gather feedback and iterate
- [ ] Promote to production

---

## Timeline Summary

**Phase 1: Backend Prep** (1 week)
- Create Cognito mobile client
- Add bearer token middleware
- Extract shared package

**Phase 2: Android Setup** (1 week)
- Bootstrap Expo app
- Configure navigation & theme
- Set up API client

**Phase 3: Authentication** (1 week)
- Implement Cognito PKCE
- Token management
- Auto-refresh logic

**Phase 4: Core Features** (4 weeks)
- Week 1: Workouts library
- Week 2: Add workout flows
- Week 3: Stats & PRs
- Week 4: Workout session

**Phase 5: Polish & Launch** (2 weeks)
- Offline sync
- Error handling
- Testing
- Play Store deployment

**Total: 9 weeks** (with 1 developer)

---

## Key Advantages

### What You DON'T Need to Build

❌ Backend APIs (20+ endpoints already deployed)
❌ Workout parsing logic (smartWorkoutParser.ts)
❌ PR calculations (7 1RM formulas in pr-calculator.ts)
❌ Instagram parsing (igParser.ts)
❌ Exercise database (100+ exercises)
❌ Training profile schema (training-profile.ts)
❌ Subscription logic (feature-gating.tsx)
❌ Body metrics calculations (body-metrics.ts)
❌ DynamoDB operations (all CRUD exists)
❌ OCR processing (Textract integration ready)
❌ S3 uploads (presigned URLs working)
❌ AI integration (Bedrock endpoints ready)

### What You DO Need to Build

✅ React Native UI components
✅ Navigation flows
✅ OAuth PKCE flow
✅ API client with token injection
✅ Offline sync with MMKV
✅ Camera & image handling
✅ Platform-specific UX

### Effort Savings

- **Backend**: 95% done (just token auth middleware)
- **Business Logic**: 80% reusable (shared package)
- **Data Models**: 100% defined (TypeScript interfaces)
- **Auth Infrastructure**: 90% done (just PKCE client)

**Estimated Effort**: 150-180 hours (9 weeks)
**Without Reuse**: 400-500 hours (25+ weeks)
**Savings**: ~60% reduction in development time

---

## Next Steps

1. **Week 1**: Set up Cognito mobile client and bearer token middleware
2. **Week 2**: Bootstrap Expo app with navigation and API client
3. **Week 3**: Implement authentication flow
4. **Weeks 4-7**: Build core features (workouts, stats, session)
5. **Weeks 8-9**: Polish, test, and deploy to Play Store

**Ready to build!** 🚀
