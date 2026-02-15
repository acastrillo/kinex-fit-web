# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working with This Project

**IMPORTANT**: This project has MCP (Model Context Protocol) servers configured. When working on tasks, prefer using MCP tools over bash commands when available, as they provide:
- Better error handling and structured responses
- Direct integration with external services (AWS, GitHub, Docker, n8n, shadcn/ui)
- Reduced need for environment variable management
- More reliable authentication handling

Check available MCP tools at the start of relevant tasks (infrastructure changes, GitHub operations, UI component work, etc.) and use them when they fit the task better than standard CLI commands.

## Using Specialized Agents

This project has specialized AI agents for different types of tasks. **When starting any non-trivial task, consult the [Agent Guide](../../docs/agents/AGENT-GUIDE.md) to determine which agent(s) to use.**

**Quick Agent Reference:**
- **nextjs-developer** - Next.js pages, Server Components, performance, SEO
- **react-specialist** - React patterns, hooks, performance optimization
- **typescript-pro** - TypeScript errors, type safety, build configuration
- **ui-designer** - UI components, design systems, accessibility
- **ux-researcher** - User flows, usability, journey mapping
- **business-analyst** - Requirements, user stories, feature planning
- **security-reviewer** - Security audits, authentication, vulnerability assessment
- **fitness-branding-strategist** - Brand voice, marketing, positioning

**See [docs/agents/AGENT-GUIDE.md](../../docs/agents/AGENT-GUIDE.md) for detailed guidance on when to use each agent and how they collaborate.**

## Project Overview

Kinex Fit is a fitness tracking application built with Next.js 15.5.7, React 19.1.0, and TypeScript. It's designed to let users save Instagram workouts, upload workout screenshots, and track progress with OCR and AI features.

**Current Status**: v1.5 - Production deployment on AWS with:
- **Authentication**: NextAuth.js (Google, Facebook, Email/Password)
- **Database**: DynamoDB for workouts, users, and body metrics (production), SQLite/Prisma for development
- **Infrastructure**: ECS Fargate, ALB with HTTPS, Route53 DNS
- **Domain**: https://kinexfit.com
- **Phases 1-6 Complete**: Full app with monetization and AI features ready
- **Development Strategy**: Multi-platform (Web, Android, iOS) with shared backend

**Completed Phases** (January 2025):
- ✅ **Phase 1**: DynamoDB workout persistence with cross-device sync
- ✅ **Phase 2**: Calendar & Scheduling with workout status tracking
- ✅ **Phase 3**: Smart Timers (Interval, HIIT, Rest Timer widget)
- ✅ **Phase 4**: Enhanced Stats & PRs tracking with body metrics
- ✅ **Phase 5**: Stripe integration with subscription tiers (Free, Core $8.99, Pro $13.99, Elite $24.99)
- ✅ **Phase 6**: AI-powered features (Completed December 26, 2025)
  - AWS Bedrock client infrastructure with Claude Sonnet 4.5
  - Smart Workout Parser with AI enhancement
  - Training Profile system
  - AI Workout Generator
  - Workout of the Day (WOD)

**Recent Features** (December 2024):
- ✅ **AMRAP Workouts**: As Many Rounds As Possible workout type with time limits
- ✅ **Workout Notes**: Add notes when completing workouts
- ✅ **Card Carousel UX**: Research-based swipeable workout session view
- ✅ **Security Patch**: React2Shell vulnerability (CVE-2025-55182) fixed

**Next Development Priorities**:
1. 🎯 **Complete Phase 6**: Finish AI-powered features (60% remaining)
2. 📱 **Android App**: Native Kotlin app with Instagram share sheet integration (90-day timeline)
3. 🍎 **iOS App**: Native Swift app (after Android launch)

## Development Commands

```bash
# Start development server
npm run dev

# Build for production (includes TypeScript checking and ESLint)
npm run build

# Start production server
npm run start

# Run ESLint for code quality
npm run lint

# Type checking (configured to fail builds on errors)
npx tsc --noEmit

# Database commands
npm run prisma           # Prisma CLI access
npm run db:push          # Push schema to database
npm run db:generate      # Generate Prisma client
npm run db:seed:user     # Seed user data

# UI Components (shadcn/ui)
npx shadcn@latest add [component-name]   # Add new UI components
```

