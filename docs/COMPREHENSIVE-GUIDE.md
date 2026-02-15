# Kinex Fit - Comprehensive Documentation Guide

**Project Codename:** Spot Buddy / Spotter
**Production URL:** https://kinexfit.com
**Status:** Phase 6 Complete - Production Ready (Beta)

---

## 📚 Table of Contents

### For Everyone
- [Project Overview](#project-overview)
- [The Origin Story](#the-origin-story)
- [Quick Start Guide](#quick-start-guide)
- [Feature Overview](#feature-overview)

### For Users
- **[User Guide](USER-GUIDE.md)** - Complete guide to using Kinex Fit

### For Developers (Learning the Codebase)
- **[Architecture Overview](ARCHITECTURE.md)** - System design, diagrams, and technical decisions
- **[Frontend Architecture](FRONTEND.md)** - React/Next.js components and patterns
- **[API Reference](API-REFERENCE.md)** - Complete REST API documentation
- **[Database Schema](DATABASE.md)** - Data models and DynamoDB design
- **[Authentication System](AUTHENTICATION.md)** - NextAuth.js implementation deep dive
- **[AI Integration](AI-INTEGRATION.md)** - AWS Bedrock and AI features explained
- **[Development Guide](DEVELOPMENT.md)** - Local setup, workflows, and best practices

### For DevOps/SRE
- **[Deployment Guide](DEPLOYMENT.md)** - AWS infrastructure and deployment process (existing)
- **[Monitoring Guide](MONITORING-GUIDE.md)** - Observability and alerting (existing)

---

## Project Overview

### What Is Kinex Fit?

Kinex Fit is an **AI-powered fitness workout tracker** that transforms how you plan, track, and execute workouts. It solves three core problems:

1. **Instagram Workouts Are Hard to Follow** - Save Instagram posts as structured, easy-to-follow workouts
2. **Planning Workouts Takes Time** - AI generates personalized workouts in seconds
3. **Tracking Progress Is Tedious** - Automatic logging, PR tracking, and analytics

### Technology Stack at a Glance

```
Frontend:        Next.js 15 + React 19 + TypeScript + Tailwind CSS
Backend:         Next.js API Routes + Node.js
Database:        DynamoDB (primary) + SQLite (NextAuth sessions)
AI:              AWS Bedrock (Claude Opus 4.5, Sonnet 4.5, Haiku 4.5)
Authentication:  NextAuth.js (Google, Facebook, Email/Password; Apple Sign-In required for iOS, pending)
Payments:        Stripe
Infrastructure:  AWS ECS Fargate + Docker
Storage:         AWS S3
OCR:             AWS Textract
Rate Limiting:   Upstash Redis
Email:           Nodemailer (SMTP)
```

---

## The Origin Story

### Why I Built This

> "I started Kinex Fit because I was tired of losing my Instagram workout screenshots in my camera roll. I'd save routines from trainers I follow, but when I got to the gym, I couldn't find them or they were hard to read on my phone between sets.
>
> I wanted a gym partner that could:
> - Save my favorite Instagram workouts in one place
> - Make them easy to follow during my workout
> - Track what I've completed so I could see progress
> - Suggest workouts when I didn't know what to do
>
> As I built this, I used it myself every single workout. Each feature was added because I needed it in the gym. When the AI generation worked for the first time and gave me a personalized leg day, I was hooked.
>
> This is a tool I genuinely love using. It's my gym partner when I'm on my own, and I hope it can be yours too."

### Built With AI Assistance

This project was built collaboratively with Claude (Anthropic's AI). Here's the honest truth about the process:

**What AI Accelerated:**
- Boilerplate code generation (React components, API routes, TypeScript types)
- AWS SDK integration patterns and best practices
- Security implementations (CSP headers, rate limiting, CSRF protection)
- Documentation and code comments
- Debugging assistance and error resolution

**What Required Human Vision:**
- Product concept and feature prioritization
- UX design decisions and user flows
- Business model and pricing strategy
- AWS architecture choices
- Real-world testing and feedback

**The Result:**
A production-ready application built **10x faster** than traditional development, with enterprise-grade code quality and security best practices built in from day one.

**Learning Goal:**
While AI accelerated the build process, the goal of this documentation is to help me (and you) understand **how every piece works** so I can confidently discuss architecture, design patterns, and implementation details with senior engineers.

---

## Quick Start Guide

### For End Users

1. **Visit:** [kinexfit.com](https://kinexfit.com)
2. **Sign Up:** Choose Google, Facebook, Email/Password (Apple Sign-In required for iOS, pending)
3. **Complete Onboarding:**
   - Share your fitness goals (strength, endurance, weight loss, etc.)
   - Select your experience level (beginner, intermediate, advanced)
   - List your available equipment (dumbbells, barbell, resistance bands, etc.)
   - Enter your personal records (optional but recommended for AI personalization)
4. **Start Training:**
   - Save an Instagram workout
   - Generate an AI workout from a text prompt
   - Browse "Workout of the Day"
   - Manually create a custom workout
5. **Track Progress:**
   - Log workout completions
   - Update personal records (PRs)
   - Record body metrics (weight, measurements)
   - View analytics and charts

**Full User Guide:** [USER-GUIDE.md](USER-GUIDE.md)

### For Developers (Local Setup)

```bash
# 1. Clone the repository
git clone <repository-url>
cd kinex-fit-web

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# Edit .env.local with your credentials:
# - AUTH_SECRET (generate with: openssl rand -base64 32)
# - Database URLs (DynamoDB local or AWS)
# - OAuth credentials (Google, Facebook; Apple required for iOS)
# - Stripe test keys
# - AWS credentials

# 4. Initialize Prisma database (for NextAuth sessions)
npx prisma generate
npx prisma db push

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000
```

**Detailed Setup Guide:** [DEVELOPMENT.md](DEVELOPMENT.md)

---

## Feature Overview

### Core Features

| Feature | Description | Key Technologies | Tier Required |
|---------|-------------|------------------|---------------|
| **Instagram Import** | Save Instagram posts as workouts with OCR | AWS Textract, Apify | Free+ |
| **AI Workout Generation** | "Give me an upper body workout" → Full routine | AWS Bedrock (Claude) | Free+ |
| **AI Enhancement** | Clean up messy or OCR-extracted workout text | AWS Bedrock (Claude) | Free+ |
| **Workout Management** | Create, edit, delete, schedule workouts | DynamoDB, React | All |
| **Progress Tracking** | Completion history, streaks, calendar view | DynamoDB, Recharts | All |
| **Body Metrics** | Log weight, body fat, measurements | DynamoDB, Recharts | All |
| **Personal Records (PRs)** | Track 1RM by exercise | DynamoDB | All |
| **Workout Timers** | EMOM, AMRAP, Tabata, custom intervals | React, Web Audio API | All |
| **Advanced Analytics** | Volume trends, PR progression charts | Recharts | Pro+ |
| **Workout of the Day** | AI-generated daily workout | AWS Bedrock | Core+ |
| **Workout of the Week** | AI-generated weekly routine | AWS Bedrock | Pro+ |

### Subscription Tiers

| Tier | Price | Workouts/Period | Instagram Imports | AI Requests/Month | Key Features |
|------|-------|---------------|-------------------|-------------------|--------------|
| **Free** | $0 | Monthly limits | 1/month | 1 | Basic tracking, limited AI |
| **Core** | $8.99/mo | Unlimited | 3/week | 10 | Unlimited workouts, WOD |
| **Pro** | $13.99/mo | Unlimited | Unlimited | 30 | Advanced analytics, WOW |
| **Elite** | $24.99/mo | Unlimited | Unlimited | 100 | Priority support, early access |

**Full Pricing Details:** [PRICING.md](PRICING.md)

---

## Architecture Highlights

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (Browser / Future Mobile)              │
│                  Next.js 15 + React 19 + TypeScript              │
│                         Tailwind CSS + shadcn UI                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS (TLS 1.2+)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AWS Application Load Balancer                │
│                      (kinexfit.com → ECS Fargate)                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js API Routes                       │
│                     (36 RESTful API Endpoints)                   │
│                                                                   │
│  /api/auth/*          - NextAuth.js authentication               │
│  /api/workouts/*      - Workout CRUD operations                  │
│  /api/ai/*            - AI generation/enhancement                │
│  /api/stripe/*        - Payment webhooks                         │
│  /api/user/*          - User profile management                  │
│  /api/body-metrics/*  - Body metrics tracking                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼────────────────┬─────────────┐
                ▼               ▼                ▼             ▼
         ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
         │ DynamoDB  │   │  Stripe  │   │ Bedrock  │   │ Upstash  │
         │ (Primary  │   │ Payments │   │AI (Claude)│   │  Redis   │
         │   Data)   │   │          │   │          │   │Rate Limit│
         └───────────┘   └──────────┘   └──────────┘   └──────────┘
                │
         ┌──────┴──────────┬──────────┐
         ▼                 ▼          ▼
    ┌────────┐       ┌─────────┐  ┌────────┐
    │   S3   │       │Textract │  │ SQLite │
    │ Images │       │   OCR   │  │(Prisma)│
    │        │       │         │  │Sessions│
    └────────┘       └─────────┘  └────────┘
```

**Detailed Diagrams:** [ARCHITECTURE.md](ARCHITECTURE.md)

### Request Flow Example: "Generate AI Workout"

```
User: "Give me a back and biceps workout"
  │
  ├─> Frontend: WorkoutGenerationForm submits
  │
  ├─> API: POST /api/ai/generate-workout
  │     │
  │     ├─> Rate Limiter (Upstash Redis): Check 30 requests/hour limit
  │     │
  │     ├─> Auth: Verify JWT session (NextAuth.js)
  │     │
  │     ├─> DynamoDB: Fetch user profile + training preferences + PRs
  │     │
  │     ├─> AI: Send to AWS Bedrock (Claude Sonnet 4.5)
  │     │     - Prompt: User request + training profile + equipment + PRs
  │     │     - Response: Structured workout JSON
  │     │     - Track tokens used & cost
  │     │
  │     ├─> DynamoDB: Save generated workout
  │     │
  │     └─> Response: Return workout to frontend
  │
  └─> Frontend: Display workout + "Start Workout" button
```

**Deep Dive:** [AI-INTEGRATION.md](AI-INTEGRATION.md)

---

## Project Structure

```
kinex-fit-web/
│
├── src/
│   ├── app/                           # Next.js App Router (15+)
│   │   ├── (pages)/                   # Route groups (14+ pages)
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── dashboard/            # User dashboard
│   │   │   ├── add/                  # Workout creation wizard
│   │   │   ├── subscription/         # Subscription management
│   │   │   ├── settings/             # User settings
│   │   │   ├── stats/                # Analytics page
│   │   │   ├── timer/                # Workout timers
│   │   │   ├── auth/                 # Login/signup pages
│   │   │   └── onboarding/           # User onboarding flow
│   │   │
│   │   ├── api/                       # REST API (36 routes)
│   │   │   ├── auth/                 # Authentication
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── signup/route.ts
│   │   │   │
│   │   │   ├── workouts/             # Workout CRUD
│   │   │   │   ├── route.ts          # GET /workouts, POST /workouts
│   │   │   │   ├── [id]/route.ts     # GET/PUT/DELETE /workouts/:id
│   │   │   │   ├── [id]/complete/route.ts
│   │   │   │   ├── completions/route.ts
│   │   │   │   ├── stats/route.ts
│   │   │   │   └── scheduled/route.ts
│   │   │   │
│   │   │   ├── ai/                   # AI features
│   │   │   │   ├── generate-workout/route.ts
│   │   │   │   ├── enhance-workout/route.ts
│   │   │   │   ├── workout-of-the-day/route.ts
│   │   │   │   └── workout-of-the-week/route.ts
│   │   │   │
│   │   │   ├── stripe/               # Payments
│   │   │   │   ├── checkout/route.ts
│   │   │   │   ├── portal/route.ts
│   │   │   │   └── webhook/route.ts
│   │   │   │
│   │   │   ├── user/                 # User management
│   │   │   ├── body-metrics/         # Body metrics
│   │   │   ├── ocr/                  # OCR processing
│   │   │   ├── instagram-fetch/      # Instagram integration
│   │   │   └── admin/                # Admin tools
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   └── middleware.ts             # Security headers, caching
│   │
│   ├── components/                    # React components (82 total)
│   │   ├── ai/                       # AI feature components
│   │   │   ├── WorkoutGenerationForm.tsx
│   │   │   ├── WorkoutEnhancementForm.tsx
│   │   │   └── WorkoutOfTheDayCard.tsx
│   │   │
│   │   ├── auth/                     # Authentication UI
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── OAuthButtons.tsx
│   │   │
│   │   ├── workout/                  # Workout components
│   │   │   ├── WorkoutCard.tsx
│   │   │   ├── WorkoutList.tsx
│   │   │   ├── WorkoutForm.tsx
│   │   │   ├── ExerciseInput.tsx
│   │   │   └── WorkoutCalendar.tsx
│   │   │
│   │   ├── timer/                    # Timer components
│   │   │   ├── EMOMTimer.tsx
│   │   │   ├── AMRAPTimer.tsx
│   │   │   ├── TabataTimer.tsx
│   │   │   └── IntervalTimer.tsx
│   │   │
│   │   ├── subscription/             # Subscription UI
│   │   │   ├── PricingCard.tsx
│   │   │   └── UpgradePrompt.tsx
│   │   │
│   │   ├── layout/                   # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   └── ui/                       # shadcn UI base components
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── form.tsx
│   │       └── ...30+ components
│   │
│   ├── lib/                           # Utilities & business logic (41 files)
│   │   ├── ai/                       # AI orchestration
│   │   │   ├── bedrock-client.ts     # AWS Bedrock SDK wrapper
│   │   │   ├── workout-generator.ts  # AI workout generation logic
│   │   │   ├── workout-enhancer.ts   # AI enhancement logic
│   │   │   ├── usage-tracking.ts     # Token & cost tracking
│   │   │   └── timer-suggester.ts    # AI timer suggestions
│   │   │
│   │   ├── auth/                     # Authentication
│   │   │   ├── auth-options.ts       # NextAuth.js configuration
│   │   │   └── api-auth.ts           # API route authentication helpers
│   │   │
│   │   ├── database/                 # Data access layer
│   │   │   ├── dynamodb.ts           # DynamoDB client & helpers
│   │   │   ├── dynamodb-body-metrics.ts
│   │   │   └── prisma.ts             # Prisma client (NextAuth)
│   │   │
│   │   ├── stripe/                   # Payment integration
│   │   │   ├── stripe.ts             # Client-safe Stripe exports
│   │   │   └── stripe-server.ts      # Server-side Stripe logic
│   │   │
│   │   ├── rate-limit.ts             # Upstash Redis rate limiting
│   │   ├── logger.ts                 # Structured logging
│   │   ├── metrics.ts                # Business metrics tracking
│   │   ├── rbac.ts                   # Role-based access control
│   │   └── ...other utilities
│   │
│   ├── store/                         # Zustand state management
│   │   ├── workoutStore.ts           # Workout state
│   │   └── userStore.ts              # User state
│   │
│   ├── types/                         # TypeScript type definitions
│   │   ├── workout.ts
│   │   ├── user.ts
│   │   └── index.ts
│   │
│   └── timers/                        # Timer engine
│       ├── timer-engine.ts
│       └── timer-templates.ts
│
├── prisma/                            # Prisma ORM (NextAuth)
│   ├── schema.prisma                 # Database schema
│   └── migrations/                   # Migration history
│
├── docs/                              # Documentation (you are here!)
│   ├── COMPREHENSIVE-GUIDE.md        # This file
│   ├── ARCHITECTURE.md               # System architecture
│   ├── API-REFERENCE.md              # API documentation
│   ├── DATABASE.md                   # Database schema
│   ├── AUTHENTICATION.md             # Auth deep dive
│   ├── AI-INTEGRATION.md             # AI features explained
│   ├── FRONTEND.md                   # Frontend architecture
│   ├── DEVELOPMENT.md                # Dev setup
│   ├── USER-GUIDE.md                 # User documentation
│   └── ...existing docs
│
├── public/                            # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── tests/                             # Playwright E2E tests
│   └── e2e/
│
├── .env.example                       # Environment variable template
├── .env.local                         # Local environment (gitignored)
├── Dockerfile                         # Production container
├── docker-compose.yml                 # Local development
├── next.config.js                     # Next.js configuration
├── tailwind.config.ts                 # Tailwind CSS config
├── tsconfig.json                      # TypeScript config
└── package.json                       # Dependencies & scripts
```

---

## Learning Path for Junior Engineers

### Week 1: Understand the Foundation
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) - Get the big picture
2. Study [AUTHENTICATION.md](AUTHENTICATION.md) - Learn how users log in
3. Review [DATABASE.md](DATABASE.md) - Understand data storage

**Key Files to Read:**
- [src/lib/auth/auth-options.ts](../src/lib/auth/auth-options.ts)
- [src/lib/database/dynamodb.ts](../src/lib/database/dynamodb.ts)
- [src/middleware.ts](../src/middleware.ts)

### Week 2: Master the API Layer
1. Read [API-REFERENCE.md](API-REFERENCE.md) - Learn all 36 endpoints
2. Trace one request end-to-end (e.g., create workout)
3. Understand rate limiting and security

**Key Files to Read:**
- [src/app/api/workouts/route.ts](../src/app/api/workouts/route.ts)
- [src/lib/rate-limit.ts](../src/lib/rate-limit.ts)
- [src/lib/rbac.ts](../src/lib/rbac.ts)

### Week 3: Deep Dive into AI
1. Read [AI-INTEGRATION.md](AI-INTEGRATION.md) - Understand Bedrock
2. Study prompt engineering patterns
3. Learn token tracking and cost optimization

**Key Files to Read:**
- [src/lib/ai/bedrock-client.ts](../src/lib/ai/bedrock-client.ts)
- [src/lib/ai/workout-generator.ts](../src/lib/ai/workout-generator.ts)
- [src/lib/ai/usage-tracking.ts](../src/lib/ai/usage-tracking.ts)

### Week 4: Master the Frontend
1. Read [FRONTEND.md](FRONTEND.md) - React patterns and component architecture
2. Study state management (Zustand)
3. Understand form validation (React Hook Form + Zod)

**Key Files to Read:**
- [src/app/layout.tsx](../src/app/layout.tsx)
- [src/components/workout/WorkoutForm.tsx](../src/components/workout/WorkoutForm.tsx)
- [src/store/workoutStore.ts](../src/store/workoutStore.ts)

---

## Common Interview Questions (Prepared Answers)

### Architecture & Design

**Q: "Walk me through the system architecture of Kinex Fit."**

> "Kinex Fit is a full-stack TypeScript application built on Next.js 15 using the App Router. The architecture is a monolithic Next.js app deployed as a Docker container on AWS ECS Fargate.
>
> On the frontend, we use React 19 with server-side rendering for performance and SEO. The UI is built with Tailwind CSS and shadcn components for consistency.
>
> The backend is Next.js API routes that handle 36 RESTful endpoints. We use DynamoDB as the primary database for workout and user data because it scales infinitely and has flexible schemas for user-generated content. For authentication sessions, we use SQLite with Prisma since NextAuth.js requires a relational database.
>
> For AI features, we integrate with AWS Bedrock using Claude models. We chose Bedrock over OpenAI for two reasons: cost efficiency (~40% cheaper) and seamless AWS integration.
>
> Rate limiting is handled by Upstash Redis, which provides distributed rate limiting across our ECS instances. Payments are processed through Stripe with webhook-based subscription management.
>
> The app is containerized and deployed on ECS Fargate behind an Application Load Balancer with HTTPS termination."

**Q: "Why Next.js over a separate React frontend and Node.js backend?"**

> "Next.js gives us three key advantages:
>
> 1. **Developer Velocity:** We can share TypeScript types between client and server code, reducing bugs and duplication. API routes live next to the pages that consume them, making feature development faster.
>
> 2. **Performance:** Server-side rendering (SSR) gives us faster initial page loads and better SEO. We can use React Server Components to fetch data on the server without additional API calls.
>
> 3. **Deployment Simplicity:** One application to build, one Docker container to deploy, one service to monitor. For a small team, this monorepo approach is much easier to manage than separate frontend/backend repos.
>
> The trade-off is vendor lock-in to Vercel's patterns, but since we're deploying on AWS, we're using the open-source Next.js runtime and maintaining full control."

**Q: "Why DynamoDB instead of PostgreSQL or MySQL?"**

> "DynamoDB was chosen for three reasons:
>
> 1. **Scalability:** We can scale from 10 users to 10 million without database migrations or sharding. DynamoDB auto-scales based on traffic.
>
> 2. **Flexible Schema:** Workouts have variable structures (different exercises, sets, reps, timing). In SQL, we'd need complex JSON columns or multiple tables with joins. DynamoDB stores workout documents naturally.
>
> 3. **Cost Efficiency:** With on-demand pricing, we only pay for what we use. No idle database servers in the early stages.
>
> The trade-off is no complex joins or transactions. We denormalize data (e.g., storing user's subscription tier on every workout) to avoid multi-table queries. For analytics, we'd eventually add a read replica or data warehouse, but for now, single-table design works well."

### Security & Best Practices

**Q: "How do you secure the API endpoints?"**

> "We have multiple layers of security:
>
> 1. **Authentication:** Every protected endpoint uses NextAuth.js to verify the JWT session token. We extract the user ID from the session and validate it exists in DynamoDB.
>
> 2. **Authorization (RBAC):** We check the user's subscription tier against feature requirements. For example, AI generation endpoints verify the user hasn't exceeded their monthly quota.
>
> 3. **Rate Limiting:** We use Upstash Redis with three tiers:
>    - Login attempts: IP-based (10/hour) to prevent brute force
>    - API reads: 100 requests/minute per user
>    - AI requests: 30/hour per user (tier-dependent)
>
> 4. **Input Validation:** All request bodies are validated with Zod schemas. We never trust client input.
>
> 5. **Security Headers:** Middleware adds HSTS, CSP, X-Frame-Options, and X-Content-Type-Options headers to prevent XSS, clickjacking, and MIME sniffing.
>
> 6. **Idempotency:** Stripe webhook events are deduplicated using DynamoDB conditional writes to prevent double-processing.
>
> 7. **Environment Isolation:** Secrets are stored in AWS SSM Parameter Store, not in code or environment files."

**Q: "Walk me through how Stripe webhook handling works and why it's secure."**

> "Stripe webhooks notify us when subscription events happen (e.g., payment succeeded, subscription canceled). Here's the flow:
>
> 1. **Stripe sends a POST request** to `/api/stripe/webhook` with a JSON payload and a `stripe-signature` header.
>
> 2. **Signature Verification:** We use `stripe.webhooks.constructEvent()` to verify the signature using our webhook secret. This ensures the request actually came from Stripe, not an attacker.
>
> 3. **Idempotency Check:** We extract the event ID (e.g., `evt_123`) and try to write it to DynamoDB with a conditional expression: 'Only insert if this event ID doesn't already exist.'
>
> 4. **If Duplicate:** DynamoDB returns a conditional check failure. We return `200 OK` to Stripe (acknowledging receipt) but don't process the event.
>
> 5. **If New Event:** DynamoDB insert succeeds. We process the event (e.g., update user subscription tier) and return `200 OK`.
>
> This prevents double-charging users if Stripe retries a webhook due to network issues. The critical insight is using DynamoDB's atomic conditional writes as a distributed lock."

### AI & Machine Learning

**Q: "How does the AI workout generation work?"**

> "The AI workout generation uses AWS Bedrock with Claude Sonnet 4.5 as the default model. Here's the step-by-step process:
>
> 1. **User Input:** User enters a prompt like 'Give me a leg day workout.'
>
> 2. **Context Building:** We fetch the user's training profile from DynamoDB:
>    - Personal records (PRs) - e.g., squat 315lbs
>    - Equipment available - e.g., barbell, dumbbells
>    - Experience level - e.g., intermediate
>    - Goals - e.g., strength, hypertrophy
>    - Constraints - e.g., bad knees
>
> 3. **Prompt Engineering:** We construct a detailed prompt with:
>    - System message: 'You are an expert strength coach...'
>    - Training profile (cached for cost savings)
>    - User's request
>    - Output format specification (JSON schema)
>
> 4. **API Call:** Send to Bedrock with `converse()` API. We specify:
>    - Model: Claude Sonnet 4.5
>    - Max tokens: 4096
>    - Temperature: 0.7 (slightly creative but consistent)
>
> 5. **Response Parsing:** Claude returns structured JSON with exercises, sets, reps, weights, and rest periods.
>
> 6. **Token Tracking:** We log input/output tokens and calculate cost (Sonnet: $3 per 1M input tokens, $15 per 1M output tokens).
>
> 7. **Save Workout:** Store the generated workout in DynamoDB with `source: 'ai'` metadata.
>
> **Cost Optimization:**
> We use prompt caching for the training profile block. On the first request, we pay normal rates. On subsequent requests within 5 minutes, cached tokens are 90% cheaper. This saves ~50% on cost for repeat users."

**Q: "What if the AI hallucinates or generates an unsafe workout?"**

> "Great question. We have several safeguards:
>
> 1. **Prompt Engineering:** We explicitly instruct Claude to:
>    - Respect the user's experience level (don't give advanced exercises to beginners)
>    - Consider constraints (e.g., 'avoid overhead pressing if user has shoulder injury')
>    - Use appropriate weights based on PRs (e.g., if squat PR is 315lbs, don't program 405lbs)
>
> 2. **Human Review:** Every generated workout is shown to the user before they start. They can edit exercises, weights, or reps if something looks off.
>
> 3. **User Feedback Loop (Future):** We plan to add thumbs up/down feedback to flag bad generations and retrain prompts.
>
> 4. **Model Selection:** We use Claude Sonnet as the default because it's balanced. For premium features, we offer Claude Opus which is more accurate (but 5x more expensive).
>
> 5. **Disclaimer:** Our terms of service include a disclaimer that AI-generated workouts are suggestions, not medical advice. Users should consult professionals for personalized programming.
>
> In practice, Claude is remarkably good at fitness programming because it's trained on thousands of workout routines and understands periodization, progressive overload, and exercise selection."

### Frontend & State Management

**Q: "How do you manage global state in the app?"**

> "We use **Zustand** for global state management. It's a lightweight alternative to Redux with a much simpler API.
>
> **Why Zustand over Redux:**
> - No boilerplate (no actions, reducers, or dispatch)
> - TypeScript support out of the box
> - React 18 concurrent mode compatible
> - Only 1KB gzipped
>
> **What We Store:**
> - `workoutStore`: Current workout being edited, workout list cache
> - `userStore`: User profile, subscription tier, usage quotas
>
> **Example:**
> ```typescript
> // Define store
> const useWorkoutStore = create<WorkoutStore>((set) => ({
>   workouts: [],
>   addWorkout: (workout) => set((state) => ({
>     workouts: [...state.workouts, workout]
>   })),
> }));
>
> // Use in component
> const workouts = useWorkoutStore((state) => state.workouts);
> const addWorkout = useWorkoutStore((state) => state.addWorkout);
> ```
>
> **Why Not React Context?**
> Context causes unnecessary re-renders. Every component using the context re-renders when *any* value changes. Zustand only re-renders components that subscribe to the specific state slice that changed."

**Q: "How do forms work in the app?"**

> "We use **React Hook Form** with **Zod** for validation. Here's why:
>
> **React Hook Form:**
> - Uncontrolled components (better performance than controlled)
> - Built-in error handling
> - Easy integration with UI libraries (we use shadcn)
>
> **Zod:**
> - TypeScript-first schema validation
> - Share validation logic between client and server
> - Excellent error messages
>
> **Example: Workout Creation Form**
> ```typescript
> // 1. Define Zod schema
> const workoutSchema = z.object({
>   title: z.string().min(1, 'Title required'),
>   exercises: z.array(z.object({
>     name: z.string().min(1),
>     sets: z.number().min(1),
>     reps: z.number().min(1),
>   })),
> });
>
> // 2. Infer TypeScript type
> type WorkoutInput = z.infer<typeof workoutSchema>;
>
> // 3. Use in form
> const { register, handleSubmit, formState: { errors } } = useForm<WorkoutInput>({
>   resolver: zodResolver(workoutSchema),
> });
>
> // 4. Server-side validation (same schema!)
> const body = workoutSchema.parse(await req.json());
> ```
>
> **Key Benefit:** The same Zod schema validates on both client (instant feedback) and server (security). No duplication, no drift between frontend and backend validation."

### DevOps & Deployment

**Q: "Walk me through the deployment process."**

> "Our deployment is fully containerized using Docker and AWS ECS Fargate:
>
> **1. Build Phase:**
> - Run `npm run build` to create Next.js production build
> - Next.js standalone output mode bundles only necessary files (~50MB vs ~500MB)
> - Prisma generates database client for NextAuth
>
> **2. Docker Image:**
> - Multi-stage build:
>   - Stage 1: Install dependencies and build
>   - Stage 2: Copy only production files to Alpine Node.js base (~150MB final image)
> - Push to AWS ECR (Elastic Container Registry)
>
> **3. ECS Task Definition:**
> - Define container specs: 1 vCPU, 2GB RAM
> - Environment variables from AWS SSM Parameter Store
> - Health check: `GET /api/health`
>
> **4. Deployment:**
> - Update ECS service with new task definition
> - Rolling update: Start new tasks, drain old tasks
> - Load balancer health checks ensure zero downtime
>
> **5. Monitoring:**
> - CloudWatch Logs: Application logs, API request logs
> - CloudWatch Metrics: CPU, memory, request count
> - Alarms: High error rate, high response time
>
> **Rollback:**
> If new version fails health checks, ECS automatically rolls back to previous task definition. We can also manually revert by updating the service to an older task revision."

**Q: "How do you handle environment variables and secrets?"**

> "We use **AWS Systems Manager (SSM) Parameter Store** for all secrets:
>
> **Why SSM over .env files:**
> - Secrets never stored in code or Docker images
> - Automatic encryption at rest (KMS)
> - Audit logging (who accessed what secret when)
> - IAM-based access control
> - Versioning and rotation support
>
> **How It Works:**
> 1. Store secret in SSM: `aws ssm put-parameter --name /kinexfit/prod/STRIPE_SECRET_KEY --value sk_live_...`
> 2. Grant ECS task IAM permission: `ssm:GetParameter`
> 3. ECS task definition references parameter: `valueFrom: /kinexfit/prod/STRIPE_SECRET_KEY`
> 4. Container starts with secret as environment variable
>
> **Local Development:**
> Use `.env.local` (gitignored) with test credentials. Never commit secrets to Git.
>
> **Rotation:**
> When we rotate a secret (e.g., new Stripe key), we update the SSM parameter and deploy a new ECS task. No code changes needed."

---

## Key Technical Decisions (Why We Built It This Way)

### 1. Monorepo (Next.js Full-Stack) vs Separate Frontend/Backend

**Decision:** Single Next.js application with API routes

**Pros:**
- Shared TypeScript types reduce bugs
- Faster development (no API versioning, no CORS)
- Single deployment pipeline
- SSR + API in one container

**Cons:**
- Can't scale frontend and backend independently (but ECS Fargate auto-scales both)
- Harder to migrate to microservices later (but premature optimization)

**Why This Was Right:**
For a solo developer (with AI assistance) building an MVP, velocity matters more than theoretical scalability. We can handle 10,000+ users before this becomes a bottleneck.

---

### 2. DynamoDB vs PostgreSQL

**Decision:** DynamoDB for primary data, SQLite for NextAuth sessions

**Pros:**
- Infinite scalability without sharding
- Flexible schema (workouts have variable structures)
- Pay-per-use pricing (cheap at low scale)
- AWS integration (same IAM, same VPC)

**Cons:**
- No SQL joins (have to denormalize data)
- No complex analytics queries (would need data warehouse later)
- Harder to debug (no SQL console to write ad-hoc queries)

**Why This Was Right:**
Workouts are naturally document-shaped. A workout has exercises, sets, reps, etc.—that's a JSON document, not a relational table. DynamoDB's single-table design works perfectly for this.

**Example:**
```json
{
  "id": "workout-123",
  "userId": "user-456",
  "title": "Leg Day",
  "exercises": [
    { "name": "Squat", "sets": 5, "reps": 5, "weight": "315lbs" },
    { "name": "RDL", "sets": 3, "reps": 8, "weight": "225lbs" }
  ],
  "createdAt": "2025-01-09T12:00:00Z"
}
```

In SQL, this would require `workouts`, `exercises`, and `workout_exercises` tables with foreign keys. In DynamoDB, it's one item.

---

### 3. AWS Bedrock vs OpenAI

**Decision:** AWS Bedrock (Claude models)

**Pros:**
- Cost: ~40% cheaper than OpenAI GPT-4
- Integration: Same AWS account, IAM roles, VPC
- Prompt caching: 90% discount on repeated context (huge savings)
- Privacy: Data stays in our AWS account

**Cons:**
- Fewer models (only Claude, no GPT-4, Gemini)
- Less ecosystem tooling (LangChain, etc.)
- AWS-only (can't easily migrate to Google Cloud)

**Why This Was Right:**
Claude Sonnet is excellent at fitness programming and costs $3/1M input tokens vs GPT-4's $5/1M. For our use case (generating workouts), Claude is just as good and 40% cheaper.

---

### 4. NextAuth.js vs Custom Auth

**Decision:** NextAuth.js with JWT sessions

**Pros:**
- OAuth providers out of the box (Google, Facebook; Apple required for iOS)
- CSRF protection built-in
- Session management (refresh, expiration)
- Prisma adapter for database sessions

**Cons:**
- Can't revoke JWT sessions immediately (must wait for expiration)
- More complex than simple username/password
- Locked into NextAuth patterns

**Why This Was Right:**
Building OAuth from scratch is risky (easy to get wrong). NextAuth is battle-tested and handles edge cases (token refresh, email verification, etc.). The trade-off of JWT vs database sessions is acceptable (we use 30-day expiration).

---

### 5. Stripe vs Custom Payment Processing

**Decision:** Stripe for all payments

**Pros:**
- PCI compliance handled by Stripe
- Subscription management (trials, upgrades, cancellations)
- Customer portal (users manage their own billing)
- Webhook-based automation

**Cons:**
- 2.9% + $0.30 per transaction fee
- Vendor lock-in (hard to migrate to another processor)

**Why This Was Right:**
Building payment processing is extremely risky (PCI compliance, fraud detection, chargeback handling). Stripe's 2.9% fee is worth it for avoiding security nightmares.

---

### 6. Upstash Redis vs In-Memory Rate Limiting

**Decision:** Upstash Redis for distributed rate limiting

**Pros:**
- Works across multiple ECS instances
- Serverless (pay-per-request)
- Sliding window algorithm (precise rate limiting)

**Cons:**
- External dependency (Redis must be up)
- Network latency on every request
- Costs money (vs free in-memory)

**Why This Was Right:**
In-memory rate limiting doesn't work when you have multiple ECS tasks (different servers). If user makes 5 requests to Task A and 5 to Task B, in-memory counters would allow 10 requests when the limit is 5. Upstash solves this with shared state.

---

## Diagrams

Full architecture diagrams are generated in separate files:

- **[System Architecture](ARCHITECTURE.md#system-architecture-diagram)** - High-level component diagram
- **[Data Flow](ARCHITECTURE.md#data-flow-diagrams)** - Request/response flows
- **[Database ERD](DATABASE.md#entity-relationship-diagram)** - Data model relationships
- **[User Flows](USER-GUIDE.md#user-journey-diagrams)** - Onboarding, workout creation
- **[Deployment Architecture](DEPLOYMENT.md#infrastructure-diagram)** - AWS infrastructure

*(Note: These will be created using the MCP diagram generation tool in subsequent documentation files)*

---

## Next Steps

### For Learning the Codebase:
1. **Read:** [ARCHITECTURE.md](ARCHITECTURE.md) - System overview
2. **Read:** [AUTHENTICATION.md](AUTHENTICATION.md) - How login works
3. **Read:** [DATABASE.md](DATABASE.md) - How data is stored
4. **Read:** [API-REFERENCE.md](API-REFERENCE.md) - All API endpoints
5. **Read:** [AI-INTEGRATION.md](AI-INTEGRATION.md) - How AI works
6. **Read:** [FRONTEND.md](FRONTEND.md) - React components

### For Using the App:
1. **Read:** [USER-GUIDE.md](USER-GUIDE.md) - Full user documentation

### For Contributing:
1. **Read:** [DEVELOPMENT.md](DEVELOPMENT.md) - Local setup
2. **Read:** [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment process

---

## Support & Contact

- **Issues:** GitHub Issues (private repo)
- **Email:** support@kinexfit.com
- **Documentation Feedback:** Open an issue with `[DOCS]` prefix

---

## Acknowledgments

**Built by:** A fitness enthusiast learning to code
**Built with:** Claude (Anthropic's AI)
**Built for:** Anyone who wants a smarter gym partner

> "This app exists because I wanted to turn my Instagram saves into actual progress. If you're reading this as a potential acquirer, investor, or senior engineer, I hope this documentation shows not just what we built, but *how* and *why* we built it. Every decision was intentional. Every feature solves a real problem I faced in the gym."

---

**Let's build something amazing. 💪**
