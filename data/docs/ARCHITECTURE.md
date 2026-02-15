# Kinex Fit Architecture

This document provides a comprehensive overview of Kinex Fit's system architecture, design decisions, and technical implementation details.

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Design](#database-design)
- [Authentication & Authorization](#authentication--authorization)
- [API Design](#api-design)
- [Infrastructure & Deployment](#infrastructure--deployment)
- [Security Considerations](#security-considerations)
- [Performance Optimization](#performance-optimization)
- [Design Decisions](#design-decisions)

## System Overview

Kinex Fit is a full-stack fitness tracking application built with modern web technologies and deployed on AWS infrastructure. The application follows a **serverless container architecture** using Next.js App Router with server-side rendering and API routes.

### Key Characteristics

- **Architecture Pattern**: Monolithic Next.js application with integrated API routes
- **Deployment Model**: Containerized application on AWS ECS Fargate
- **Data Strategy**: DynamoDB for production, SQLite/Prisma for development
- **Authentication**: NextAuth.js with Google/Facebook/Email providers
- **Rendering**: Hybrid SSR + CSR with React Server Components

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React 19 + Next.js 15 App Router                        │   │
│  │  - Server Components (RSC)                               │   │
│  │  - Client Components (Interactive UI)                    │   │
│  │  - Zustand State Management                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Infrastructure                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Application Load Balancer (ALB)                         │   │
│  │  - HTTPS termination                                     │   │
│  │  - Health checks                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ECS Fargate (Container Runtime)                         │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Next.js Application Container                     │  │   │
│  │  │  - App Router (pages + API routes)                 │  │   │
│  │  │  - Server-side rendering                           │  │   │
│  │  │  - API endpoints                                    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌───────────┐      ┌────────────┐      ┌──────────────┐       │
│  │ DynamoDB  │      │ NextAuth   │      │     ECR      │       │
│  │           │      │            │      │              │       │
│  │ - Users   │      │ - Auth     │      │ - Images     │       │
│  │ - Workouts│      │ - OAuth    │      │              │       │
│  └───────────┘      └────────────┘      └──────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Route53                                                 │   │
│  │  kinexfit.com → ALB                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack

- **Framework**: Next.js 15.5.1 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (wrapping NextAuth session)
- **Form Handling**: React Hook Form + Zod validation
- **HTTP Client**: Native fetch API

### Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (pages)/             # Page routes
│   │   ├── add/edit/        # Workout creation/editing
│   │   ├── library/         # Workout library view
│   │   ├── workout/[id]/    # Individual workout detail
│   │   ├── auth/login/      # Authentication pages
│   │   └── page.tsx         # Home page
│   ├── api/                 # API Routes (server-side)
│   │   ├── auth/            # NextAuth endpoints
│   │   ├── workouts/        # Workout CRUD
│   │   ├── ocr/             # OCR processing
│   │   └── health/          # Health check
│   └── layout.tsx           # Root layout with providers
├── components/              # React components
│   ├── auth/               # Authentication components
│   ├── layout/             # Header, navigation
│   ├── providers/          # Context providers
│   └── ui/                 # Base UI components (shadcn)
├── lib/                    # Utilities and shared logic
│   ├── dynamodb.ts         # DynamoDB client
│   ├── workout/            # Workout utilities
│   └── utils.ts            # Common helpers
└── store/                  # Zustand stores
    └── index.ts            # Auth store
```

### Component Architecture

**Server Components (Default)**:
- Pages that fetch data server-side
- Layout components with metadata
- Static content rendering

**Client Components (`'use client'`)**:
- Interactive forms and buttons
- State management hooks
- Event handlers
- Real-time UI updates

### State Management Strategy

1. **Server State**: NextAuth.js session with JWT strategy
2. **Client State**: Zustand store wrapping `useSession` hook
3. **Local State**: React `useState` for component-local data
4. **Form State**: React Hook Form for complex forms
5. **Cache Layer**: localStorage for offline support

### Data Flow

```
User Action
    │
    ▼
Client Component
    │
    ├──► Local State Update (useState)
    │
    ├──► API Call (fetch)
    │       │
    │       ▼
    │   Next.js API Route
    │       │
    │       ▼
    │   DynamoDB Operation
    │       │
    │       ▼
    │   Response
    │
    ├──► State Update
    │
    └──► UI Re-render
```

## Backend Architecture

### Next.js API Routes

Kinex Fit uses Next.js API routes as the backend layer, co-located with the frontend application.

**Benefits**:
- Single deployment unit
- Shared TypeScript types
- Server-side session management
- Built-in request/response handling

### API Route Structure

```typescript
// src/app/api/workouts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { dynamoDBWorkouts } from '@/lib/dynamodb';

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Query database
  const workouts = await dynamoDBWorkouts.list(session.user.id);

  // 3. Return response
  return NextResponse.json({ workouts });
}
```

### Service Layer

The service layer is encapsulated in `src/lib/dynamodb.ts`:

```typescript
export const dynamoDBWorkouts = {
  async list(userId: string): Promise<DynamoDBWorkout[]> {...},
  async get(userId: string, workoutId: string): Promise<DynamoDBWorkout | null> {...},
  async upsert(userId: string, workout: ...): Promise<DynamoDBWorkout> {...},
  async update(userId: string, workoutId: string, updates: ...): Promise<void> {...},
  async delete(userId: string, workoutId: string): Promise<void> {...},
}
```

### Error Handling

```typescript
try {
  const result = await dynamoDBWorkouts.get(userId, workoutId);
  return NextResponse.json({ workout: result });
} catch (error) {
  console.error('Error fetching workout:', error);
  return NextResponse.json(
    { error: 'Failed to fetch workout' },
    { status: 500 }
  );
}
```

## Database Design

### DynamoDB Schema

#### spotter-workouts Table

**Access Patterns**:
1. Get all workouts for a user
2. Get specific workout by ID
3. Query workouts by date range
4. Search workouts by title/description

**Schema**:
```
Partition Key: userId (String)
Sort Key: workoutId (String)

Attributes:
- title: String
- description: String (optional)
- exercises: List<Map>
  - name: String
  - sets: Number
  - reps: String
  - rest: String
  - tempo: String (optional)
  - notes: String (optional)
- content: String
- author: Map (optional)
  - username: String
- source: String
- type: String
- totalDuration: Number
- difficulty: String
- tags: List<String>
- createdAt: String (ISO 8601)
- updatedAt: String (ISO 8601)
- llmData: Map (optional, future use)

Indexes:
- None currently (single-table design with partition key queries)
```

**Query Examples**:
```typescript
// Get all workouts for user
QueryCommand({
  TableName: 'spotter-workouts',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: { ':userId': userId }
})

// Get specific workout
GetItemCommand({
  TableName: 'spotter-workouts',
  Key: { userId, workoutId }
})
```

#### spotter-users Table

**Schema**:
```
Partition Key: userId (String)

Attributes:
- email: String
- firstName: String
- lastName: String
- image: String (optional)
- subscriptionTier: String (free/core/pro/elite)
- subscriptionStatus: String
- stripeCustomerId: String (optional)
- stripeSubscriptionId: String (optional)
- scanQuotaUsed: Number
- scanQuotaResetDate: String (ISO)
- ocrQuotaUsed: Number (per-source analytics)
- instagramImportsUsed: Number (per-source analytics)
- ocrQuotaLimit: Number (legacy)
- workoutsSaved: Number
- createdAt: String (ISO 8601)
- updatedAt: String (ISO 8601)
```

### Development Database (SQLite + Prisma)

```prisma
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  firstName             String?
  lastName              String?
  password              String?
  emailVerified         DateTime?
  image                 String?
  subscriptionTier      String    @default("free")
  subscriptionStatus    String    @default("active")
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  scanQuotaUsed         Int       @default(0)
  scanQuotaResetDate    DateTime? 
  ocrQuotaUsed          Int       @default(0)
  instagramImportsUsed  Int       @default(0)
  ocrQuotaLimit         Int?      @default(2) // legacy, not enforced
  workoutsSaved         Int       @default(0)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  accounts              Account[]
  sessions              Session[]
}
```

## Authentication & Authorization

### NextAuth.js Authentication

**Authentication Flow**:

```
1. User clicks "Login"
   │
   ▼
2. Redirect to OAuth provider (Google/Facebook/Apple) or show credentials form
   │
   ▼
3. Provider validates credentials / OAuth consent
   │
   ▼
4. Provider redirects back with authorization code (OAuth)
   │
   ▼
5. NextAuth.js exchanges code for tokens or validates credentials
   │
   ▼
6. JWT callback:
   - Extract provider profile (id, email, name)
   - Sync user to DynamoDB
   - Fetch subscription data
   │
   ▼
7. Session callback:
   - Shape user object for client
   - Include subscription tier and quota
   │
   ▼
8. Client receives session with user data
```

### Session Management

**JWT Strategy**:
```typescript
// src/app/api/auth/[...nextauth]/route.ts
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    CredentialsProvider({ /* email/password */ }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      if (account && profile) {
        // Sync user to DynamoDB on login
        await dynamoDBUsers.upsert({...});
      }
      if (trigger === "update") {
        // Refresh subscription data
        const user = await dynamoDBUsers.get(token.sub!);
        token.subscriptionTier = user?.subscriptionTier;
      }
      return token;
    },
    async session({ session, token }) {
      // Shape session for client
      session.user.id = token.sub!;
      session.user.subscriptionTier = token.subscriptionTier;
      return session;
    },
  },
});
```

### Authorization Strategy

**Row-Level Security**: All DynamoDB queries include `userId` in the key condition, ensuring users can only access their own data.

```typescript
// Every workout query includes userId
const workouts = await dynamoDBWorkouts.list(session.user.id);
```

## API Design

### RESTful Endpoints

```
Authentication:
- POST   /api/auth/signin              # Initiate login
- GET    /api/auth/callback/cognito    # OAuth callback
- POST   /api/auth/signout             # Logout

Workouts:
- GET    /api/workouts                 # List user's workouts
- POST   /api/workouts                 # Create new workout
- GET    /api/workouts/[id]            # Get specific workout
- PATCH  /api/workouts/[id]            # Update workout
- DELETE /api/workouts/[id]            # Delete workout

Utilities:
- POST   /api/ocr                      # OCR image processing
- POST   /api/instagram-fetch          # Fetch Instagram content
- POST   /api/ingest                   # Data ingestion
- GET    /api/health                   # Health check
```

### Request/Response Format

**Success Response**:
```json
{
  "workout": {
    "workoutId": "123",
    "userId": "user-456",
    "title": "Upper Body Strength",
    "exercises": [...],
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Response**:
```json
{
  "error": "Unauthorized"
}
```

### API Security

1. **Authentication**: All workout endpoints require valid session
2. **Authorization**: userId scoping on all queries
3. **Rate Limiting**: None currently (future: API Gateway throttling)
4. **Input Validation**: Zod schemas on API routes (future)

## Infrastructure & Deployment

### AWS ECS Fargate

**Cluster**: `spotter-cluster`
**Service**: `spotter-service`
**Task Definition**: Container with Next.js standalone build

**Container Configuration**:
```dockerfile
FROM node:18-alpine AS base
# Build stage
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Load Balancer

**Application Load Balancer**:
- HTTPS listener (port 443)
- HTTP → HTTPS redirect (port 80)
- Target group health checks on `/api/health`
- Sticky sessions disabled

### DNS & SSL

- **Domain**: kinexfit.com
- **DNS**: Route53 A record → ALB
- **SSL**: ACM certificate (auto-renewal)

### Environment Variables

**Production (ECS Task Definition)**:
```
NODE_ENV=production
AWS_REGION=us-east-1
DYNAMODB_USERS_TABLE=spotter-users
DYNAMODB_WORKOUTS_TABLE=spotter-workouts
AUTH_SECRET=xxx
NEXTAUTH_URL=https://kinexfit.com
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
FACEBOOK_CLIENT_ID=xxx
FACEBOOK_CLIENT_SECRET=xxx
```

## Security Considerations

### Current Security Measures

1. **HTTPS Only**: All traffic encrypted with TLS
2. **Secure Cookies**: httpOnly, secure, sameSite: "lax"
3. **Session Expiration**: 30-day JWT expiration
4. **Row-Level Security**: userId scoping on all queries
5. **Credential Management**: AWS Secrets Manager for sensitive keys
6. **IAM Roles**: ECS task role with minimal DynamoDB permissions

### Security Roadmap

- [ ] Rate limiting on API routes
- [ ] CSRF protection on state-changing endpoints
- [ ] Input sanitization with Zod validation
- [ ] WAF rules on ALB
- [ ] CloudWatch alarms for suspicious activity
- [ ] DynamoDB encryption at rest (already enabled)
- [ ] Audit logging for sensitive operations

## Performance Optimization

### Current Optimizations

1. **Standalone Output**: Minimal production bundle size
2. **Multi-stage Docker Build**: Optimized image layers
3. **Server Components**: Reduced client-side JavaScript
4. **LocalStorage Cache**: Offline support and faster loads
5. **DynamoDB Single-Table Design**: Efficient queries with partition key

### Performance Metrics (Production)

- **Cold Start**: ~2-3 seconds (ECS Fargate)
- **Page Load**: ~1-2 seconds (SSR)
- **API Response**: <200ms (DynamoDB queries)
- **Container Memory**: 512 MB allocated

### Future Optimizations

- [ ] CDN for static assets (CloudFront)
- [ ] Image optimization with Next.js Image component
- [ ] API response caching with Redis
- [ ] Database query optimization with GSIs
- [ ] Lazy loading for workout list
- [ ] Infinite scroll pagination

## Design Decisions

### Why Next.js Monolith vs. Microservices?

**Decision**: Monolithic Next.js application

**Rationale**:
- Simpler deployment and maintenance
- Shared TypeScript types between frontend/backend
- Lower operational complexity for MVP
- Single container deployment
- Co-located API routes with pages

**Trade-offs**:
- Harder to scale individual services
- Potential performance bottlenecks
- Less flexibility for polyglot teams

### Why DynamoDB vs. Relational Database?

**Decision**: DynamoDB for production

**Rationale**:
- Serverless with automatic scaling
- Low latency for workout queries
- Cost-effective for low-traffic MVP
- Simple access patterns (user-scoped queries)
- No database server management

**Trade-offs**:
- Limited query flexibility
- No complex joins or transactions
- Requires careful schema design
- Higher cost at scale

### Why NextAuth.js vs. Custom Auth?

**Decision**: NextAuth.js with direct OAuth providers

**Rationale**:
- Battle-tested authentication library
- Built-in session management
- Direct Google/Facebook OAuth integration
- Built-in credentials provider support
- JWT strategy for stateless sessions

**Trade-offs**:
- Opinionated session structure
- Limited customization
- Middleware complexity

### Why Zustand vs. Redux?

**Decision**: Zustand for client state

**Rationale**:
- Minimal boilerplate
- Simple API wrapping NextAuth
- Lightweight bundle size
- React hooks-based

**Trade-offs**:
- Less ecosystem tooling
- No Redux DevTools
- Limited middleware support

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: Kinex Fit Development Team
