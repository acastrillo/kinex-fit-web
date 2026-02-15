# Kinex Fit - Project Status & Overview

> **Legacy snapshot**: Canonical, up-to-date product docs live in `/docs` (see `docs/COMPREHENSIVE-GUIDE.md`).

**Version**: 1.5 MVP Complete
**Last Updated**: January 2025
**Production URL**: [https://kinexfit.com](https://kinexfit.com)
**Status**: 🟢 Deployed and operational

---

## 📱 What is Kinex Fit?

**Kinex Fit** is a fitness tracking web application that helps users save, track, and optimize their workouts. Users can scan workout screenshots (OCR), import routines from Instagram, track personal records, log body metrics, and schedule workouts on a calendar.

**Key Features**:
- 🏋️ Save workouts from Instagram URLs, screenshots (OCR), or manual entry
- 📊 Track personal records (PRs) with 7 different 1RM formulas
- 📈 Log body metrics (weight, body fat %, 8 body measurements)
- 📅 Schedule workouts on a calendar with completion tracking
- ⏱️ Smart workout timers (Interval, HIIT, Rest timer widget)
- 🔄 Cross-device sync via AWS DynamoDB
- 🔐 NextAuth.js authentication (Google, Facebook, Email/Password)

---

## 🏗️ How It's Built

### Tech Stack

**Frontend**:
- **Framework**: Next.js 15.5.1 with App Router
- **Language**: TypeScript 5.7 (strict mode)
- **UI Library**: React 19
- **Styling**: Tailwind CSS with custom dark theme
- **Components**: shadcn/ui (New York style)
- **State**: Zustand + NextAuth.js session
- **Forms**: React Hook Form + Zod validation

**Backend & Infrastructure**:
- **Hosting**: AWS ECS Fargate (containerized Next.js)
- **Database**: AWS DynamoDB (3 tables: users, workouts, body-metrics)
- **Authentication**: NextAuth.js with Google/Facebook/Email providers
- **Load Balancer**: Application Load Balancer with HTTPS (ACM certificate)
- **DNS**: Route53 (kinexfit.com)
- **Container**: Docker with multi-stage builds, ECR registry
- **OCR**: AWS Textract (server-side)

**External Services**:
- **Stripe**: Subscription billing (4 tiers: Free, Core, Pro, Elite)
- **AWS Bedrock**: AI features (Claude Sonnet 4.5) - Phase 6 backend ready
- **Apify**: Instagram content scraping

### High-Level Architecture

```
User Browser
    ↓
Application Load Balancer (HTTPS)
    ↓
ECS Fargate Task (Next.js Container)
    ↓
    ├─→ DynamoDB (Users, Workouts, Body Metrics)
    ├─→ NextAuth.js (Authentication providers)
    ├─→ AWS Textract (OCR processing)
    ├─→ AWS Bedrock (AI features - backend ready)
    ├─→ Stripe (Subscriptions)
    └─→ S3 (Image storage - future)
```

**Key Design Decisions**:
- **Serverless DynamoDB**: Scales automatically, pay-per-use, no server management
- **ECS Fargate**: Containerized deployment without managing EC2 instances
- **Next.js Standalone**: Optimized Docker images with minimal dependencies
- **JWT Sessions**: 30-day expiration, stored in httpOnly cookies
- **Offline-First**: LocalStorage cache for workouts when DynamoDB unavailable

### Database Schema

**DynamoDB Tables**:

1. **spotter-users**
   - Partition Key: `userId`
   - Attributes: email, firstName, lastName, subscriptionTier, scanQuotaUsed, ocrQuotaUsed, instagramImportsUsed, workoutsSaved, aiRequestsUsed
   - User profiles with subscription tracking

2. **spotter-workouts**
   - Partition Key: `userId`
   - Sort Key: `workoutId`
   - Attributes: title, description, exercises[], scheduledDate, completedDate, status, workoutType, structure, timestamps
   - Workout data with scheduling and AI metadata

3. **spotter-body-metrics**
   - Partition Key: `userId`
   - Sort Key: `date` (ISO format: YYYY-MM-DD)
   - Attributes: weight, bodyFatPercentage, muscleMass, 8 measurements (chest, waist, hips, thighs, arms, calves, shoulders, neck), unit, notes, photoUrls[]

### API Routes

All routes in `src/app/api/`:
- `/api/health` - Health check
- `/api/auth/[...nextauth]` - NextAuth endpoints
- `/api/workouts` - GET (list), POST (create)
- `/api/workouts/[id]` - GET, PATCH, DELETE
- `/api/workouts/[id]/schedule` - PATCH, DELETE
- `/api/workouts/[id]/complete` - POST
- `/api/workouts/scheduled` - GET with optional date filter
- `/api/body-metrics` - GET, POST
- `/api/body-metrics/[date]` - GET, PATCH, DELETE
- `/api/body-metrics/latest` - GET
- `/api/ocr` - POST (OCR processing)
- `/api/instagram-fetch` - POST (Instagram parser)
- `/api/ai/enhance-workout` - POST (AI enhancement - backend ready)
- `/api/user/profile` - GET, PUT (training profile)
- `/api/user/profile/pr` - POST, DELETE (PR management)

### Project Structure

```
kinex-fit-web/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── add/               # Add/edit workout pages
│   │   ├── api/               # API endpoints
│   │   ├── auth/              # Login page
│   │   ├── calendar/          # Calendar view
│   │   ├── library/           # Workout library
│   │   ├── settings/          # Settings + training profile
│   │   ├── stats/             # PRs & body metrics pages
│   │   ├── timer/             # Workout timers
│   │   └── workout/[id]/      # Workout detail pages
│   ├── components/            # React components
│   │   ├── auth/              # Auth components
│   │   ├── layout/            # Header, navigation
│   │   ├── ui/                # shadcn/ui components
│   │   └── ai/                # AI enhancement button
│   ├── lib/                   # Utilities & business logic
│   │   ├── dynamodb.ts        # DynamoDB CRUD operations
│   │   ├── auth-options.ts    # NextAuth configuration
│   │   ├── ai/                # AI features (bedrock, enhancer, generator)
│   │   ├── workout/           # Workout transformations
│   │   ├── pr-calculator.ts   # PR detection & 1RM calculations
│   │   ├── exercise-history.ts # Exercise extraction
│   │   └── igParser.ts        # Instagram parser
│   └── store/                 # Zustand state
│       └── index.ts           # Auth store
├── prisma/                    # SQLite schema (dev only)
├── Dockerfile                 # Production container
├── docker-compose.yml         # Local dev setup
└── deploy-to-aws.ps1          # AWS deployment script
```

---

## ✅ What's Complete (v1.5)

### Phase 1: Core Persistence ✅
- DynamoDB workout CRUD operations
- Cross-device synchronization
- Authentication with NextAuth.js (Google/Facebook/Email)
- Workout library with search and filtering
- Instagram URL parsing (paste URL → scrape caption)
- Screenshot OCR (upload image → extract text)
- API routes for all CRUD operations

### Phase 2: Calendar & Scheduling ✅
- Calendar view with date navigation
- Schedule workouts for specific dates
- Mark workouts as completed
- Visual indicators (scheduled = hollow ring, completed = filled dot)
- Recent activity feed (last 3 completed workouts)
- Last 24 hours section for quick scheduling
- Schedule modal with workout selection

### Phase 3: Smart Timers ✅
- **Interval Timer**: Circular progress, custom durations (1-60 min)
- **HIIT Timer**: Work/rest phases, round counting, presets (Tabata, EMOM, etc.)
- **Rest Timer Widget**: Floating widget on workout pages, quick-start presets
- Web Audio API for beeps (no audio files needed)
- Web Notifications API for alerts
- LocalStorage state persistence

### Phase 4: Stats & PRs Tracking ✅
- **Personal Records**: Automatic PR detection from workouts
- **1RM Calculations**: 7 formulas (Brzycki, Epley, Lander, Lombardi, Mayhew, O'Conner, Wathan)
- **Exercise History**: Progression charts per exercise
- **Body Metrics**: Weight, body fat %, 8 measurements
- **Progress Charts**: 30/90-day trends, line charts with Recharts
- **Exercise Detail Pages**: Individual exercise tracking at `/exercise/[name]`

### Phase 5: Subscription & Monetization ✅
- **Stripe Integration**: Checkout sessions, webhooks, billing portal
- **4 Tiers**: Free, Core ($8.99/mo), Pro ($13.99/mo), Elite ($24.99/mo)
- **Feature Gating**: Scan quota enforcement (OCR + Instagram), upgrade prompts
- **Usage Tracking**: Scan quota, workouts saved, AI requests (Phase 6)
- **Subscription Page**: Pricing cards, current plan display, upgrade/downgrade

### Phase 6: AI Backend Infrastructure ✅ (Frontend Integration Pending)
- **AWS Bedrock Client**: Claude Sonnet 4.5 integration with cost tracking
- **Smart Workout Parser**: AI enhancement logic (backend ready)
- **AI Workout Generator**: Generation logic (backend ready)
- **Training Profile**: User profile page + API (fully functional)
- **API Routes**: `/api/ai/enhance-workout`, `/api/user/profile`, `/api/user/profile/pr`
- **Rate Limiting**: Upstash Redis rate limiting on all AI routes

---

## 🚧 What's In Progress

### Phase 6: AI Frontend Integration (40% complete)
**Backend Complete ✅, Frontend Integration Pending**

**What's Done**:
- ✅ AWS Bedrock client with cost tracking (`src/lib/ai/bedrock-client.ts`)
- ✅ Smart Workout Parser logic (`src/lib/ai/workout-enhancer.ts`)
- ✅ AI Workout Generator logic (`src/lib/ai/workout-generator.ts`)
- ✅ Training Profile page + API (`/settings/training-profile`)
- ✅ All AI API routes deployed to production
- ✅ Rate limiting with Upstash Redis

**What's Left** (3-6 hours of work):
1. **OCR Enhancement Button** (1-2 hours)
   - Add "Enhance with AI" button to OCR results page
   - Call `/api/ai/enhance-workout` with raw OCR text
   - Display enhanced workout with changes/suggestions

2. **Instagram Enhancement Button** (1 hour)
   - Same pattern as OCR enhancement
   - Show button after Instagram import

3. **AI Workout Generator Page** (2-3 hours)
   - Create `/add/generate` page with text input
   - Wire up to `/api/ai/generate-workout` endpoint
   - Display generated workout with preview/edit

**Status**: Backend fully deployed and operational. Frontend integration is optional and can be added in v1.6.

---

## 📋 What's Planned Next

### Immediate Priorities (Next 1-2 Weeks)
1. **Testing & Bug Fixes**: Monitor production, fix any issues
2. **User Feedback**: Gather feedback on Training Profile feature
3. **Performance Monitoring**: Watch AI token costs, usage patterns

### Phase 6 Completion (Optional - v1.6)
- Add "Enhance with AI" buttons to OCR and Instagram flows
- Create AI Workout Generator page (`/add/generate`)
- Implement Workout of the Day (WOD) component for dashboard

### Mobile Development (Next 90 Days)
**Android App** - Native Kotlin with Instagram share sheet integration (repo: `kinex-fit-android`)
- Native share intent handler (intercepts Instagram shares)
- 2-tap workflow: Share from Instagram → Open Kinex Fit
- OCR processing and workout parsing
- Offline-first with Room database
- Same AWS backend (DynamoDB, Textract, Bedrock)
- Google Play Billing → Stripe sync

**Timeline**: 90-day development plan, launch to Google Play

### Future Phases (2025-2026)
- **Phase 7**: iOS App (after Android launch, repo: `kinex-fit-ios`)
- **Phase 8**: Social/Crew Features (private groups, challenges, leaderboards)
- **Phase 9**: Advanced AI Coach (conversational AI, daily check-ins)
- **Phase 10**: Marketplace (workout plans, coach programs)

---

## 💰 Business Model

### Subscription Tiers

| Tier | Price | Key Features |
|------|-------|--------------|
| **Free** | $0 | Unlimited workouts, 8 scans/month, 1 AI request/month, 90-day history |
| **Core** | $8.99/mo | Unlimited workouts, 12 scans/month, 10 AI requests/month |
| **Pro** | $13.99/mo | Unlimited workouts, 60 scans/month, 30 AI requests/month, advanced analytics |
| **Elite** | $24.99/mo | Unlimited workouts, 120 scans/month, 100 AI requests/month, priority support |

### Cost Structure
- **AWS Infrastructure**: ~$200-250/month (ECS, ALB, DynamoDB, Textract)
- **AI Tokens (Bedrock)**: ~$0.01 per enhancement, ~$0.02 per generation
- **Stripe Fees**: 2.9% + $0.30 per transaction
- **Monthly Operating Costs**: ~$200-400 (scales with usage)

### Profitability
- **Gross Margins**: 70-85% across all tiers
- **Break-Even**: ~39 paid users
- **Current Status**: Profitable at 300+ paid users (estimated)

---

## 📊 Tech Stack Summary

| Category | Technology |
|----------|------------|
| **Language** | TypeScript 5.7 (strict mode) |
| **Framework** | Next.js 15.5.1 (App Router) |
| **UI** | React 19, Tailwind CSS, shadcn/ui |
| **Database** | AWS DynamoDB (production), SQLite + Prisma (dev) |
| **Auth** | NextAuth.js + Google/Facebook/Email (Apple Sign-In required for iOS, pending) |
| **Hosting** | AWS ECS Fargate + ALB + Route53 |
| **OCR** | Tesseract.js + AWS Textract |
| **AI** | AWS Bedrock (Claude Sonnet 4.5) |
| **Payments** | Stripe |
| **State** | Zustand + NextAuth session |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |

---

## 🚀 Deployment

### Current Production Environment
- **Domain**: https://kinexfit.com
- **Region**: us-east-1
- **ECS Cluster**: spotter-cluster
- **ECS Service**: spotter-service
- **ECR Repository**: spotter-app
- **Task Definition**: Latest (v13+)

### Deployment Process
```bash
# 1. Build and push Docker image
docker build -t spotter-app .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag spotter-app:latest <account>.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# 2. Force new deployment
aws ecs update-service --cluster spotter-cluster --service spotter-service --force-new-deployment
```

See [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md) for detailed procedures.

---

## 📚 Documentation

### Core Documentation
- **[STATUS.md](STATUS.md)** (this file) - Complete project overview and status
- **[CLAUDE.md](CLAUDE.md)** - Instructions for Claude Code AI assistant
- **[README.md](README.md)** - Getting started, tech stack, project structure
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design decisions

### Implementation Guides
- **[PHASE-1-IMPLEMENTATION.md](PHASE-1-IMPLEMENTATION.md)** - DynamoDB persistence
- **[PHASE-2-CALENDAR-IMPLEMENTATION.md](PHASE-2-CALENDAR-IMPLEMENTATION.md)** - Calendar & scheduling
- **[PHASE-3-TIMERS-IMPLEMENTATION.md](PHASE-3-TIMERS-IMPLEMENTATION.md)** - Smart timers
- **[PHASE-4-IMPLEMENTATION.md](PHASE-4-IMPLEMENTATION.md)** - Stats & PRs tracking
- **[PHASE-5-MONETIZATION.md](PHASE-5-MONETIZATION.md)** - Stripe integration
- **[PHASE-6-AI-FEATURES.md](PHASE-6-AI-FEATURES.md)** - AI features (planned)
- **[PHASE-6-PROGRESS.md](PHASE-6-PROGRESS.md)** - AI backend implementation (complete)

### Business & Strategy
- **[BUSINESS-OVERVIEW.md](BUSINESS-OVERVIEW.md)** - Monetization model, revenue projections
- **[mobile_first_plan.md](mobile_first_plan.md)** - Multi-platform strategy (Web, Android, iOS)
- **[ROADMAP.md](ROADMAP.md)** - Detailed phase-by-phase development roadmap
- **[PROJECT-STATE.md](PROJECT-STATE.md)** - MVP status, north star vision

### Operations & Deployment
- **[DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md)** - AWS deployment procedures
- **[WHATS-NEXT.md](WHATS-NEXT.md)** - Phase 6 completion tasks
- **[SECURITY-REVIEW.md](SECURITY-REVIEW.md)** - Security audit and AWS permissions

---

## 🎯 Success Metrics

### Current Status (v1.5)
- ✅ Production-ready web app deployed on AWS
- ✅ Authentication with Google OAuth
- ✅ 5 phases complete (Core, Calendar, Timers, Stats, Subscriptions)
- ✅ AI backend infrastructure deployed (Phase 6 partial)
- ✅ Stripe integration with 4 subscription tiers
- ✅ Cross-device sync with DynamoDB

### Target Metrics (Q1 2025)
- 1,000 total users
- 300 paid users (30% conversion)
- $2,747 MRR (Monthly Recurring Revenue)
- 50% DAU/MAU ratio (high engagement)
- <5% monthly churn

---

## 🔗 Quick Links

- **Production App**: [https://kinexfit.com](https://kinexfit.com)
- **GitHub**: [Repository URL]
- **AWS Console**: [ECS, DynamoDB, Route53]
- **Stripe Dashboard**: [Subscription management]

---

## 💡 Key Takeaways

**What Works Well**:
- ✅ Next.js 15 + React 19 provides excellent DX
- ✅ DynamoDB scales automatically with zero server management
- ✅ NextAuth.js handles auth seamlessly
- ✅ Docker + ECS Fargate enables fast deployments
- ✅ Stripe integration is straightforward and robust
- ✅ AI backend (Bedrock) is cost-effective (~$0.01-0.02 per request)

**Challenges**:
- ⚠️ Next.js 15 async params breaking change (handled)
- ⚠️ OCR accuracy varies with image quality (Textract helps)
- ⚠️ Instagram scraping requires Apify (ToS-compliant approach)
- ⚠️ TypeScript strict mode requires type workarounds for NextAuth

**Next Steps**:
1. Monitor production usage and costs
2. Gather user feedback on Training Profile feature
3. Decide on Phase 6 frontend integration timeline
4. Begin Android app development planning (90-day plan)

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Status**: v1.5 MVP Complete, Phase 6 Backend Deployed
**Next Milestone**: Android App Development
