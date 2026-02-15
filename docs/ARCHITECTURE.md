# Kinex Fit - System Architecture

**Last Updated:** January 2025
**Status:** Production (Phase 6 Complete)
**Purpose:** Comprehensive technical architecture documentation for developers and engineers

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Data Flow & Request Lifecycle](#data-flow--request-lifecycle)
5. [Deployment Architecture](#deployment-architecture)
6. [Key Design Decisions](#key-design-decisions)
7. [Scalability & Performance](#scalability--performance)
8. [Security Architecture](#security-architecture)
9. [Integration Points](#integration-points)
10. [Error Handling & Resilience](#error-handling--resilience)

---

## High-Level Overview

Kinex Fit is a **full-stack TypeScript application** built as a monolithic Next.js 15 application deployed on AWS ECS Fargate. The architecture follows a **three-tier pattern** with clear separation of concerns:

1. **Presentation Layer** - Next.js 15 with React 19 (SSR + Client Components)
2. **API Layer** - Next.js API Routes (RESTful endpoints)
3. **Data Layer** - DynamoDB (primary) + SQLite/Prisma (auth sessions)

### Core Principles

- **Monorepo Architecture** - Single codebase for frontend and backend
- **TypeScript-First** - End-to-end type safety
- **Serverless-Ready** - Designed for horizontal scaling
- **API-Driven** - Clear separation between client and server
- **Security by Default** - Multiple layers of defense

---

## System Architecture

### System Architecture Diagram

![Kinex Fit System Architecture](diagrams/kinexfit_system_architecture.png)

*This diagram shows the high-level components and their relationships.*

### Architecture Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Users (Browser/Mobile)                       │
│                                                                       │
│  React 19 Components + Tailwind CSS + shadcn UI                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS (TLS 1.2+)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AWS Application Load Balancer                     │
│                         (kinexfit.com)                               │
│                                                                       │
│  - HTTPS Termination (SSL/TLS)                                      │
│  - Health Checks (GET /api/health)                                  │
│  - Request Routing                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  ECS Fargate Container (Docker)                      │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Next.js 15 Application                           │  │
│  │                                                               │  │
│  │  ┌────────────────────┐  ┌─────────────────────────────┐   │  │
│  │  │  App Router (SSR)  │  │  API Routes (REST)          │   │  │
│  │  │                    │  │                             │   │  │
│  │  │  - Pages           │  │  - /api/auth/*              │   │  │
│  │  │  - Layouts         │  │  - /api/workouts/*          │   │  │
│  │  │  - Components      │  │  - /api/ai/*                │   │  │
│  │  │  - Server Actions  │  │  - /api/stripe/*            │   │  │
│  │  └────────────────────┘  └─────────────────────────────┘   │  │
│  │                                                               │  │
│  │  Middleware: Security Headers, Cache Control, Auth Check     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Runtime: Node.js 20 Alpine (Standalone Build)                      │
│  Resources: 1 vCPU, 2GB RAM                                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ (Multiple connections)
                                ▼
        ┌───────────────────────┴────────────────────────┐
        │                       │                         │
        ▼                       ▼                         ▼
┌──────────────┐      ┌──────────────┐         ┌──────────────┐
│  DynamoDB    │      │  AWS Bedrock │         │     S3       │
│              │      │              │         │              │
│ - Users      │      │ Claude Opus  │         │ - Images     │
│ - Workouts   │      │ Claude Sonnet│         │ - Uploads    │
│ - Completions│      │ Claude Haiku │         │              │
│ - Webhooks   │      │              │         │              │
└──────────────┘      └──────────────┘         └──────────────┘
        │                       │                         │
        └───────────────────────┴────────────────────────┘
                                │
        ┌───────────────────────┴────────────────────────┐
        │                       │                         │
        ▼                       ▼                         ▼
┌──────────────┐      ┌──────────────┐         ┌──────────────┐
│  Textract    │      │ Upstash Redis│         │    Stripe    │
│              │      │              │         │              │
│ - OCR        │      │ - Rate Limit │         │ - Payments   │
│ - Document   │      │ - Distributed│         │ - Webhooks   │
│   Processing │      │   Counters   │         │ - Portal     │
└──────────────┘      └──────────────┘         └──────────────┘
        │                       │                         │
        └───────────────────────┴────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │  SQLite (Prisma)     │
                    │                      │
                    │  - NextAuth Sessions │
                    │  - Accounts          │
                    │  - Verification      │
                    └──────────────────────┘
```

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose | Why Chosen |
|-----------|---------|---------|------------|
| **Next.js** | 15.5.7 | React framework with SSR | App Router, API routes, type safety |
| **React** | 19.0.0 | UI library | React Server Components, concurrent mode |
| **TypeScript** | 5.7.3 | Type system | End-to-end type safety |
| **Tailwind CSS** | 3.4.17 | Styling | Utility-first, responsive design |
| **shadcn/ui** | Latest | Component library | Accessible, customizable, built on Radix UI |
| **React Hook Form** | 7.63.0 | Form management | Uncontrolled forms, performance |
| **Zod** | 3.25.76 | Schema validation | Type-safe validation shared with backend |
| **Zustand** | 5.0.8 | State management | Lightweight, simple API, React 18 compatible |
| **Recharts** | 3.2.1 | Data visualization | Charts for analytics, PR tracking |
| **@dnd-kit** | Latest | Drag and drop | Sortable exercise lists |
| **Lucide React** | 0.542.0 | Icons | Consistent icon set |

### Backend Stack

| Technology | Version | Purpose | Why Chosen |
|-----------|---------|---------|------------|
| **Next.js API Routes** | 15.5.7 | REST API | Collocated with frontend, shared types |
| **NextAuth.js** | 4.24.7 | Authentication | Multi-provider OAuth + credentials |
| **Prisma** | 6.3.1 | ORM (NextAuth only) | Type-safe database queries |
| **bcryptjs** | 2.4.3 | Password hashing | Secure password storage |
| **AWS SDK v3** | Latest | AWS service clients | DynamoDB, Bedrock, Textract, S3 |
| **Stripe SDK** | 19.1.0 | Payment processing | Subscriptions, webhooks |
| **Nodemailer** | 7.0.10 | Email sending | SMTP for transactional emails |
| **@upstash/ratelimit** | 2.0.6 | Rate limiting | Distributed rate limiting |

### Infrastructure Stack

| Technology | Purpose | Why Chosen |
|-----------|---------|------------|
| **AWS ECS Fargate** | Container orchestration | Serverless containers, auto-scaling |
| **Docker** | Containerization | Reproducible builds, portability |
| **AWS ALB** | Load balancing | HTTPS termination, health checks |
| **DynamoDB** | NoSQL database | Infinite scalability, flexible schema |
| **AWS Bedrock** | AI/ML (Claude models) | Cost-effective, AWS-native AI |
| **AWS Textract** | OCR | Document processing for Instagram imports |
| **AWS S3** | Object storage | Image uploads and static assets |
| **AWS CloudWatch** | Monitoring | Logs, metrics, alarms |
| **AWS SSM Parameter Store** | Secret management | Secure configuration storage |
| **Upstash Redis** | Distributed cache | Serverless Redis for rate limiting |

### Development & Tooling

| Technology | Purpose |
|-----------|---------|
| **ESLint** | Code linting |
| **Playwright** | E2E testing |
| **Git** | Version control |
| **GitHub** | Code hosting (private repo) |
| **VSCode** | Primary IDE |

---

## Data Flow & Request Lifecycle

### AI Workout Generation Flow

![AI Workout Generation Flow](diagrams/ai_workout_generation_flow.png)

*This diagram shows the complete lifecycle of an AI workout generation request.*

### Detailed Request Flow: Generate AI Workout

**Step-by-step breakdown:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                    │
│    User submits: "Give me a leg day workout with squats"        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND (React Component)                                    │
│    - WorkoutGenerationForm.tsx                                   │
│    - Validates input with Zod schema                             │
│    - Shows loading state                                         │
│    POST /api/ai/generate-workout                                 │
│    Body: { prompt: "...", preferences: {...} }                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. MIDDLEWARE (src/middleware.ts)                                │
│    - Add security headers (CSP, HSTS, X-Frame-Options)          │
│    - Add Cache-Control headers                                   │
│    - Log request (method, path, timestamp)                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. API ROUTE (src/app/api/ai/generate-workout/route.ts)         │
│    - Parse request body                                          │
│    - Validate with Zod schema (server-side validation)          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. AUTHENTICATION (lib/auth/api-auth.ts)                         │
│    - Extract JWT token from Authorization header                 │
│    - Verify signature with NextAuth.js secret                    │
│    - Extract user ID from token payload                          │
│    - Return 401 Unauthorized if invalid                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RATE LIMITING (lib/rate-limit.ts)                             │
│    - Check Upstash Redis for user's request count               │
│    - Sliding window: 30 requests per hour for AI endpoints      │
│    - Increment counter with TTL                                  │
│    - Return 429 Too Many Requests if exceeded                   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. AUTHORIZATION (lib/rbac.ts)                                   │
│    - Fetch user profile from DynamoDB                            │
│    - Check subscription tier (free/core/pro/elite)              │
│    - Check AI quota used vs. limit                              │
│    - Return 403 Forbidden if quota exceeded                     │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. FETCH USER CONTEXT (lib/database/dynamodb.ts)                │
│    - Get user training profile from DynamoDB                     │
│    - Extract:                                                    │
│      * Personal records (PRs) - e.g., squat 315lbs              │
│      * Equipment - e.g., barbell, dumbbells                     │
│      * Experience level - e.g., intermediate                    │
│      * Goals - e.g., strength, hypertrophy                      │
│      * Constraints - e.g., bad knees, time limits               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. BUILD AI PROMPT (lib/ai/workout-generator.ts)                │
│    - Construct system message:                                   │
│      "You are an expert strength coach..."                       │
│    - Add training profile (marked for caching):                  │
│      {                                                           │
│        "experience": "intermediate",                             │
│        "equipment": ["barbell", "dumbbells"],                   │
│        "PRs": { "squat": "315lbs" },                            │
│        "goals": ["strength", "hypertrophy"]                     │
│      }                                                           │
│    - Add user request:                                           │
│      "Give me a leg day workout with squats"                    │
│    - Specify output format (JSON schema)                        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. CALL AWS BEDROCK (lib/ai/bedrock-client.ts)                 │
│     - Model: Claude Sonnet 4.5 (default)                        │
│     - API: converse() with streaming disabled                   │
│     - Max tokens: 4096                                           │
│     - Temperature: 0.7 (balanced creativity)                    │
│     - Wait for complete response                                │
│     - Response structure:                                        │
│       {                                                          │
│         "title": "Leg Day - Squat Focus",                       │
│         "exercises": [                                           │
│           {                                                      │
│             "name": "Back Squat",                                │
│             "sets": 5,                                           │
│             "reps": 5,                                           │
│             "weight": "275lbs (87% of 1RM)",                    │
│             "restSeconds": 180,                                  │
│             "notes": "Focus on depth and bar speed"             │
│           },                                                     │
│           ...                                                    │
│         ]                                                        │
│       }                                                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. TRACK AI USAGE (lib/ai/usage-tracking.ts)                   │
│     - Calculate tokens used:                                     │
│       * Input tokens: ~500                                       │
│       * Output tokens: ~800                                      │
│       * Cached tokens (if repeat user): ~400                    │
│     - Calculate cost:                                            │
│       * Sonnet: $3 per 1M input, $15 per 1M output             │
│       * Cost: $0.0135 for this request                          │
│     - Update user record in DynamoDB:                            │
│       * aiRequestsUsed: increment by 1                          │
│       * currentMonthTokens: add 1300 tokens                     │
│       * currentMonthCost: add $0.0135                           │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. SAVE WORKOUT (lib/database/dynamodb.ts)                     │
│     - Generate workout ID: uuid()                                │
│     - Create workout document:                                   │
│       {                                                          │
│         "id": "workout-abc123",                                  │
│         "userId": "user-xyz789",                                 │
│         "title": "Leg Day - Squat Focus",                       │
│         "source": "ai",                                          │
│         "exercises": [...],                                      │
│         "createdAt": "2025-01-09T12:00:00Z"                     │
│       }                                                          │
│     - PutItem to DynamoDB spotter-workouts table                │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 13. RETURN RESPONSE                                              │
│     - HTTP 200 OK                                                │
│     - JSON body:                                                 │
│       {                                                          │
│         "success": true,                                         │
│         "workout": {...},                                        │
│         "tokensUsed": 1300,                                      │
│         "cost": 0.0135,                                          │
│         "quotaRemaining": 29                                     │
│       }                                                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 14. FRONTEND UPDATE                                              │
│     - Hide loading state                                         │
│     - Display generated workout                                  │
│     - Show "Start Workout" button                                │
│     - Update Zustand store with new workout                     │
│     - Show success toast notification                           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Observations

- **Total Latency:** ~3-5 seconds (mostly Bedrock API call)
- **Database Calls:** 3 reads, 2 writes (user profile, workout save, usage tracking)
- **External API Calls:** 2 (Redis rate limit, Bedrock AI)
- **Security Layers:** 4 (Auth, Rate Limit, RBAC, Input Validation)

---

## Deployment Architecture

### AWS Infrastructure Diagram

![AWS Deployment Architecture](diagrams/aws_deployment_architecture.png)

*This diagram shows the AWS infrastructure and deployment setup.*

### Infrastructure Components

#### 1. **Route 53 (DNS)**
```
kinexfit.com → AWS ALB (us-east-1)
```
- A record pointing to ALB
- HTTPS redirect enabled
- TTL: 300 seconds

#### 2. **Application Load Balancer (ALB)**
```
Target: ECS Fargate Service
Health Check: GET /api/health every 30s
```
- Listens on ports 80 (HTTP) and 443 (HTTPS)
- SSL/TLS termination with AWS Certificate Manager
- Forwards to ECS target group
- Health check threshold: 2 consecutive successes

#### 3. **ECS Fargate Cluster**
```
Cluster: kinexfit-production
Service: kinexfit-web-service
Task Definition: kinexfit-web:latest
```

**Task Specifications:**
- **Image:** AWS ECR (kinexfit-web:latest)
- **CPU:** 1 vCPU (1024 units)
- **Memory:** 2GB (2048 MB)
- **Networking:** awsvpc mode (each task has ENI)
- **Port Mapping:** 3000 (container) → 3000 (host)

**Auto-Scaling Configuration:**
- Min tasks: 2
- Max tasks: 10
- Target CPU utilization: 70%
- Target memory utilization: 80%
- Scale-up cooldown: 60 seconds
- Scale-down cooldown: 300 seconds

**Environment Variables:**
- Sourced from AWS SSM Parameter Store
- Injected at container start
- Secrets encrypted with AWS KMS

#### 4. **DynamoDB Tables**

**spotter-users:**
```
Partition Key: id (String)
Billing Mode: On-Demand
TTL: None
Global Secondary Indexes:
  - email-index (for lookup by email)
  - stripeCustomerId-index (for webhook processing)
```

**spotter-workouts:**
```
Partition Key: userId (String)
Sort Key: id (String)
Billing Mode: On-Demand
TTL: None
Global Secondary Indexes:
  - userId-createdAt-index (for date-sorted queries)
```

**spotter-workout-completions:**
```
Partition Key: userId (String)
Sort Key: completedAt (String)
Billing Mode: On-Demand
TTL: None
```

**spotter-webhook-events:**
```
Partition Key: eventId (String)
Billing Mode: On-Demand
TTL: 7 days (auto-cleanup old events)
```

#### 5. **AWS Bedrock**
```
Region: us-east-1
Models Enabled:
  - anthropic.claude-3-5-sonnet-20240620-v1:0
  - anthropic.claude-3-opus-20240229-v1:0
  - anthropic.claude-3-haiku-20240307-v1:0
```

**IAM Permissions:**
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*"
}
```

#### 6. **AWS Textract**
```
Region: us-east-1
APIs Used:
  - DetectDocumentText (synchronous OCR)
```

#### 7. **AWS S3**
```
Bucket: kinexfit-workout-images-prod
Region: us-east-1
Versioning: Disabled
Lifecycle: Delete objects after 90 days (optional)
Public Access: Blocked (use presigned URLs)
```

#### 8. **AWS CloudWatch**
```
Log Groups:
  - /ecs/kinexfit-web (container logs)
  - /aws/bedrock/modelinvocations (AI usage)

Metrics:
  - Custom: API request count, latency
  - ECS: CPU, memory, task count
  - ALB: Request count, target response time

Alarms:
  - High error rate (5xx > 5% for 5 minutes)
  - High CPU (> 85% for 10 minutes)
  - Unhealthy target count (< 1 healthy task)
```

#### 9. **AWS SSM Parameter Store**
```
Parameters (SecureString, encrypted with KMS):
  /kinexfit/prod/AUTH_SECRET
  /kinexfit/prod/DATABASE_URL
  /kinexfit/prod/STRIPE_SECRET_KEY
  /kinexfit/prod/STRIPE_WEBHOOK_SECRET
  /kinexfit/prod/AWS_ACCESS_KEY_ID
  /kinexfit/prod/AWS_SECRET_ACCESS_KEY
  /kinexfit/prod/GOOGLE_CLIENT_SECRET
  /kinexfit/prod/FACEBOOK_CLIENT_SECRET
  /kinexfit/prod/EMAIL_PASSWORD
  /kinexfit/prod/UPSTASH_REDIS_TOKEN
```

---

## Key Design Decisions

### 1. Monorepo (Next.js Full-Stack) vs Microservices

**Decision:** Single Next.js application

**Rationale:**
- **Velocity:** Shared types, no API versioning, faster iteration
- **Simplicity:** One deployment pipeline, one service to monitor
- **Type Safety:** End-to-end TypeScript without duplication
- **Cost:** Single ECS service vs. multiple services

**Trade-offs:**
- Cannot scale frontend/backend independently (mitigated by Fargate auto-scaling)
- Harder to migrate to microservices later (acceptable for current scale)

**When to reconsider:** When we reach 10,000+ DAU or need separate teams for frontend/backend

---

### 2. DynamoDB vs PostgreSQL

**Decision:** DynamoDB for primary data

**Rationale:**
- **Schema Flexibility:** Workouts have variable structures (exercises, sets, reps, timing)
- **Scalability:** Auto-scales to millions of requests without sharding
- **Performance:** Single-digit millisecond latency at any scale
- **Cost:** On-demand billing (pay per request, no idle servers)

**Trade-offs:**
- No SQL joins (must denormalize data)
- No complex analytics queries (would need data warehouse for BI)
- Harder to debug (no SQL console for ad-hoc queries)

**Example Denormalization:**
```javascript
// User's subscription tier stored on every workout
{
  "workoutId": "workout-123",
  "userId": "user-456",
  "userSubscriptionTier": "pro",  // Denormalized
  "exercises": [...]
}
```
This avoids joins when querying workouts by tier.

**When to reconsider:** When we need complex analytics or transactional guarantees across multiple entities

---

### 3. AWS Bedrock vs OpenAI

**Decision:** AWS Bedrock (Claude models)

**Rationale:**
- **Cost:** Claude Sonnet is ~40% cheaper than GPT-4 Turbo ($3/1M vs $5/1M)
- **Integration:** Same AWS account, IAM roles, VPC (no external API keys)
- **Prompt Caching:** 90% discount on cached tokens (huge savings for training profiles)
- **Privacy:** Data never leaves AWS, no third-party data processing agreements

**Trade-offs:**
- Fewer models (only Claude, no GPT-4 or Gemini)
- Less ecosystem tooling (LangChain, etc.)
- AWS-only (can't easily migrate to GCP or Azure)

**Performance Comparison:**
| Model | Input Cost | Output Cost | Quality | Use Case |
|-------|-----------|-------------|---------|----------|
| Claude Opus | $15/1M | $75/1M | Highest | Premium features (WoW) |
| Claude Sonnet | $3/1M | $15/1M | Balanced | Default (workout generation) |
| Claude Haiku | $0.25/1M | $1.25/1M | Fast | Simple tasks (timer suggestions) |

**When to reconsider:** When Claude quality degrades or pricing changes significantly

---

### 4. NextAuth.js JWT Sessions vs Database Sessions

**Decision:** JWT sessions (stateless)

**Rationale:**
- **Scalability:** No session database lookups on every request
- **Multi-Instance:** Works across multiple ECS tasks without sticky sessions
- **Simplicity:** No Redis or session table to manage

**Trade-offs:**
- Cannot revoke sessions immediately (must wait for 30-day expiration)
- Session data embedded in JWT (limited to 4KB)
- If secret leaks, all sessions compromised (mitigated by rotation)

**Session Structure:**
```javascript
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "subscriptionTier": "pro"
  },
  "expires": "2025-02-08T12:00:00Z"
}
```

**When to reconsider:** When we need instant session revocation (e.g., logout from all devices)

---

### 5. Upstash Redis vs In-Memory Rate Limiting

**Decision:** Upstash Redis (distributed)

**Rationale:**
- **Consistency:** Single source of truth across multiple ECS tasks
- **Serverless:** Pay-per-request, no Redis cluster to manage
- **Sliding Window:** Precise rate limiting (not fixed-window approximation)

**Example Problem Solved:**
Without distributed rate limiting:
```
User makes 5 requests → ECS Task 1 (allows 5)
User makes 5 requests → ECS Task 2 (allows 5)
Total: 10 requests when limit is 5
```

With Upstash:
```
User makes 5 requests → Upstash increments counter to 5
User makes 5 requests → Upstash returns "limit exceeded"
Total: 5 requests (correctly enforced)
```

**When to reconsider:** When Upstash becomes a bottleneck (unlikely at current scale)

---

## Scalability & Performance

### Current Capacity

**Single ECS Task:**
- Handles ~500 requests/minute
- CPU: ~30% average utilization
- Memory: ~800MB average usage

**Current Configuration (2-10 tasks):**
- Min capacity: 1,000 req/min
- Max capacity: 5,000 req/min
- Estimated users: 5,000-50,000 DAU

### Bottleneck Analysis

**Potential Bottlenecks (in order of likelihood):**

1. **DynamoDB Read/Write Capacity**
   - **Current:** On-demand (auto-scales)
   - **Monitor:** Throttled request count
   - **Solution:** Switch to provisioned capacity with auto-scaling for cost optimization

2. **Bedrock API Rate Limits**
   - **Current:** AWS account-level limits (varies by model)
   - **Monitor:** 429 responses from Bedrock
   - **Solution:** Request quota increase from AWS

3. **ALB Connection Limits**
   - **Current:** 50,000 concurrent connections per ALB
   - **Monitor:** ALB metrics in CloudWatch
   - **Solution:** Add second ALB or upgrade to Network Load Balancer

4. **ECS Fargate Limits**
   - **Current:** 10 tasks max (configured)
   - **Monitor:** Task scaling metrics
   - **Solution:** Increase max tasks or shard by region

### Performance Optimizations

**Implemented:**
- ✅ Next.js standalone build (~50MB vs ~500MB)
- ✅ React Server Components (reduce client JS)
- ✅ Bedrock prompt caching (90% cost savings on repeat requests)
- ✅ DynamoDB single-table design (minimize round trips)
- ✅ Image optimization (next/image with S3)
- ✅ CDN for static assets (ALB caching)

**Planned:**
- ⏳ Redis caching for frequently accessed workouts
- ⏳ Batch processing for AI requests (queue + workers)
- ⏳ Read replicas for DynamoDB (if analytics become heavy)

---

## Security Architecture

### Defense in Depth (Multiple Layers)

```
Layer 1: Network Security
  ↓ ALB with AWS WAF (optional, not yet enabled)
  ↓ HTTPS-only (TLS 1.2+)
  ↓ Private VPC for ECS tasks

Layer 2: Application Security
  ↓ Security headers (CSP, HSTS, X-Frame-Options)
  ↓ CSRF protection (NextAuth.js)
  ↓ Rate limiting (Upstash Redis)

Layer 3: Authentication & Authorization
  ↓ JWT signature verification (NextAuth.js)
  ↓ Role-based access control (RBAC)
  ↓ Subscription tier enforcement

Layer 4: Input Validation
  ↓ Zod schema validation (client + server)
  ↓ SQL injection prevention (Prisma parameterized queries)
  ↓ XSS prevention (React auto-escaping)

Layer 5: Data Security
  ↓ Secrets in AWS SSM (encrypted with KMS)
  ↓ Password hashing (bcrypt, 10 rounds)
  ↓ DynamoDB encryption at rest (AWS-managed keys)
```

### Security Headers (src/middleware.ts)

```typescript
// Content Security Policy
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.stripe.com https://bedrock.us-east-1.amazonaws.com;
  frame-src https://js.stripe.com;

// HTTP Strict Transport Security
Strict-Transport-Security: max-age=31536000; includeSubDomains

// Prevent clickjacking
X-Frame-Options: DENY

// Prevent MIME sniffing
X-Content-Type-Options: nosniff

// Referrer policy
Referrer-Policy: strict-origin-when-cross-origin
```

### Rate Limiting Strategy

| Endpoint Category | Limit | Window | Scope |
|------------------|-------|--------|-------|
| **Login Attempts** | 10 | 1 hour | IP address |
| **API Reads (GET)** | 100 | 1 minute | User ID |
| **AI Requests** | 30 | 1 hour | User ID |
| **OCR Requests** | 10 | 1 hour | User ID |
| **Stripe Webhooks** | 1000 | 1 minute | IP address |

**Implementation:**
```typescript
// lib/rate-limit.ts
export const aiRateLimiter = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  analytics: true,
});

const { success, remaining } = await aiRateLimiter.limit(userId);
if (!success) {
  return res.status(429).json({ error: "Rate limit exceeded" });
}
```

---

## Integration Points

### External Service Integrations

#### 1. Stripe (Payment Processing)

**Integration Type:** Webhook-based

**Flow:**
```
1. User clicks "Upgrade to Pro"
2. Frontend calls POST /api/stripe/checkout
3. Backend creates Stripe checkout session
4. User redirected to Stripe hosted page
5. User enters payment info and submits
6. Stripe processes payment
7. Stripe sends webhook to POST /api/stripe/webhook
8. Backend verifies signature and updates user tier
9. User redirected back to app with success message
```

**Security:**
- Webhook signature verification with HMAC-SHA256
- Idempotency (DynamoDB conditional writes prevent double-processing)
- HTTPS-only webhooks

**Error Handling:**
- Webhook retries (Stripe retries failed webhooks automatically)
- Manual reconciliation dashboard for failed payments

---

#### 2. AWS Bedrock (AI Generation)

**Integration Type:** Synchronous API calls

**Models Used:**
- **Claude Opus 4.5** - Premium ($15/$75 per 1M tokens)
- **Claude Sonnet 4.5** - Default ($3/$15 per 1M tokens)
- **Claude Haiku 4.5** - Fast ($0.25/$1.25 per 1M tokens)

**Request Structure:**
```typescript
const response = await bedrockClient.converse({
  modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  messages: [
    {
      role: "user",
      content: [
        {
          text: prompt,
          cacheControl: { type: "ephemeral" }  // Enable caching
        }
      ]
    }
  ],
  inferenceConfig: {
    maxTokens: 4096,
    temperature: 0.7
  }
});
```

**Cost Optimization:**
- Prompt caching for training profile (90% discount on cached tokens)
- Model selection based on task complexity
- Token usage tracking per user

---

#### 3. OAuth Providers (Google, Facebook, Apple)

**Integration Type:** NextAuth.js providers

**Configuration:**
```typescript
// lib/auth/auth-options.ts
providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        prompt: "consent",
        access_type: "offline",
        response_type: "code"
      }
    },
    profile(profile) {
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        image: profile.picture,
        emailVerified: profile.email_verified ? new Date() : null
      }
    }
  }),
  FacebookProvider({...}),
  // AppleProvider({...}) // Required for iOS release (pending implementation)
]
```

---

## Error Handling & Resilience

### Error Classification

| Error Type | HTTP Code | User Message | Action |
|-----------|-----------|--------------|--------|
| **Validation Error** | 400 | "Invalid input: {details}" | Fix form input |
| **Unauthorized** | 401 | "Please log in" | Redirect to login |
| **Forbidden** | 403 | "Upgrade to access this feature" | Show upgrade prompt |
| **Not Found** | 404 | "Workout not found" | Go back |
| **Rate Limit** | 429 | "Too many requests. Try again in {time}" | Show cooldown timer |
| **Server Error** | 500 | "Something went wrong. Try again" | Log error, retry |
| **Service Unavailable** | 503 | "Service temporarily down" | Show maintenance page |

### Retry Strategy

**API Calls (Frontend → Backend):**
```typescript
// Exponential backoff with jitter
const maxRetries = 3;
const baseDelay = 1000; // 1 second

for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    const response = await fetch("/api/workouts", {...});
    if (response.ok) return response;
    if (response.status === 429) {
      // Rate limit: wait and retry
      await delay(baseDelay * Math.pow(2, attempt) + Math.random() * 1000);
      continue;
    }
    // Non-retriable error
    throw new Error(response.statusText);
  } catch (error) {
    if (attempt === maxRetries - 1) throw error;
  }
}
```

**AWS SDK Calls:**
- Built-in retry logic (3 retries with exponential backoff)
- Configurable timeout (30 seconds default)

### Circuit Breaker (Future Enhancement)

Not yet implemented, but planned for external service calls:

```typescript
// Prevent cascading failures
const circuitBreaker = new CircuitBreaker(stripeClient.checkout.create, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

---

## Monitoring & Observability

See full details in [MONITORING-GUIDE.md](MONITORING-GUIDE.md).

**Key Metrics:**

1. **Application Metrics**
   - API request count (by endpoint, status code)
   - API latency (p50, p95, p99)
   - AI token usage (by user, by model)
   - Error rate (5xx responses)

2. **Infrastructure Metrics**
   - ECS task count
   - CPU utilization
   - Memory utilization
   - ALB target health

3. **Business Metrics**
   - User signups
   - Subscription conversions
   - Workout completions
   - AI requests per user

**Logging:**
```typescript
// Structured logging with context
logger.info("AI workout generated", {
  userId: user.id,
  workoutId: workout.id,
  tokensUsed: tokens,
  cost: cost,
  model: "claude-sonnet-4.5",
  duration: Date.now() - startTime
});
```

---

## Conclusion

This architecture is designed for:
- **Rapid iteration** (monorepo, shared types, single deployment)
- **Scalability** (DynamoDB, ECS Fargate, stateless API)
- **Cost efficiency** (on-demand billing, prompt caching, serverless)
- **Security** (multiple layers, zero-trust, secrets management)
- **Developer experience** (TypeScript, clear separation, excellent tooling)

**Next Steps:**
- Read [DATABASE.md](DATABASE.md) for data model deep dive
- Read [API-REFERENCE.md](API-REFERENCE.md) for complete API documentation
- Read [AI-INTEGRATION.md](AI-INTEGRATION.md) for AI implementation details
- Read [FRONTEND.md](FRONTEND.md) for React component architecture

---

**Last Updated:** January 2025
**Maintained By:** Development Team
**Questions?** Open an issue or contact the team
