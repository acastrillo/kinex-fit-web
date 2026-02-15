# Android Mobile Plan - Kinex Fit

## What We Already Have (Web App)

### ✅ Backend APIs - 100% Ready (Just Need Token Auth)
All API endpoints are already built and deployed. Only need to add bearer token authentication middleware:

**Workouts API**:
- `GET /api/workouts` - List all user workouts
- `GET /api/workouts/[id]` - Get workout details
- `POST /api/workouts` - Create workout
- `PATCH /api/workouts/[id]` - Update workout
- `DELETE /api/workouts/[id]` - Delete workout
- `GET /api/workouts/scheduled` - Get scheduled workouts (optional ?date filter)
- `POST /api/workouts/[id]/schedule` - Schedule workout for a date
- `DELETE /api/workouts/[id]/schedule` - Unschedule workout
- `POST /api/workouts/[id]/complete` - Mark workout as completed
- `GET /api/workouts/stats` - Get workout statistics

**Body Metrics API**:
- `GET /api/body-metrics` - List all metrics
- `POST /api/body-metrics` - Create metric
- `GET /api/body-metrics/[date]` - Get metric by date (YYYY-MM-DD)
- `PATCH /api/body-metrics/[date]` - Update metric
- `DELETE /api/body-metrics/[date]` - Delete metric
- `GET /api/body-metrics/latest` - Get most recent metric

**Import & OCR API**:
- `POST /api/ocr` - Process workout image via Tesseract/Textract
- `POST /api/instagram-fetch` - Parse Instagram workout URL
- `POST /api/upload-image` - Upload to S3 and get presigned URL
- `POST /api/ingest` - General data ingestion endpoint

**AI API** (Phase 6 - Already built):
- `POST /api/ai/enhance-workout` - AI-enhance parsed workout
- `POST /api/ai/generate-workout` - Generate workout from prompt
- `GET /api/ai/test-connection` - Test Bedrock connectivity

**User & Profile API**:
- `GET /api/user/profile` - Get user training profile
- `PATCH /api/user/profile` - Update training profile

**Stripe/Subscriptions API**:
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create customer portal session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

**Auth API**:
- `/api/auth/*` - NextAuth endpoints (already configured for Cognito + Google OAuth)

### ✅ Business Logic - Extract to Shared Module
These files contain pure TypeScript logic with no React dependencies. Can be extracted to a shared npm workspace:

**1. Type Definitions** (`packages/shared/types/`):
```typescript
// From src/lib/dynamodb.ts
- DynamoDBUser (with subscription fields)
- DynamoDBWorkout (with exercises[], scheduling)
- DynamoDBBodyMetric (with measurements)

// From src/types/workout-card.ts
- WorkoutCard, ExerciseCard, RestCard
- WorkoutRepetition

// From src/lib/training-profile.ts
- TrainingProfile, PersonalRecord, TrainingConstraint

// From src/lib/pr-calculator.ts
- ExerciseSet, PR, PersonalRecord

// From src/lib/body-metrics.ts
- BodyWeightEntry, BodyMeasurements, BodyComposition
```

**2. Workout Parsing** (`packages/shared/parsers/`):
```typescript
// src/lib/smartWorkoutParser.ts
- exerciseDatabase (100+ exercises with categories)
- detectWorkoutStructure()
- parseWorkoutText()
- normalizeExerciseName()

// src/lib/igParser.ts + igParser_toV1.ts
- Instagram content extraction logic
- Parse Instagram workout formats
```

**3. Workout Transformations** (`packages/shared/transformers/`):
```typescript
// src/lib/workout/card-transformer.ts
- expandWorkoutToCards() - Convert exercises to card sequence
- collapseCardsToExercises() - Reverse transformation
- Workout repetition logic (sets/rounds/AMRAP)
```

**4. Calculations** (`packages/shared/calculators/`):
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
- All 7 1RM calculation formulas

// src/lib/exercise-history.ts
- extractExercisesFromWorkout() - Extract exercises with sets/reps
- groupExercisesByMuscleGroup() - Categorize by muscle
- calculateTotalVolume() - Weight × reps calculations

