# Kinex Fit - Fitness Tracking App

[![Production](https://img.shields.io/badge/production-live-green)](https://kinexfit.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.7-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Stripe](https://img.shields.io/badge/Stripe-19.1.0-blueviolet)](https://stripe.com/)
[![AWS](https://img.shields.io/badge/AWS-Bedrock-orange)](https://aws.amazon.com/bedrock/)

Kinex Fit is a modern fitness tracking application that lets users save Instagram workouts, upload workout screenshots with OCR text extraction, and track their fitness progress across devices with AI-powered features. Built with Next.js 15.5.7, React 19.1.0, and deployed on AWS infrastructure.

🌐 **Live App**: [https://kinexfit.com](https://kinexfit.com)

## 🎯 Features

### ✅ Current Features (v1.5)

#### Core Functionality
- **Authentication**: NextAuth.js with Google, Facebook, and Email/Password
- **Workout Management**: Full CRUD operations with cross-device sync via DynamoDB
- **Instagram Integration**: Parse and import workout routines from Instagram posts
- **OCR Processing**: Extract workout text from images using AWS Textract
- **Offline Support**: LocalStorage cache for offline access
- **Dark Theme**: Fitness-focused dark UI with cyan/purple accents

#### Workout Features
- **AMRAP Workouts** (New): As Many Rounds As Possible workout type with time limits
  - Manual creation with configurable time limits (1-120 min)
  - Specialized session view with round tracking
  - Multi-block AMRAP support
- **Workout Notes**: Add notes when completing workouts
- **Card Carousel**: Swipeable card-based workout session view with research-based UX

#### Calendar & Scheduling (Phase 2 ✅)
- **Calendar View**: Visual calendar with workout indicators
- **Scheduling**: Schedule workouts for future dates
- **Completion Tracking**: Mark workouts as completed with dates
- **Recent Activity**: Last 24 hours and completion history

#### Smart Timers (Phase 3 ✅)
- **Interval Timer**: Customizable countdown timer (1-60 min)
- **HIIT Timer**: High-Intensity Interval Training with presets (Tabata, EMOM, etc.)
- **Rest Timer Widget**: Floating timer on workout pages with quick presets

#### Stats & Progress (Phase 4 ✅)
- **Personal Records**: Automatic PR detection with 7 different 1RM formulas
- **Body Metrics**: Weight, body fat %, and 8 body measurements
- **Progression Charts**: 30/90-day trends and analytics
- **Exercise History**: Track performance by exercise and muscle group

#### Subscriptions (Phase 5 ✅)
- **Free Tier**: Monthly limits (scans/AI), 90-day history
- **Core** ($8.99/mo): 12 scans/month, 10 AI requests/month
- **Pro** ($13.99/mo): 60 scans/month, 30 AI requests/month, advanced analytics
- **Elite** ($24.99/mo): 120 scans/month, 100 AI requests/month, priority support, early access
- **Stripe Integration**: Secure payment processing and subscription management

#### AI Features (Phase 6 - 40% Complete)
- ✅ **Smart Workout Parser**: AI-powered workout enhancement with Claude Sonnet 4.5
  - Clean up messy OCR text
  - Standardize exercise names
  - Suggest weights based on PRs
  - Add form cues and safety tips
- 🚧 **Training Profile**: Personalized fitness profile
- 🚧 **AI Workout Generator**: Natural language workout creation
- 🚧 **Workout of the Day**: Daily personalized workout suggestions

### 📋 Coming Soon (Roadmap)

- **Complete Phase 6**: Finish remaining AI features (Training Profile, Generator, WOD)
- **Android App**: Native Kotlin app with Instagram share sheet integration (Q1 2025)
- **iOS App**: Native Swift app (after Android launch)
- **AI Coach**: Interactive fitness coaching with daily check-ins (Phase 7)
- **Crew Features**: Social workout tracking and leaderboards (Phase 8)
- **Apple Health Integration**: Sync with health data and wearables (Phase 8+)

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 15.5.7 (App Router) with Turbopack dev mode
- **UI Library**: React 19.1.0
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.17 with custom dark theme
- **UI Components**: shadcn/ui (New York style)
- **State Management**: Zustand 5.0.8 + NextAuth session
- **Forms**: React Hook Form 7.63.0 + Zod 3.25.76 validation
- **Icons**: Lucide React 0.542.0
- **Charts**: Recharts 3.2.1

### Backend & Infrastructure
- **Hosting**: AWS ECS Fargate (containerized)
- **Database**: AWS DynamoDB (production), SQLite + Prisma ORM 6.16.1 (development)
- **Authentication**: NextAuth.js 4.24.7 with Google/Facebook/Email providers
- **Payments**: Stripe 19.1.0 with @stripe/stripe-js 8.0.0
- **AI**: AWS Bedrock Runtime 3.916.0 (Claude Sonnet 4.5)
- **Load Balancer**: Application Load Balancer with HTTPS
- **DNS**: Route53 (kinexfit.com)
- **Container Registry**: AWS ECR
- **OCR**: AWS Textract 3.883.0
- **Rate Limiting**: Upstash Redis 1.35.6 + Upstash Ratelimit 2.0.6

### Developer Tools
- **Package Manager**: npm
- **Linting**: ESLint with TypeScript support
- **Database ORM**: Prisma (dev mode)
- **Docker**: Multi-stage builds with standalone output
- **Git**: Version control with feature branches

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- AWS account with configured credentials
- Docker (for production builds)
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd spotter-webapp-free
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL` - SQLite database path (dev mode)
   - `AUTH_SECRET`, `NEXTAUTH_URL`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
   - `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM`
   - `AWS_REGION` (for DynamoDB/Textract/S3)
   - Legacy Cognito variables are deprecated (route-old only)
   - `DYNAMODB_USERS_TABLE`, `DYNAMODB_WORKOUTS_TABLE`
   - `APIFY_API_TOKEN` (for Instagram scraping)

4. **Generate Prisma client** (dev mode):
   ```bash
   npx prisma generate
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Open browser**: Navigate to [http://localhost:3000](http://localhost:3000)

### Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Type checking
npx tsc --noEmit

# Database commands
npm run db:push          # Push schema to database
npm run db:generate      # Generate Prisma client
npm run db:seed:user     # Seed test user

# Add UI component
npx shadcn@latest add [component-name]
```

## 📁 Project Structure

```
spotter-webapp-free/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── add/               # Add/edit workout pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── workouts/      # Workout CRUD API
│   │   │   ├── ocr/           # OCR processing
│   │   │   └── health/        # Health check
│   │   ├── auth/              # Auth pages (login)
│   │   ├── library/           # Workout library
│   │   ├── workout/[id]/      # Individual workout view
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── auth/              # Auth components
│   │   ├── layout/            # Layout components
│   │   ├── providers/         # Context providers
│   │   └── ui/                # shadcn/ui components
│   ├── lib/                   # Utilities & shared logic
│   │   ├── dynamodb.ts        # DynamoDB client & operations
│   │   ├── db.ts              # Prisma client (dev)
│   │   ├── workout/           # Workout transformations
│   │   ├── igParser.ts        # Instagram parser
│   │   └── utils.ts           # Common utilities
│   └── store/                 # Zustand state management
│       └── index.ts           # Auth store
├── prisma/                    # Database schema (dev)
│   └── schema.prisma
├── public/                    # Static assets
├── scripts/                   # Utility scripts
├── .env.example               # Environment template
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
├── Dockerfile                 # Production container
└── docker-compose.yml         # Local Docker setup
```

## 🗄️ Database Architecture

### Production (DynamoDB)

**spotter-workouts** table:
- **Partition Key**: `userId` (string) - Enables per-user data isolation
- **Sort Key**: `workoutId` (string) - Unique workout identifier
- **Attributes**:
  - `title`, `description`, `exercises[]`, `content`
  - `author`, `source`, `type`, `difficulty`, `tags[]`
  - `totalDuration`, `createdAt`, `updatedAt`
  - `llmData` (AI analysis, future)

**spotter-users** table:
- **Partition Key**: `userId` (string)
- **Attributes**:
  - Profile: `email`, `firstName`, `lastName`, `image`
  - Subscription: `subscriptionTier`, `subscriptionStatus`, Stripe IDs
  - Usage: `scanQuotaUsed`, `scanQuotaResetDate`, `ocrQuotaUsed`, `instagramImportsUsed`, `workoutsSaved`

**spotter-body-metrics** table:
- **Partition Key**: `userId` (string)
- **Sort Key**: `date` (string) - ISO date format (YYYY-MM-DD)
- **Attributes**:
  - Weight: `weight`, `bodyFatPercentage`, `muscleMass`
  - Measurements: `chest`, `waist`, `hips`, `thighs`, `arms`, `calves`, `shoulders`, `neck`
  - Metadata: `unit` (metric/imperial), `notes`, `photoUrls[]`
  - Timestamps: `createdAt`, `updatedAt`

### Development (SQLite + Prisma)

See [prisma/schema.prisma](prisma/schema.prisma) for full schema with User, Account, Session, and VerificationToken models.

## 🔐 Authentication Flow

1. User clicks login → redirected to selected NextAuth provider (Google/Facebook/Apple) or submits credentials
2. Provider validates credentials/OAuth and returns to NextAuth callback
3. NextAuth.js exchanges code for tokens (OAuth) or validates credentials
5. JWT callback syncs user to DynamoDB and fetches subscription data
6. Session callback shapes user object for client
7. Frontend accesses auth state via `useAuthStore` hook

## 🎨 Styling & UI

- **Design System**: Custom dark theme with CSS variables
- **Color Palette**:
  - Background: Dark navy (`--background`)
  - Primary: Cyan accent (`--primary`)
  - Secondary: Purple accent (`--secondary`)
  - Rest: Amber accent (`--rest-color`)
- **Components**: shadcn/ui with "new-york" style
- **Typography**: Geist font family
- **Animations**: Custom fade-in, slide-up, bounce effects

## 🐳 Docker Deployment

### Build Production Image

```bash
docker build -t spotter-app .
```

### Run Locally

```bash
docker-compose up
```

### Deploy to AWS ECS

See [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md) for complete deployment guide.

Quick deploy:
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t spotter-app .
docker tag spotter-app:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Force new deployment
aws ecs update-service --cluster spotter-cluster --service spotter-service --force-new-deployment
```

## 🧪 Testing

Playwright E2E tests are configured. To run them:

```bash
npx playwright test
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality Standards

- TypeScript strict mode enabled
- ESLint warnings treated as build errors
- Use path aliases (`@/components`, `@/lib`)
- Follow Next.js App Router conventions
- Prefer editing existing files over creating new ones

## 📊 Monitoring & Logging

- **Application Logs**: CloudWatch Logs via ECS task
- **Error Tracking**: Console logging (Sentry integration planned)
- **Health Check**: `/api/health` endpoint
- **Metrics**: CloudWatch metrics for ECS tasks

## 🛣️ Roadmap

See [PROJECT-STATE.md](PROJECT-STATE.md) for detailed roadmap, MVP requirements, and north star goals.

### Phase 1: Core Persistence ✅ (Complete - October 2024)
- DynamoDB workout CRUD operations
- Cross-device synchronization
- API routes for workout management
- Authentication with NextAuth.js (Google/Facebook/Email)

### Phase 2: Calendar & Scheduling ✅ (Complete - January 7, 2025)
- Calendar view with workout scheduling
- Date range queries and filtering
- Scheduled/completed workout indicators
- Recent activity feed

### Phase 3: Smart Timers ✅ (Complete - January 7, 2025)
- Interval timer with custom durations
- HIIT timer with presets (Tabata, EMOM, etc.)
- Rest timer widget on workout pages
- Web Audio API for notifications

### Phase 4: Enhanced Stats & PRs ✅ (Complete - January 6, 2025)
- Personal records tracking with automatic detection
- 7 different 1RM calculation formulas
- Body metrics tracking (weight, measurements, body fat)
- Progression charts and analytics

### Phase 5: Subscription & Monetization ✅ (Complete - January 8, 2025)
- Stripe payment integration
- Four subscription tiers (Free, Core, Pro, Elite)
- Feature gating and usage quota tracking
- Subscription management UI

### Phase 6: AI-Powered Features 🚧 (In Progress - 40% Complete)
- ✅ AWS Bedrock client infrastructure
- ✅ Smart Workout Parser with Claude Sonnet 4.5
- 🚧 Training Profile system
- 🚧 AI Workout Generator
- 🚧 Workout of the Day (WOD)

### Phase 7-8: Future Phases (Planned)
- **Phase 7**: AI Coach with daily check-ins
- **Phase 8**: Crew features and social workout tracking
- **Android App**: Native Kotlin with Instagram share sheet (Q1 2025)
- **iOS App**: Native Swift (after Android)

See full roadmap in [ROADMAP.md](ROADMAP.md).

## 📄 License

This project is private and proprietary. All rights reserved.

## 🔗 Documentation

### Core Documentation
- **[HOW-TO-GUIDE.md](HOW-TO-GUIDE.md)** - Complete user and developer guide
- **[PROJECT-STATE.md](PROJECT-STATE.md)** - Current state, MVP goals, and north star vision
- **[ROADMAP.md](ROADMAP.md)** - Detailed phase-by-phase development roadmap
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design decisions

### Deployment & Operations
- **[DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md)** - AWS deployment procedures and history
- **[COST-ANALYSIS.md](COST-ANALYSIS.md)** - AWS costs and profitability analysis

### Planning Documents
- **[LAUNCH-PLAN.md](LAUNCH-PLAN.md)** - Beta launch strategy and market research
- **[MONITORING-PLAN.md](MONITORING-PLAN.md)** - Monitoring and logging strategy

### Phase Implementation Details
- **[PHASE-1-IMPLEMENTATION.md](PHASE-1-IMPLEMENTATION.md)** - DynamoDB workout persistence
- **[PHASE-2-IMPLEMENTATION.md](PHASE-2-IMPLEMENTATION.md)** - OCR & image upload
- **[PHASE-3-IMPLEMENTATION.md](PHASE-3-IMPLEMENTATION.md)** - Analytics & dashboard
- **[PHASE-4-IMPLEMENTATION.md](PHASE-4-IMPLEMENTATION.md)** - Stats & PRs tracking

### Developer Resources
- **[CLAUDE.md](CLAUDE.md)** - Instructions for Claude Code AI assistant

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, React, TypeScript, and AWS**
