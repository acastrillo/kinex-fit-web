# Kinex Fit - Database Architecture & Schema

**Last Updated:** January 2025
**Database:** DynamoDB (primary) + SQLite (NextAuth sessions)
**Purpose:** Complete database design documentation for developers

---

## Table of Contents

1. [Overview](#overview)
2. [Database Strategy](#database-strategy)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [DynamoDB Tables](#dynamodb-tables)
5. [SQLite Schema (Prisma)](#sqlite-schema-prisma)
6. [Data Models (TypeScript)](#data-models-typescript)
7. [Access Patterns](#access-patterns)
8. [Indexing Strategy](#indexing-strategy)
9. [Data Consistency](#data-consistency)
10. [Migration Strategy](#migration-strategy)

---

## Overview

Kinex Fit uses a **dual-database approach**:

1. **DynamoDB** - Primary application data (users, workouts, completions)
2. **SQLite with Prisma** - NextAuth.js session management

This hybrid approach combines DynamoDB's scalability for application data with Prisma's relational model for authentication sessions (required by NextAuth.js).

### Key Statistics

- **Tables:** 4 DynamoDB tables + 4 Prisma tables
- **Total Records (estimated):**
  - Users: ~1,000
  - Workouts: ~50,000
  - Completions: ~100,000
  - Sessions: ~500 active
- **Billing Mode:** On-Demand (pay-per-request)
- **Backup Strategy:** DynamoDB Point-in-Time Recovery (enabled)

---

## Database Strategy

### Why DynamoDB?

**Advantages:**
- ✅ **Infinite Scalability** - Auto-scales to millions of requests
- ✅ **Flexible Schema** - JSON documents fit workout structure perfectly
- ✅ **Single-Digit Latency** - <10ms reads/writes at any scale
- ✅ **No Maintenance** - Fully managed, no servers to patch
- ✅ **Cost-Effective at Scale** - On-demand billing (no idle costs)

**Disadvantages:**
- ❌ **No SQL Joins** - Must denormalize data
- ❌ **Limited Querying** - Can only query by partition key + sort key
- ❌ **No Complex Analytics** - Would need separate data warehouse for BI

### When to Use DynamoDB vs SQL

| Use DynamoDB When | Use SQL When |
|-------------------|--------------|
| Document-shaped data (workouts) | Complex joins needed |
| Known access patterns | Ad-hoc queries needed |
| Horizontal scaling required | Transactions across tables |
| Key-value lookups | Aggregations & analytics |
| High write throughput | Strong consistency guarantees |

For Kinex Fit, workouts are naturally document-shaped, and our access patterns are predictable (fetch by user, fetch by date), making DynamoDB ideal.

---

## Entity Relationship Diagram

![Database Schema ERD](diagrams/db_schema_erd.png)

### Relationship Summary

```
User (1) ──────────── (N) Workout
  │
  └──────────────────── (N) WorkoutCompletion
                          ▲
Workout (1) ────────────(N) WorkoutCompletion

User (1) ──────────── (1) NextAuth Session (SQLite)
```

---

## DynamoDB Tables

### Table 1: `spotter-users`

**Purpose:** Store user profiles, subscription info, and usage quotas

**Primary Key:**
- **Partition Key:** `id` (String) - UUID
- **Sort Key:** None

**Global Secondary Indexes:**
1. **email-index**
   - Partition Key: `email` (String)
   - Use Case: Login, uniqueness check

2. **stripeCustomerId-index**
   - Partition Key: `stripeCustomerId` (String)
   - Use Case: Stripe webhook processing

**Attributes:**

```typescript
interface User {
  // Identity
  id: string;                          // UUID (PK)
  email: string;                       // Unique email (GSI)
  firstName?: string;
  lastName?: string;
  passwordHash?: string;               // bcrypt hash (credentials auth only)
  image?: string;                      // Profile image URL

  // Subscription
  subscriptionTier: 'free' | 'core' | 'pro' | 'elite';
  subscriptionStatus: 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due';
  subscriptionStartDate?: string;      // ISO 8601
  subscriptionEndDate?: string;        // ISO 8601
  trialEndsAt?: string;                // ISO 8601
  stripeCustomerId?: string;           // Stripe customer ID (GSI)
  stripeSubscriptionId?: string;       // Stripe subscription ID

  // Usage Quotas (monthly, combined scans)
  scanQuotaUsed?: number;              // OCR + Instagram scans used this month
  scanQuotaResetDate?: string;         // ISO 8601 (month boundary, UTC)
  ocrQuotaUsed?: number;               // OCR scans used (per-source analytics)
  instagramImportsUsed?: number;       // Instagram scans used (per-source analytics)
  workoutsSaved: number;               // Total workouts created
  aiRequestsUsed?: number;             // AI requests this month
  aiRequestsLimit?: number;            // Tier-based limit
  // Legacy (kept for backwards compatibility; not enforced)
  ocrQuotaLimit?: number;
  instagramImportsLimit?: number;

  // AI Cost Tracking
  currentMonthCost?: number;           // USD spent this month
  totalCost?: number;                  // USD spent all-time
  currentMonthTokens?: number;         // Tokens used this month
  totalTokens?: number;                // Tokens used all-time
  lastCostReset?: string;              // ISO 8601 (first of month)

  // Training Profile
  trainingProfile?: {
    personalRecords: Record<string, {  // Exercise name → PR
      weight: number;
      unit: 'lbs' | 'kg';
      date: string;                    // ISO 8601
    }>;
    experience: 'beginner' | 'intermediate' | 'advanced';
    preferredSplit?: string;           // e.g., "Upper/Lower", "PPL"
    trainingDays: number;              // Days per week
    equipment: string[];               // Available equipment
    goals: string[];                   // e.g., "strength", "hypertrophy"
    constraints?: Array<{              // Injuries, time limits
      type: 'injury' | 'time' | 'equipment';
      description: string;
    }>;
  };

  // Onboarding
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;      // ISO 8601

  // Metadata
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}
```

**Example Record:**

```json
{
  "id": "user-550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "image": "https://kinexfit.com/avatars/john.jpg",
  "subscriptionTier": "pro",
  "subscriptionStatus": "active",
  "subscriptionStartDate": "2025-01-01T00:00:00Z",
  "stripeCustomerId": "cus_123456789",
  "stripeSubscriptionId": "sub_987654321",
  "scanQuotaUsed": 17,
  "scanQuotaResetDate": "2025-01-01T00:00:00Z",
  "ocrQuotaUsed": 6,
  "instagramImportsUsed": 11,
  "workoutsSaved": 127,
  "aiRequestsUsed": 12,
  "aiRequestsLimit": 30,
  "currentMonthCost": 0.45,
  "totalCost": 2.34,
  "currentMonthTokens": 25000,
  "totalTokens": 150000,
  "trainingProfile": {
    "personalRecords": {
      "Back Squat": { "weight": 315, "unit": "lbs", "date": "2024-12-15T00:00:00Z" },
      "Bench Press": { "weight": 225, "unit": "lbs", "date": "2024-12-20T00:00:00Z" }
    },
    "experience": "intermediate",
    "trainingDays": 4,
    "equipment": ["barbell", "dumbbells", "rack", "bench"],
    "goals": ["strength", "hypertrophy"],
    "constraints": [
      { "type": "injury", "description": "Left shoulder impingement - avoid overhead pressing" }
    ]
  },
  "onboardingCompleted": true,
  "onboardingCompletedAt": "2025-01-01T10:30:00Z",
  "createdAt": "2025-01-01T09:00:00Z",
  "updatedAt": "2025-01-09T14:22:33Z"
}
```

---

### Table 2: `spotter-workouts`

**Purpose:** Store workout documents with exercises, sets, reps, etc.

**Primary Key:**
- **Partition Key:** `userId` (String) - Groups all workouts by user
- **Sort Key:** `id` (String) - Workout UUID

**Global Secondary Indexes:**
1. **userId-createdAt-index**
   - Partition Key: `userId`
   - Sort Key: `createdAt` (String)
   - Use Case: Fetch workouts sorted by date

**Attributes:**

```typescript
interface Workout {
  // Identity
  id: string;                          // UUID (SK)
  userId: string;                      // User UUID (PK)

  // Metadata
  title: string;
  description?: string;
  source: 'manual' | 'ai' | 'instagram' | 'import';
  duration?: number;                   // Minutes (estimated)
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];                     // e.g., ["legs", "strength", "hypertrophy"]
  notes?: string;                      // User notes

  // Exercises
  exercises: Array<{
    id: string;                        // UUID
    name: string;                      // Exercise name
    sets: number;
    reps: number | string;             // Can be "8-12" or "AMRAP"
    weight?: string;                   // e.g., "225lbs", "70% 1RM"
    distance?: string;                 // For cardio: "5 miles"
    timing?: string;                   // For EMOM: "EMOM 10:00"
    restSeconds?: number;              // Rest between sets
    notes?: string;                    // Exercise-specific notes
    equipment?: string[];              // Required equipment
  }>;

  // Scheduling
  scheduledFor?: string;               // ISO 8601 date
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;                  // Every N days/weeks/months
    daysOfWeek?: number[];            // 0-6 (Sunday-Saturday)
  };

  // Completion
  isCompleted: boolean;
  completedAt?: string;                // ISO 8601
  actualDuration?: number;             // Minutes (actual)

  // AI Metadata (if AI-generated)
  aiModel?: string;                    // e.g., "claude-sonnet-4.5"
  aiPrompt?: string;                   // Original user prompt
  aiTokensUsed?: number;
  aiCost?: number;                     // USD

  // Metadata
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}
```

**Example Record:**

```json
{
  "id": "workout-123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-550e8400-e29b-41d4-a716-446655440000",
  "title": "Leg Day - Squat Focus",
  "description": "Heavy squat emphasis with accessory work",
  "source": "ai",
  "duration": 60,
  "difficulty": "intermediate",
  "tags": ["legs", "strength", "compound"],
  "exercises": [
    {
      "id": "exercise-1",
      "name": "Back Squat",
      "sets": 5,
      "reps": 5,
      "weight": "275lbs (87% 1RM)",
      "restSeconds": 180,
      "notes": "Focus on depth and bar speed",
      "equipment": ["barbell", "rack"]
    },
    {
      "id": "exercise-2",
      "name": "Romanian Deadlift",
      "sets": 3,
      "reps": 8,
      "weight": "225lbs",
      "restSeconds": 120,
      "equipment": ["barbell"]
    },
    {
      "id": "exercise-3",
      "name": "Bulgarian Split Squat",
      "sets": 3,
      "reps": "10 each leg",
      "weight": "50lb dumbbells",
      "restSeconds": 90,
      "equipment": ["dumbbells", "bench"]
    }
  ],
  "scheduledFor": "2025-01-10T10:00:00Z",
  "isCompleted": false,
  "aiModel": "claude-sonnet-4.5",
  "aiPrompt": "Give me a leg day workout with squats",
  "aiTokensUsed": 1350,
  "aiCost": 0.0135,
  "createdAt": "2025-01-09T14:30:00Z",
  "updatedAt": "2025-01-09T14:30:00Z"
}
```

---

### Table 3: `spotter-workout-completions`

**Purpose:** Track workout completion history for analytics and progress tracking

**Primary Key:**
- **Partition Key:** `userId` (String)
- **Sort Key:** `completedAt` (String) - ISO 8601 timestamp

**Attributes:**

```typescript
interface WorkoutCompletion {
  // Identity
  id: string;                          // UUID
  userId: string;                      // User UUID (PK)
  workoutId: string;                   // Reference to workout

  // Completion Details
  completedAt: string;                 // ISO 8601 (SK)
  duration: number;                    // Actual duration in minutes
  difficulty: 'easy' | 'moderate' | 'hard';  // Perceived difficulty
  notes?: string;                      // Post-workout notes

  // Performance Metrics
  exercisesCompleted: Array<{
    exerciseId: string;
    name: string;
    setsCompleted: number;
    actualWeight?: string;
    actualReps?: number[];             // Reps per set
    personalRecord?: boolean;          // New PR?
  }>;

  // Subjective Metrics
  energyLevel?: 1 | 2 | 3 | 4 | 5;   // 1=low, 5=high
  enjoyment?: 1 | 2 | 3 | 4 | 5;     // 1=hated it, 5=loved it

  // Metadata
  createdAt: string;                   // ISO 8601
}
```

**Example Record:**

```json
{
  "id": "completion-789e4567-e89b-12d3-a456-426614174000",
  "userId": "user-550e8400-e29b-41d4-a716-446655440000",
  "workoutId": "workout-123e4567-e89b-12d3-a456-426614174000",
  "completedAt": "2025-01-10T11:30:00Z",
  "duration": 65,
  "difficulty": "moderate",
  "notes": "Felt strong today. Hit all prescribed weights.",
  "exercisesCompleted": [
    {
      "exerciseId": "exercise-1",
      "name": "Back Squat",
      "setsCompleted": 5,
      "actualWeight": "275lbs",
      "actualReps": [5, 5, 5, 5, 5],
      "personalRecord": false
    },
    {
      "exerciseId": "exercise-2",
      "name": "Romanian Deadlift",
      "setsCompleted": 3,
      "actualWeight": "225lbs",
      "actualReps": [8, 8, 7],
      "personalRecord": false
    }
  ],
  "energyLevel": 4,
  "enjoyment": 5,
  "createdAt": "2025-01-10T11:30:00Z"
}
```

---

### Table 4: `spotter-webhook-events`

**Purpose:** Idempotency tracking for Stripe webhooks (prevent duplicate processing)

**Primary Key:**
- **Partition Key:** `eventId` (String) - Stripe event ID

**TTL:** 7 days (auto-delete old events)

**Attributes:**

```typescript
interface WebhookEvent {
  eventId: string;                     // Stripe event ID (PK)
  eventType: string;                   // e.g., "customer.subscription.updated"
  processedAt: string;                 // ISO 8601
  userId?: string;                     // User affected (if applicable)
  data?: Record<string, any>;          // Event payload (for debugging)
  ttl: number;                         // Unix timestamp (7 days from now)
}
```

**Example Record:**

```json
{
  "eventId": "evt_1234567890abcdef",
  "eventType": "customer.subscription.updated",
  "processedAt": "2025-01-09T14:45:00Z",
  "userId": "user-550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "subscriptionId": "sub_987654321",
    "status": "active",
    "planId": "price_pro_monthly"
  },
  "ttl": 1736514300
}
```

---

## SQLite Schema (Prisma)

NextAuth.js requires a relational database for session management. We use SQLite with Prisma.

### Prisma Schema

**File:** `prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?
  access_token       String?
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### Key Points

- **Users Table:** Synced with DynamoDB `spotter-users` (same `id` field)
- **Sessions:** JWT tokens stored here (short-lived, 30 days max)
- **Accounts:** OAuth account links (Google, Facebook, Apple)
- **VerificationToken:** Email verification tokens

---

## Data Models (TypeScript)

**Location:** `src/types/`

### Shared Types

```typescript
// src/types/user.ts
export type SubscriptionTier = 'free' | 'core' | 'pro' | 'elite';
export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PersonalRecord {
  weight: number;
  unit: 'lbs' | 'kg';
  date: string;
}

export interface TrainingConstraint {
  type: 'injury' | 'time' | 'equipment';
  description: string;
}

export interface TrainingProfile {
  personalRecords: Record<string, PersonalRecord>;
  experience: ExperienceLevel;
  preferredSplit?: string;
  trainingDays: number;
  equipment: string[];
  goals: string[];
  constraints?: TrainingConstraint[];
}
```

```typescript
// src/types/workout.ts
export type WorkoutSource = 'manual' | 'ai' | 'instagram' | 'import';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number | string;
  weight?: string;
  distance?: string;
  timing?: string;
  restSeconds?: number;
  notes?: string;
  equipment?: string[];
}

export interface Workout {
  id: string;
  userId: string;
  title: string;
  description?: string;
  source: WorkoutSource;
  duration?: number;
  difficulty?: Difficulty;
  tags?: string[];
  exercises: Exercise[];
  scheduledFor?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Access Patterns

### Common Queries

| Query | DynamoDB Operation | Complexity |
|-------|-------------------|------------|
| Get user by ID | `GetItem(id)` | O(1) |
| Get user by email | `Query(email-index)` | O(1) |
| Get user by Stripe ID | `Query(stripeCustomerId-index)` | O(1) |
| Get all workouts for user | `Query(userId)` | O(n) |
| Get workouts by date range | `Query(userId-createdAt-index, between)` | O(n) |
| Get workout by ID | `GetItem(userId, id)` | O(1) |
| Get completions for user | `Query(userId, sort by completedAt)` | O(n) |
| Check webhook processed | `GetItem(eventId)` | O(1) |

### Example: Fetch Workouts by Date Range

```typescript
// lib/database/dynamodb.ts
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export async function getWorkoutsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Workout[]> {
  const command = new QueryCommand({
    TableName: "spotter-workouts",
    IndexName: "userId-createdAt-index",
    KeyConditionExpression: "userId = :userId AND createdAt BETWEEN :start AND :end",
    ExpressionAttributeValues: {
      ":userId": { S: userId },
      ":start": { S: startDate },
      ":end": { S: endDate }
    }
  });

  const response = await dynamoClient.send(command);
  return response.Items?.map(item => unmarshall(item) as Workout) || [];
}
```

---

## Indexing Strategy

### Primary Keys vs GSI

**Primary Key:** Use for direct lookups when you have the full key
**GSI:** Use for alternate access patterns (query by email, date, etc.)

### GSI Cost Considerations

- GSIs double your storage cost (data is duplicated)
- GSIs consume read/write capacity units
- Only index fields you'll actually query on

**Kinex Fit GSIs:**
1. ✅ `email-index` - Essential (login flow)
2. ✅ `stripeCustomerId-index` - Essential (webhook processing)
3. ✅ `userId-createdAt-index` - Essential (date-sorted queries)

---

## Data Consistency

### DynamoDB Consistency Models

**Eventually Consistent Reads (default):**
- Faster and cheaper
- Used for non-critical reads (e.g., fetching workout list)

**Strongly Consistent Reads:**
- Guaranteed latest data
- Used for critical reads (e.g., checking webhook idempotency)

```typescript
// Strongly consistent read
const command = new GetItemCommand({
  TableName: "spotter-webhook-events",
  Key: { eventId: { S: "evt_123" } },
  ConsistentRead: true  // Ensure we see latest write
});
```

### Handling Race Conditions

**Problem:** Two users simultaneously save a workout

**Solution:** Optimistic locking with conditional writes

```typescript
const command = new PutItemCommand({
  TableName: "spotter-workouts",
  Item: workoutItem,
  ConditionExpression: "attribute_not_exists(id)",  // Fail if already exists
});

try {
  await dynamoClient.send(command);
} catch (error) {
  if (error.name === "ConditionalCheckFailedException") {
    // Workout already exists, handle duplicate
  }
}
```

---

## Migration Strategy

### Adding New Fields

**Safe:**
```typescript
// Old schema
interface User {
  id: string;
  email: string;
}

// New schema (backward compatible)
interface User {
  id: string;
  email: string;
  phoneNumber?: string;  // Optional field
}
```

**Unsafe (requires migration):**
```typescript
// Changing required field
interface User {
  id: string;
  email: string;
  phoneNumber: string;  // Now required!
}
```

### Data Migration Process

1. **Add optional field** to schema
2. **Deploy code** that writes new field
3. **Backfill old records** (script to add default value)
4. **Make field required** after 100% backfill
5. **Deploy code** that depends on field existing

**Example Backfill Script:**

```typescript
// scripts/backfill-phone-numbers.ts
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

async function backfillPhoneNumbers() {
  const scanCommand = new ScanCommand({ TableName: "spotter-users" });
  const response = await dynamoClient.send(scanCommand);

  for (const item of response.Items || []) {
    if (!item.phoneNumber) {
      const updateCommand = new UpdateItemCommand({
        TableName: "spotter-users",
        Key: { id: item.id },
        UpdateExpression: "SET phoneNumber = :phone",
        ExpressionAttributeValues: {
          ":phone": { S: "000-000-0000" }  // Default placeholder
        }
      });
      await dynamoClient.send(updateCommand);
    }
  }
}
```

---

## Best Practices

### 1. Always Use Partition Keys Efficiently

❌ **Bad:**
```typescript
// Scanning entire table (expensive!)
const command = new ScanCommand({ TableName: "spotter-workouts" });
```

✅ **Good:**
```typescript
// Query by partition key (fast!)
const command = new QueryCommand({
  TableName: "spotter-workouts",
  KeyConditionExpression: "userId = :userId",
  ExpressionAttributeValues: { ":userId": { S: userId } }
});
```

### 2. Denormalize Data When Needed

❌ **Bad (requires extra query):**
```json
{
  "workoutId": "workout-123",
  "userId": "user-456"
}
// Must query users table to get subscription tier
```

✅ **Good (denormalized):**
```json
{
  "workoutId": "workout-123",
  "userId": "user-456",
  "userSubscriptionTier": "pro"
}
// Tier available immediately
```

### 3. Use TTL for Auto-Cleanup

```typescript
// Set TTL 7 days from now
const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

const command = new PutItemCommand({
  TableName: "spotter-webhook-events",
  Item: {
    eventId: { S: "evt_123" },
    ttl: { N: ttl.toString() }
  }
});
```

### 4. Handle Throttling Gracefully

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient({
  region: "us-east-1",
  maxAttempts: 3,  // Retry up to 3 times
  retryMode: "adaptive"  // Exponential backoff
});
```

---

## Monitoring & Troubleshooting

### Key CloudWatch Metrics

1. **ConsumedReadCapacityUnits** - Read throughput
2. **ConsumedWriteCapacityUnits** - Write throughput
3. **ThrottledRequests** - Rate limit exceeded
4. **UserErrors** - Client-side errors (bad queries)
5. **SystemErrors** - DynamoDB service errors

### Common Issues

**Issue:** `ProvisionedThroughputExceededException`
- **Cause:** Too many requests per second
- **Solution:** Switch to on-demand billing or increase provisioned capacity

**Issue:** `ConditionalCheckFailedException`
- **Cause:** Conditional write failed (expected state doesn't match)
- **Solution:** Retry with updated state or handle conflict

**Issue:** Slow queries
- **Cause:** Scanning instead of querying
- **Solution:** Use Query with partition key, not Scan

---

## Next Steps

- Read [API-REFERENCE.md](API-REFERENCE.md) for API endpoints that use these tables
- Read [AUTHENTICATION.md](AUTHENTICATION.md) for NextAuth + Prisma integration
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for overall system design

---

**Last Updated:** January 2025
**Maintained By:** Development Team