## Architecture Overview

### Key Technologies
- **Framework**: Next.js 15.5.7 with App Router and Turbopack dev mode
- **UI**: React 19.1.0 with TypeScript 5.x, Tailwind CSS 3.4.17
- **Database**: DynamoDB (production), SQLite with Prisma ORM 6.16.1 (development)
- **Authentication**: NextAuth.js 4.24.7 with Google/Facebook/Email providers
- **State**: Zustand 5.0.8 wrapping NextAuth session
- **Build**: Standalone output mode configured for containerization
- **Deployment**: Docker on AWS ECS Fargate
- **Charts**: Recharts 3.2.1 for data visualization
- **Payments**: Stripe 19.1.0 with @stripe/stripe-js 8.0.0
- **AI**: AWS Bedrock Runtime 3.916.0 with Claude Sonnet 4.5

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes
  - `add/` - Add workout functionality with edit mode
  - `api/` - API routes (health, workouts, body-metrics, ocr, instagram-fetch, auth)
  - `auth/` - Authentication pages
  - `calendar/` - Calendar view page
  - `library/` - Workout library page
  - `settings/` - User settings page
  - `stats/` - Stats pages (PRs, body metrics)
  - `workout/[id]/` - Dynamic workout detail pages with edit mode
  - `exercise/[name]/` - Individual exercise tracking pages
- `src/components/` - Reusable React components
  - `auth/` - Authentication components
  - `layout/` - Layout components (header, mobile navigation)
  - `providers/` - Context providers (session-provider)
  - `ui/` - Base UI components (shadcn/ui style)
- `src/store/` - Zustand state management
  - `index.ts` - Auth store wrapping NextAuth.js session
- `src/lib/` - Utility functions and shared logic
  - `dynamodb.ts` - DynamoDB client with workout, user, and body metrics CRUD operations
  - `db.ts` - Prisma client (dev mode)
  - `auth-options.ts` - Shared NextAuth configuration
  - `workout/` - Workout data transformation utilities
  - `exercise-history.ts` - Exercise extraction and analysis
  - `pr-calculator.ts` - PR detection and 1RM calculations (7 formulas)
  - `body-metrics.ts` - Body metrics utilities
  - `igParser.ts` & `igParser_toV1.ts` - Instagram parsing logic
  - `smartWorkoutParser.ts` - Enhanced workout parsing logic
  - `editable-workout-table.tsx` - Complex table component
  - `utils.ts` - Common utilities (cn function for className merging)

### Database Architecture

**Production (DynamoDB)**:
- `src/lib/dynamodb.ts` - DynamoDB client with CRUD operations
- **spotter-users** table: User data with subscription and quota tracking
  - Partition Key: `userId`
  - Attributes: email, firstName, lastName, subscriptionTier, scanQuotaUsed, ocrQuotaUsed, instagramImportsUsed, etc.
- **spotter-workouts** table: Workout data with cross-device sync
  - Partition Key: `userId` (enables per-user queries)
  - Sort Key: `workoutId` (unique workout identifier)
  - Attributes: title, description, exercises[], content, source, type, difficulty, tags[], timestamps
- **spotter-body-metrics** table: Body metrics tracking
  - Partition Key: `userId`
  - Sort Key: `date` (ISO date: YYYY-MM-DD)
  - Attributes: weight, bodyFatPercentage, muscleMass, 8 body measurements (chest, waist, hips, thighs, arms, calves, shoulders, neck), unit (metric/imperial), notes, photoUrls[]
- All dates stored as ISO strings (not Date objects)
- Auto-sync to DynamoDB on user login via NextAuth callbacks

**Development (SQLite/Prisma)**:
- **User** model with fields:
  - Standard: id, email, firstName, lastName, password, emailVerified, image
  - Subscription: subscriptionTier (free/core/pro/elite), subscriptionStatus, Stripe IDs
  - Usage tracking: scanQuotaUsed (monthly combined scans), ocrQuotaUsed/instagramImportsUsed (per-source analytics), workoutsSaved
