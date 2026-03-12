# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Kinex Fit is an AI-powered fitness application built with Next.js 15, TypeScript, and AWS infrastructure. It provides workout tracking, AI-assisted workout generation via AWS Bedrock (Codex models), progress analytics, and Stripe-based subscriptions.

## Common Commands

```bash
npm run dev          # Start dev server with Turbopack (port 3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run db:push      # Push Prisma schema to SQLite (local dev)
npm run db:generate  # Generate Prisma client
```

Testing with Playwright:
```bash
npx playwright test                    # Run all E2E tests
npx playwright test tests/auth-flow.spec.ts  # Run specific test file
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS, shadcn/ui (Radix primitives)
- **Backend**: Next.js API Routes, TypeScript strict mode
- **Database**: SQLite + Prisma (local dev), DynamoDB (production)
- **Auth**: NextAuth.js with Google, Facebook, and credentials providers
- **AI**: AWS Bedrock (Codex Opus 4.5, Sonnet 4.5, Haiku 4.5)
- **Payments**: Stripe subscriptions with webhook handling
- **State**: Zustand for client state (`useAuthStore`)

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (REST endpoints)
│   │   ├── ai/           # AI generation endpoints
│   │   ├── auth/         # NextAuth handlers
│   │   ├── stripe/       # Payment endpoints
│   │   ├── workouts/     # Workout CRUD
│   │   └── admin/        # Admin endpoints
│   └── [routes]/         # Page components
├── components/
│   ├── ui/               # shadcn UI components
│   └── [feature]/        # Feature-specific components
├── lib/                   # Server utilities
│   ├── ai/               # Bedrock client, generators
│   ├── dynamodb.ts       # DynamoDB operations
│   ├── auth-options.ts   # NextAuth configuration
│   ├── api-auth.ts       # API auth middleware
│   ├── subscription-tiers.ts  # Tier definitions
│   └── smartWorkoutParser.ts  # Workout text parsing
└── types/                 # TypeScript definitions
```

### Key Patterns

**API Route Authentication**:
```typescript
import { getAuthenticatedUserId } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUserId();
  if ('error' in auth) return auth.error;
  const { userId } = auth;
  // ... rest of handler
}
```

**Database Access** (production uses DynamoDB wrappers):
```typescript
import { dynamoDBUsers, dynamoDBWorkouts } from "@/lib/dynamodb";

await dynamoDBWorkouts.list(userId, limit);
await dynamoDBUsers.get(userId);
```

**Rate Limiting**:
```typescript
import { checkRateLimit } from "@/lib/rate-limit";

const rateLimit = await checkRateLimit(userId, 'api:read');
if (!rateLimit.success) { /* return 429 */ }
```

### Subscription Tiers
- **Free**: 3 workouts/week, 1 AI request/month, 90-day history
- **Core** ($8.99/mo): Unlimited workouts, 10 AI requests/month
- **Pro** ($13.99/mo): 30 AI requests/month, unlimited imports
- **Elite** ($19.99/mo): 50 AI requests/month, priority support

### Path Alias
Use `@/*` which maps to `./src/*` (configured in tsconfig.json).

## Key Files

- `src/lib/auth-options.ts` - NextAuth providers and callbacks
- `src/lib/dynamodb.ts` - All DynamoDB table operations
- `src/lib/ai/bedrock-client.ts` - Codex model invocation
- `src/lib/smartWorkoutParser.ts` - Heuristic workout text parser
- `src/middleware.ts` - Security headers (CSP, HSTS, etc.)
- `src/lib/subscription-tiers.ts` - Tier definitions and limits

## Documentation

Detailed documentation is in `docs/`:
- `docs/COMPREHENSIVE-GUIDE.md` - Full project overview
- `docs/ARCHITECTURE.md` - System design with diagrams
- `docs/DATABASE.md` - DynamoDB schema and patterns
- `docs/AI-INTEGRATION.md` - Bedrock setup and usage
- `docs/AUTHENTICATION.md` - NextAuth deep dive

## Environment Variables

Key variables needed (see `.env.example`):
- `AUTH_SECRET` - NextAuth signing secret
- `GOOGLE_CLIENT_ID/SECRET` - OAuth
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Payments
- `AWS_REGION`, `AWS_BEDROCK_REGION` - AWS services
- `DYNAMODB_*_TABLE` - Table names
- `UPSTASH_REDIS_*` - Rate limiting