// src/lib/body-metrics.ts
- calculateBMI() - BMI from weight/height
- convertWeight() - lbs ↔ kg conversions
- convertMeasurement() - in ↔ cm conversions
```

**5. Training Profile** (`packages/shared/profile/`):
```typescript
// src/lib/training-profile.ts (200+ lines)
- TrainingProfile interface
- defaultTrainingProfile
- EQUIPMENT_OPTIONS (50+ equipment types)
- TRAINING_GOALS (15+ goal options)
- Experience levels, splits, locations
```

**6. Feature Gating & Quotas** (`packages/shared/subscriptions/`):
```typescript
// src/lib/feature-gating.tsx
- Subscription tier definitions (Free/Core/Pro/Elite)
- Feature gates (workouts max, OCR quotas, AI limits)
- Quota checking logic
- Pricing ($7.99, $14.99, $34.99 monthly)

// src/lib/rate-limit.ts
- Rate limiting rules by tier
- Request throttling logic
```

**7. Constants** (`packages/shared/constants/`):
```typescript
// Muscle group mappings
- CHEST_EXERCISES, BACK_EXERCISES, etc.
- Exercise categorization

// Unit conversions
- Weight units (lbs, kg)
- Distance units (m, km, mi)
- Measurement units (in, cm)
```

## What We Need to Build for Android

### 1. Backend Readiness (4-6 hours)
**Add Bearer Token Auth Middleware**:
- Create `src/middleware.ts` to intercept API requests
- Accept both:
  - Cookie sessions (for web) - existing NextAuth flow
  - Bearer tokens (for mobile) - new Cognito access token verification
- Extract userId from Cognito token and map to DynamoDB user
- Validate token expiration and signature
- Return 401 for invalid/expired tokens

**Files to Create**:
- `src/middleware.ts` - Auth middleware
- `src/lib/cognito-token-validator.ts` - JWT verification logic

**Environment Variables (Already Have)**:
- `COGNITO_USER_POOL_ID` ✅
- `COGNITO_CLIENT_ID` ✅
- `AWS_REGION` ✅

### 2. Project Setup (8-10 hours)
**Bootstrap React Native App**:
```bash
npx create-expo-app@latest kinex-fit-android --template blank-typescript
cd kinex-fit-android
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install @tanstack/react-query zustand
npm install @react-native-async-storage/async-storage react-native-mmkv
npm install expo-secure-store expo-image-picker expo-camera
npm install nativewind lucide-react-native
```

**Navigation Structure**:
```
AuthStack:
  - LoginScreen (Cognito Hosted UI)
  - SignupScreen (Redirect to Cognito)

MainTabs:
  - DashboardTab (Upcoming workouts, quick stats)
  - WorkoutsTab (Library list)
  - AddTab (Camera/Import/Manual entry)
  - StatsTab (PRs, Body Metrics charts)
  - ProfileTab (Settings, Subscription, Training Profile)

Modals:
  - WorkoutDetailModal
  - ExerciseDetailModal
  - TimerModal
  - CalendarModal
```

**Theme Configuration** (Port from web):
```typescript
// theme.ts - Convert Tailwind tokens to RN StyleSheet
const colors = {
  background: '#0a0e1a', // Dark navy
  primary: '#06b6d4',    // Cyan
  secondary: '#a855f7',  // Purple
  rest: '#f59e0b',       // Amber
  // ... rest of theme
}
```

### 3. Auth Implementation (6-8 hours)
**Cognito PKCE Flow**:
```typescript
// Use expo-auth-session or aws-amplify
import { useAuthRequest } from 'expo-auth-session';

// Configure:
- Cognito Hosted UI with PKCE
- Custom URL scheme: spotbuddy://
- Store access/refresh tokens in SecureStore
- Auto-refresh on 401 responses