- **Account**, **Session**, **VerificationToken** - NextAuth.js models
- Database URL configured via `DATABASE_URL` environment variable
- User seeding script at `scripts/seed-user.mjs`

### Authentication System
Uses NextAuth.js with Google, Facebook, Email/Password, and **Apple Sign-In required for iOS (pending)**:
- Configuration in `src/lib/auth-options.ts` (shared for all routes)
- Route handler in `src/app/api/auth/[...nextauth]/route.ts`
- Providers: Google, Facebook, Credentials (email/password), Apple (to add for iOS)
- JWT session strategy with 30-day session expiration
- Cookie configuration: httpOnly, sameSite: "lax", secure in production
- Custom callbacks:
  - **signIn/jwt callbacks**: Sync users to DynamoDB, preserve subscription data
  - **session callback**: Shapes user object with subscription tier and quota info
- Environment variables required:
  - `AUTH_SECRET`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
  - Apple Sign-In (planned): `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_KEY_ID`, `APPLE_TEAM_ID`
  - `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM`
  - `DYNAMODB_USERS_TABLE`, `DYNAMODB_WORKOUTS_TABLE`, `DYNAMODB_BODY_METRICS_TABLE`
- `useAuthStore` in `src/store/index.ts` wraps NextAuth session for client state
- Custom dark-themed sign-in page at `/auth/login`

### Styling System
- **Tailwind CSS** with custom dark theme using CSS custom properties
- **shadcn/ui** configured with "new-york" style, no RSC (`components.json`)
- **Custom color palette** for fitness app:
  - Background: Dark navy (via `--background`)
  - Primary: Cyan accent (via `--primary`)
  - Secondary: Purple accent (via `--secondary`)
  - Rest: Amber accent (via `--rest-color`)
  - Surface levels with elevation support
- **Path aliases**: `@/components`, `@/lib/utils`, `@/ui`, `@/hooks`
- **Animations**: Custom keyframes for fade-in, slide-up, and bounce effects

## Development Guidelines

### Code Quality
- **TypeScript**: Strict mode enabled with target ES2017
- **Build enforcement**: Currently `ignoreDuringBuilds: true` and `ignoreBuildErrors: true` for production deployment (to be tightened)
- **ESLint rules** (all set to "warn"):
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unused-vars`
  - `@typescript-eslint/no-empty-object-type`
  - `react/no-unescaped-entities`
  - `react-hooks/exhaustive-deps`
  - `prefer-const`
- **Path aliases**: `@/*` maps to `./src/*` for clean imports
- **Next.js 15 Requirements**:
  - Dynamic route params are async (must await `params` in route handlers)
  - Route handlers only export GET, POST, etc. (no custom exports like `authOptions`)
  - NextAuth configuration must be in a separate file for `getServerSession()` to work

### API Routes
Located in `src/app/api/`:
- `/api/health` - Health check endpoint
- `/api/workouts` - GET (list workouts), POST (create workout)
- `/api/workouts/[id]` - GET (get workout), PATCH (update), DELETE (delete)
- `/api/workouts/[id]/schedule` - PATCH (schedule workout), DELETE (unschedule)
- `/api/workouts/[id]/complete` - POST (mark workout as completed)
- `/api/workouts/scheduled` - GET (list scheduled workouts, optional ?date=YYYY-MM-DD)
- `/api/body-metrics` - GET (list metrics), POST (create metric)
- `/api/body-metrics/[date]` - GET (get metric), PATCH (update), DELETE (delete)
- `/api/body-metrics/latest` - GET (get most recent metric)
- `/api/ocr` - OCR processing (Tesseract.js integration)
- `/api/instagram-fetch` - Instagram content extraction
- `/api/upload-image` - S3 image upload endpoint
- `/api/ingest` - Data ingestion endpoint
- `/api/auth/[...nextauth]` - NextAuth.js authentication endpoints

### Page Structure
Next.js App Router pages in `src/app/`:
- `/` - Home page
- `/auth/login` - Authentication login page
- `/add` - Add workout functionality with edit mode
- `/library` - Workout library page
- `/calendar` - Calendar view page
- `/timer` - Workout timers (interval & HIIT)
- `/settings` - User settings page
- `/stats/prs` - Personal records tracking page
- `/stats/metrics` - Body metrics tracking page
- `/workout/[id]` - Dynamic workout detail pages with edit mode and rest timer
- `/exercise/[name]` - Individual exercise performance tracking

### External Integrations
- **AWS Textract**: Server-side OCR via `/api/ocr`
- **AWS SDK**: S3 integration (`@aws-sdk/client-s3`) for image storage
- **Instagram**: Custom parser (`igParser.ts`) for workout content extraction
- **NextAuth.js**: Session management (Google/Facebook/credentials)
- **Form Handling**: React Hook Form with Zod validation and Hookform resolvers
- **Icons**: Lucide React for consistent iconography
- **Charts**: Recharts for data visualization (line, bar, area charts)
- **Apify**: Instagram scraping (requires `APIFY_API_TOKEN`)

## Key Features & Data Flow

### Authentication Flow
1. User selects Google/Facebook OAuth or Email/Password
2. OAuth providers redirect back to NextAuth callback (credentials validated server-side)
3. NextAuth callbacks sync the user to DynamoDB
4. Session callback shapes user object with subscription tier and quota info
5. `useAuthStore` provides auth state via `useSession` hook

### Workout Data Processing
- Instagram content parsing via custom `igParser.ts` and `igParser_toV1.ts`
- AST (Abstract Syntax Tree) to workout data transformation
- Editable workout table component for data manipulation
- OCR processing for workout images via Tesseract.js and AWS Textract
- Exercise extraction and categorization by muscle group

### Workout Persistence & Sync (Phase 1 - Complete)
- Full CRUD operations via `dynamoDBWorkouts` service layer:
  - `list(userId)` - Get all user workouts
  - `get(userId, workoutId)` - Get specific workout
  - `upsert(userId, workout)` - Create or update workout
  - `update(userId, workoutId, updates)` - Partial update
  - `delete(userId, workoutId)` - Delete workout
  - `getByDateRange(userId, startDate, endDate)` - Query by date
  - `search(userId, searchTerm)` - Search workouts
- Cross-device synchronization with userId as partition key
- Offline support with localStorage cache as fallback
- API routes at `/api/workouts` and `/api/workouts/[id]`
- Frontend pages updated to use DynamoDB:
  - `src/app/add/edit/page.tsx` - Save to DynamoDB
  - `src/app/library/page.tsx` - Load from DynamoDB
  - `src/app/workout/[id]/page.tsx` - Fetch from DynamoDB

### Workout Scheduling (Phase 2 - Complete)
- Schedule workouts for future dates
- Mark workouts as completed on specific dates
- Track workout status (scheduled, completed, skipped)
- Full scheduling API via `dynamoDBWorkouts` service layer:
  - `getScheduledForDate(userId, date)` - Get workouts for specific date
  - `getScheduled(userId)` - Get all scheduled workouts
  - `scheduleWorkout(userId, workoutId, scheduledDate, status)` - Schedule a workout
  - `completeWorkout(userId, workoutId, completedDate)` - Mark as completed
  - `unscheduleWorkout(userId, workoutId)` - Remove scheduling
- Visual calendar indicators:
  - Scheduled workouts: Hollow ring (purple/secondary)
  - Completed workouts: Filled dot/badge (cyan/primary)
  - Combined view showing both states
- API routes: `/api/workouts/[id]/schedule`, `/api/workouts/[id]/complete`, `/api/workouts/scheduled`
- Library page integration for scheduling via date picker

### Personal Records Tracking (Phase 4 - Complete)
- Automatic PR detection across all workouts
- 7 different 1RM calculation formulas:
  - Brzycki, Epley, Lander, Lombardi, Mayhew, O'Conner, Wathan
- Exercise history extraction and analysis
- Volume tracking (weight × reps) by exercise
- Muscle group categorization (Chest, Back, Shoulders, Arms, Legs, Core)
- Exercise detail pages with progression charts
- Located in `src/lib/pr-calculator.ts` and `src/lib/exercise-history.ts`

### Body Metrics Tracking (Phase 4 - Complete)
- Full CRUD operations via `dynamoDBBodyMetrics` service layer:
  - `list(userId)` - Get all metrics
  - `get(userId, date)` - Get specific metric
  - `upsert(userId, metric)` - Create or update metric
  - `delete(userId, date)` - Delete metric
  - `getByDateRange(userId, startDate, endDate)` - Query by date range
  - `getLatest(userId)` - Get most recent metric
- Support for weight, body fat %, muscle mass, and 8 body measurements
- Metric/imperial unit support
- Progress photos via S3 URLs
- Progression charts with 30/90-day trends
- API routes at `/api/body-metrics` with date-based endpoints

### Smart Workout Timers (Phase 3 - Complete)
- **Interval Timer**: Basic countdown timer with circular progress visualization
  - Custom durations (1-60 minutes)
  - Start/pause/reset controls
  - Sound & notification toggles
  - LocalStorage state persistence
- **HIIT Timer**: High-Intensity Interval Training timer
  - Work/rest phase alternation
  - Round counting (1-50 rounds)
  - Built-in presets (Tabata, EMOM, Long Intervals, Sprint Intervals)
  - Custom configuration panel
  - Phase indicators (GET READY, WORK, REST)
  - Color-coded progress bars
- **Rest Timer Widget**: Floating rest timer for workout pages
  - Quick-start presets (30s, 1m, 1m 30s, 2m, 3m, 5m)
  - Fixed bottom-right positioning
  - Compact collapsed state
  - Integrated into workout detail pages
- **Web Audio API**: Generated beeps (no audio files required)
- **Web Notifications**: Background alerts when timer completes
- **Timer Page**: Dedicated page at `/timer` with tab selector
- **Mobile Nav**: Timer link in mobile navigation

### AMRAP Workouts (December 2024)
- **Manual Creation**: Select AMRAP type and time limit (1-120 min) when creating workouts
- **Session View**: Specialized AMRAP workout session with:
  - Round counting and tracking
  - Time limit countdown timer
  - Block navigation for multi-block AMRAPs
  - Exercise list with sets/reps display
  - Automatic round increment on block completion
- **Display Components**:
  - AMRAP timer card showing time limit and elapsed time
  - Block navigator for multi-block workouts
  - Exercise list optimized for AMRAP format
  - Block transition dialog
- **Type Definitions**: Full TypeScript support in `src/types/amrap.ts`
- **Migration Support**: Backward compatibility with `src/lib/amrap-migration.ts`

### Workout Completion Features (December 2024)
- **Workout Notes**: Add notes when marking workouts complete
- **Completion Tracking**: Track completion dates and status
- **Card Carousel**: Swipeable card-based workout session view
  - Research-based UX design
  - Smooth gesture controls
  - Progress indicators
  - Exercise-by-exercise navigation

### Subscription & Usage Tracking (Phase 5 - Complete)
- Tiered subscription model with Stripe integration:
- **Free**: Unlimited workouts, limited scans, 1 AI request/month, 90-day history, basic stats
- **Core** ($8.99/mo or $69.99/year): Unlimited workouts, 12 scans/month, 10 AI requests/month
- **Pro** ($13.99/mo or $109.99/year): 60 scans/month, 30 AI requests/month, advanced analytics, templates, exports
- **Elite** ($24.99/mo or $199.99/year): 120 scans/month, 100 AI requests/month, priority support, early access, custom templates, workout sharing
- Stripe integration via `stripeCustomerId` and `stripeSubscriptionId` fields
- Usage tracking: `scanQuotaUsed`, `ocrQuotaUsed`, `instagramImportsUsed`, `workoutsSaved`, `aiRequestsUsed`
- Feature gating implemented in `src/lib/feature-gating.tsx`
- Subscription management UI at `/subscription`
- Webhook handling for subscription events at `/api/stripe/webhook`

### AI-Powered Features (Phase 6 - 40% Complete)

**Architecture**:
- Amazon Bedrock (Claude Sonnet 4.5 - `anthropic.claude-sonnet-4-5-20250514`) for AI processing
- Cost: ~$0.01 per enhancement (~1,500 tokens), ~$0.02 per generation (~3,000 tokens)
- Usage quotas by tier to manage costs
- Prompt caching for 90% cost savings on repeated context
- Streaming responses for real-time UI updates

**Completed Features**:

1. **AWS Bedrock Client Infrastructure** ✅
   - Singleton Bedrock client with automatic credential detection
   - Non-streaming (`invokeClaude`) and streaming (`invokeClaudeStream`) invocation
   - Automatic cost calculation and usage logging
   - File: `src/lib/ai/bedrock-client.ts` (298 lines)
   - Helper functions: `isBedrockConfigured()`, `estimateCost()`, `logUsage()`

2. **Smart Workout Parser** ✅
   - Clean up messy OCR text and social media imports
   - Standardize exercise names (e.g., "benchpress" → "bench press")
   - Suggest weights based on user PRs (70-85% of 1RM)
   - Add form cues and safety tips
   - Parse unstructured workout descriptions into structured data
   - API: `/api/ai/enhance-workout`
   - File: `src/lib/ai/workout-enhancer.ts` (330 lines)
   - Supports training context for personalized suggestions

**Features In Progress**:

3. **Training Profile** 🚧 (4-6 hours remaining)
   - Manual PR entry for exercises
   - Training goals, preferences, equipment
   - Experience level, constraints
   - Page: `/settings/training-profile`
   - API: `/api/user/profile`
   - DynamoDB: Add `trainingProfile` to `spotter-users` table

4. **AI Workout Generator** 🚧 (8-10 hours remaining)
   - Natural language input: "Upper body, dumbbells, 45 minutes"
   - Personalized based on training profile and PRs
   - Complete workout with warm-up, exercises, cool-down
   - Page: `/add/generate`
   - API: `/api/ai/generate-workout`
   - File: `src/lib/ai/workout-generator.ts` (planned)

5. **Workout of the Day** 🚧 (6-8 hours remaining)
   - Daily workout suggestion on dashboard
   - Free: Generic WOD (same for everyone)
   - Pro/Elite: Personalized WOD based on history and PRs
   - Generated via n8n automation or Lambda
   - API: `/api/wod`
   - DynamoDB: New `spotter-wod` table

**AI Cost Management**:
- Core: $0.10/user/month (10 enhancements)
- Pro: $0.90/user/month (30 enhancements + 30 generations)
- Elite: $3.00/user/month (100 enhancements + 100 generations + AI Coach)
- Profit margins remain 70-85% with AI features

### Multi-Platform Development Strategy

**Three Independent Projects**:
1. **Web App** (This repo) - Add AI features (Phase 6)
2. **Android App** (NEW) - Native Kotlin with Instagram share sheet
3. **iOS App** (Later) - Native Swift with Instagram share sheet

**Shared Backend**: All platforms use the same AWS infrastructure:
- DynamoDB (workouts, users, body metrics)
- NextAuth.js (Google/Facebook/Email authentication)
- AWS Textract (OCR)
- Stripe (subscriptions sync across platforms)
- API endpoints via Next.js on ECS Fargate

**Development Priority**:
1. **Android First** (Next 90 days) - Native app with share sheet integration
2. **Web AI Features** (After Android MVP) - Phase 6 implementation
3. **iOS** (Month 7+) - Port Android features to iOS

**Android Killer Feature**:
- Native share intent handler intercepts Instagram shares
- 2-tap workflow: Share from Instagram → Open Kinex Fit
- Automatic OCR processing and workout parsing
- Offline-first with Room database and background sync

## Production Considerations

### Deployment Configuration
- **Next.js**: Standalone output mode configured for containerization
- **Images**: Configured for production domain `kinexfit.com`
- **Docker**: Dockerfile and docker-compose.yml available for containerization
- **AWS**: Deployment scripts available (`deploy-to-aws.ps1`)
- **Environment**: See `.env.example` for required variables

### Testing
No test framework currently configured. When adding tests, consider:
- Jest + React Testing Library for unit tests
- Playwright or Cypress for E2E tests
- CI/CD pipeline with test automation

## Documentation

**Architecture & Development**:
- **data/docs/README.md** - Project overview, getting started, tech stack, deployment
- **data/docs/ARCHITECTURE.md** - System architecture, design decisions, technical deep-dive
- **data/docs/HOW-TO-GUIDE.md** - Complete user and developer guide
- **data/docs/PROJECT-STATE.md** - Current state, MVP roadmap, north star goals
- **data/docs/ROADMAP.md** - Detailed phase-by-phase development roadmap
- **docs/DEPLOYMENT-SUMMARY.md** - AWS deployment procedures and troubleshooting

**Phase Implementation Guides**:
- **data/docs/PHASE-1-IMPLEMENTATION.md** - DynamoDB persistence with cross-device sync (✅ Complete)
- **data/docs/PHASE-2-CALENDAR-IMPLEMENTATION.md** - Calendar & Scheduling system (✅ Complete)
- **data/docs/PHASE-3-TIMERS-IMPLEMENTATION.md** - Smart Timers (Interval, HIIT, Rest) (✅ Complete)
- **data/docs/PHASE-4-IMPLEMENTATION.md** - Stats & PRs tracking with body metrics (✅ Complete)
- **data/docs/PHASE-5-MONETIZATION.md** - Stripe integration and subscription tiers (✅ Complete)
- **data/docs/PHASE-6-AI-FEATURES.md** - AI-powered features specification
- **data/docs/PHASE-6-PROGRESS.md** - Phase 6 implementation (✅ Complete - Dec 26, 2025)

**Feature Documentation**:
- **docs/features/amrap-manual-creation.md** - AMRAP workout type implementation

**Agent Documentation** (for Claude Code specialized agents):
- **📘 docs/agents/AGENT-GUIDE.md** - **START HERE** - Complete guide on when to use which agent
- **docs/agents/nextjs-developer-agent.md** - Next.js development specialist
- **docs/agents/react-specialist-agent.md** - React patterns and optimization
- **docs/agents/typescript-agent.md** - TypeScript development expert
- **docs/agents/fitness-branding-strategist.md** - Brand and marketing strategy
- **docs/agents/ui-designer.md** - UI/UX design guidance
- **docs/agents/business-analyst.md** - Business logic and requirements
- **docs/agents/ux-researcher.md** - User experience research
- **docs/agents/security-reviewer.md** - Security audit and compliance

**Business & Strategy**:
- **data/docs/BUSINESS-OVERVIEW.md** - Complete feature set, monetization model, revenue projections
- **data/docs/mobile_first_plan.md** - Multi-platform development strategy (Web, Android, iOS)
- **data/docs/PRICING-STRATEGY-ANALYSIS.md** - Subscription pricing analysis
- **docs/STRIPE-*.md** - Stripe setup and verification guides
- **docs/MONITORING-GUIDE.md** - Production monitoring and logging

## Common Issues & Solutions

### Next.js 15 Breaking Changes
- **Async Params**: Dynamic route params must be awaited in route handlers
  ```typescript
  export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params; // Must await
  }
  ```
- **Route Exports**: Only export GET, POST, etc. from route handlers (no custom exports)
- **NextAuth Config**: Must be in separate file (`src/lib/auth-options.ts`) for `getServerSession()` compatibility

### DynamoDB Best Practices
- Always include `userId` in queries for row-level security
- Use composite keys (userId + workoutId/date) for efficient queries
- Store dates as ISO strings, not Date objects
- Implement optimistic UI updates with localStorage cache
- Reserved keywords (e.g., "date", "tags") must use ExpressionAttributeNames

### Authentication
- Session is stored as JWT with 30-day expiration
- User data synced to DynamoDB on login via `jwt` callback
- Access `session.user.id` with type casting: `(session?.user as any)?.id`
- Use `getServerSession(authOptions)` in API routes, passing shared `authOptions` from `src/lib/auth-options.ts`