// API Client Wrapper:
class APIClient {
  async request(endpoint, options) {
    const token = await SecureStore.getItemAsync('accessToken');
    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
}
```

**New Cognito App Client** (AWS Console):
- Create mobile app client with PKCE enabled
- Add callback URL: `spotbuddy://callback`
- Enable Google OAuth federated sign-in
- Configure token expiration (access: 1hr, refresh: 30 days)

### 4. Core Features (40-50 hours total)

**A. Workouts Library (10-12 hours)**:
- FlatList of workouts with search/filter
- Pull-to-refresh using `/api/workouts`
- Optimistic updates with local cache
- Schedule picker (reuse `/api/workouts/[id]/schedule`)
- Swipe actions (delete, schedule, complete)

**B. Add/Import Flows (12-15 hours)**:
- **Camera Capture**:
  - Use `expo-image-picker` or `expo-camera`
  - Compress image before upload
  - POST to `/api/upload-image` → `/api/ocr`
  - Display parsed results for editing

- **Instagram Import**:
  - Text input for URL
  - POST to `/api/instagram-fetch`
  - Parse and display for editing

- **Manual Entry**:
  - Form with exercise search (use shared exerciseDatabase)
  - Validation matching web schema
  - POST to `/api/workouts`

**C. Stats & PRs (10-12 hours)**:
- **PRs Tab**:
  - Use `@tanstack/react-query` to fetch `/api/workouts`
  - Client-side PR calculation using shared `pr-calculator.ts`
  - Group by muscle (use shared `exercise-history.ts`)
  - Line charts with `react-native-chart-kit` or `victory-native`

- **Body Metrics Tab**:
  - Fetch from `/api/body-metrics`
  - Form to add/edit metrics
  - Progress charts (weight, body fat, measurements)
  - Camera for progress photos

**D. Training Profile (4-6 hours)**:
- Form to edit training profile
- Equipment multi-select (use shared `EQUIPMENT_OPTIONS`)
- Goals selector (use shared `TRAINING_GOALS`)
- PR entry for exercises
- GET/PATCH `/api/user/profile`

**E. Timers (6-8 hours)**:
- **Interval Timer**:
  - Countdown with circular progress
  - Use shared timer logic (port from `src/components/timers/IntervalTimer.tsx`)
  - Background audio (expo-av for beeps)
  - Notifications when timer completes

- **HIIT Timer**:
  - Work/rest phases
  - Presets (Tabata, EMOM)
  - Round tracking
  - Port logic from `src/components/timers/HIITTimer.tsx`

**F. Calendar View (4-6 hours)**:
- Monthly calendar with scheduled workouts
- Fetch from `/api/workouts/scheduled`
- Visual indicators (scheduled vs completed)
- Tap to view workout details
- Use `react-native-calendars`

**G. Subscriptions (4-6 hours)**:
- Display current tier and quota usage
- "Upgrade" button → Stripe checkout web view
- OR integrate Google Play Billing (later phase)
- Server reconciliation via webhooks

### 5. Shared Module Setup (6-8 hours)
**Create Shared Workspace**:
```bash
# In web repo root
mkdir -p packages/shared
cd packages/shared
npm init -y

# Package structure:
packages/shared/
├── src/
│   ├── types/           # All TypeScript interfaces
│   ├── parsers/         # smartWorkoutParser, igParser
│   ├── transformers/    # card-transformer
│   ├── calculators/     # pr-calculator, exercise-history, body-metrics
│   ├── profile/         # training-profile
│   ├── subscriptions/   # feature-gating, rate-limits
│   └── constants/       # Exercise database, muscle groups
├── package.json
└── tsconfig.json
```

**Usage in Both Apps**:
```json
// Web: package.json
{
  "dependencies": {
    "@kinex-fit/shared": "workspace:*"
  }
}

// Android: package.json
{
  "dependencies": {
    "@kinex-fit/shared": "file:../kinex-fit-web/packages/shared"
  }
}
```

### 6. Offline & Polish (8-10 hours)
- **Local Cache**: MMKV for recent workouts, body metrics
- **Optimistic Updates**: Show changes immediately, sync in background
- **Retry Queue**: Queue failed mutations when offline
- **Image Optimization**: Compress before upload (expo-image-manipulator)
- **Error Handling**: Graceful fallbacks for network errors
- **Loading States**: Skeletons, spinners, pull-to-refresh
- **Accessibility**: Screen reader support, font scaling

### 7. Testing & Release (10-12 hours)
- **Unit Tests**: Jest for shared logic (parsers, calculators)
- **Component Tests**: React Native Testing Library
- **E2E Tests**: Detox for critical flows (auth, add workout, OCR)
- **Security**: Certificate pinning, input validation
- **Monitoring**: Sentry for crash reporting
- **CI/CD**: GitHub Actions for APK/AAB builds
- **Play Store**: Internal track → Closed beta → Production

## Timeline Estimate

**Phase 1: Backend & Setup (2 weeks)**
- Week 1: Bearer token auth, shared module extraction
- Week 2: React Native project setup, navigation, theme

**Phase 2: Core Features (6 weeks)**
- Week 3-4: Workouts library, add/import flows
- Week 5: Stats & PRs
- Week 6: Body metrics & training profile
- Week 7: Timers & calendar
- Week 8: Subscriptions display

**Phase 3: Polish & Launch (2 weeks)**
- Week 9: Offline sync, error handling, performance
- Week 10: Testing, Play Store submission

**Total: 10 weeks (90 days)**

## Key Advantages of This Approach

### What We're NOT Building
❌ Workout parsing logic (already have smartWorkoutParser.ts)
❌ PR calculation (already have 7 formulas in pr-calculator.ts)
❌ Instagram parsing (already have igParser.ts)
❌ Exercise database (already have 100+ exercises)
❌ Training profile schema (already defined in training-profile.ts)
❌ Subscription logic (already have feature-gating.tsx)
❌ Body metrics calculations (already have body-metrics.ts)
❌ API endpoints (20+ endpoints already deployed)
❌ DynamoDB operations (all CRUD operations exist)
❌ OCR processing (Textract integration ready)
❌ S3 uploads (presigned URLs working)

### What We ARE Building
✅ React Native UI components
✅ Navigation flows
✅ OAuth PKCE flow
✅ API client with token injection
✅ Offline sync with MMKV
✅ Camera & image handling
✅ Platform-specific UX optimizations

### Effort Savings
- **Backend**: 95% done (just need token auth middleware)
- **Business Logic**: 80% reusable (extract to shared module)
- **Data Models**: 100% defined (TypeScript interfaces ready)
- **Auth Infrastructure**: 90% done (just need PKCE mobile client)

**Estimated Total Effort**: ~150-180 hours (10 weeks with 1 developer)
**Without Reuse**: ~400-500 hours (25 weeks)
**Savings**: ~60% reduction in development time

## Open Questions

1. **Native vs React Native**:
   - Current plan: React Native (Expo) for faster development
   - Alternative: Native Kotlin for better Instagram share sheet integration
   - Decision: Start with RN, evaluate native if share sheet critical

2. **Shared Module Distribution**:
   - Option A: npm workspace (requires monorepo)
   - Option B: Separate npm package (published privately)
   - Decision: npm workspace (simpler, faster iteration)

3. **Google Play Billing vs Stripe**:
   - Phase 1: Read-only subscription display (use Stripe status)
   - Phase 2: Google Play Billing with server reconciliation
   - Revenue split: Google takes 15-30%, need to account in pricing

4. **AI Features on Mobile**:
   - All AI endpoints ready (`/api/ai/*`)
   - Just need to add Authorization header
   - Quota enforcement already in place

## Success Metrics

**MVP (Week 10)**:
- [ ] Authentication working (Cognito + Google OAuth)
- [ ] Add workout (camera OCR, Instagram, manual)
- [ ] View workout library with search
- [ ] Schedule workouts on calendar
- [ ] Track PRs and body metrics
- [ ] Basic timers (interval, HIIT)
- [ ] View subscription status
- [ ] Offline mode with sync
- [ ] Deployed to Play Store internal track

**V1.1 (Month 4)**:
- [ ] AI workout enhancement
- [ ] AI workout generation
- [ ] Google Play Billing integration
- [ ] Push notifications
- [ ] Advanced charts and analytics

**V2.0 (Month 6)**:
- [ ] Instagram share sheet integration (requires native module)
- [ ] Workout templates
- [ ] Community features
- [ ] Advanced AI coach
