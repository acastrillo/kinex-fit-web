# Phase 6: AI-Powered Features

**Status**: 📋 Planned
**Priority**: High
**Target**: Q1 2025

## Overview

Phase 6 introduces AI-powered features to enhance workout creation, parsing, and personalization using Amazon Bedrock with Claude Sonnet 4.5.

**AI Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5`)
- **Pricing**: $3 per million input tokens, $15 per million output tokens
- **Cost Optimization**: 90% savings with prompt caching, 50% with batch processing
- **Availability**: Amazon Bedrock, Google Vertex AI, direct Anthropic API

---

## 🎯 Goals

1. AI-powered workout parsing and cleanup
2. User profile for personalized AI recommendations
3. AI-generated custom workouts
4. Workout of the Day (WOD) system
5. Future: AI trainer/coach with push notifications

---

## 🤖 AI Features Breakdown

### 6.1 Smart Workout Parser & Enhancement

**User Story**: Users can enhance ANY saved workout (OCR, Instagram, or Manual) with AI to clean up, optimize, and add personalized recommendations.

#### Features

- **"✨ Enhance with AI" button** appears on:
  1. Workout detail pages (`/workout/[id]`)
  2. Add workout page after OCR/Instagram parse
  3. Library page (hover actions)

- **Feature Gating**:
  - Free tier: Button shows "Upgrade to use AI" → redirects to `/subscription?reason=ai_enhancement`
  - Out of credits: "Out of AI credits. Upgrade for more" → redirects to subscription page
  - Has credits: Processes enhancement and decrements quota

- **AI Enhancement includes**:
  - Clean up messy OCR text
  - Standardize exercise names
  - Add missing exercise details (sets/reps if unclear)
  - Suggest weight recommendations based on user PRs
  - Add form cues and tips
  - Suggest exercise substitutions based on user preferences
  - Estimate workout duration
  - Add difficulty rating
  - Recommend rest periods between sets

- **Data sources for recommendations**:
  - User's PR history from `spotter-workouts` table
  - User's body metrics from `spotter-body-metrics` table
  - User profile preferences (training goals, favorite exercises, etc.)
  - Exercise history and frequency

#### Technical Implementation

**Files to Create**:
- `src/lib/ai/bedrock-client.ts` - Amazon Bedrock client wrapper
- `src/lib/ai/workout-enhancer.ts` - AI workout enhancement logic
- `src/app/api/ai/enhance-workout/route.ts` - API endpoint for AI enhancement
- `src/components/ai/enhance-button.tsx` - Reusable AI enhancement button component
- `src/hooks/useAIEnhancement.ts` - Custom hook for AI enhancement logic

**Files to Modify**:
- `src/app/add/page.tsx` - Add "Enhance with AI" button after OCR/Instagram
- `src/app/workout/[id]/page.tsx` - Add "Enhance with AI" button to workout detail
- `src/app/library/page.tsx` - Add "Enhance with AI" to workout cards (optional)
- `src/lib/feature-gating.tsx` - Add `useAIEnhancementAccess()` hook
- `src/app/subscription/page.tsx` - Handle `?reason=ai_enhancement` query param
- `src/lib/dynamodb.ts` - Query user PRs and history, track AI usage quota

**API Token Usage**:
- Track AI requests per user (new field: `aiRequestsUsed`)
- Free: 0 AI requests/month
- Core: 5 AI requests/month
- Pro: 50 AI requests/month
- Elite: Unlimited AI requests

---

### 6.2 User Profile & Training Preferences

**User Story**: Users can add their training information to help AI provide better recommendations.

#### Profile Fields

**Location**: `/settings` page, new section "Training Profile"

1. **Current PRs** (Manual entry for exercises not tracked)
   - Bench Press 1RM
   - Squat 1RM
   - Deadlift 1RM
   - Overhead Press 1RM
   - Custom exercises

2. **Training Goals** (Multi-select)
   - Strength gain
   - Muscle building (hypertrophy)
   - Fat loss
   - Endurance
   - Athletic performance
   - General fitness
   - Rehabilitation/Recovery

3. **Workout Preferences**
   - Favorite exercises (multi-select with autocomplete)
   - Disliked exercises (multi-select)
   - Available equipment (gym, home gym, minimal equipment)
   - Preferred workout duration (30min, 45min, 60min, 90min)
   - Training frequency (days per week)
   - Experience level (beginner, intermediate, advanced)

4. **Training Focus** (What are you training for?)
   - Bodybuilding competition
   - Powerlifting meet
   - CrossFit competition
   - Marathon/endurance event
   - Weight loss goal
   - General health
   - Sport-specific training

5. **Constraints & Limitations**
   - Injuries or limitations (text field)
   - Time constraints
   - Energy levels (morning person, evening person)

#### Technical Implementation

**Files to Create**:
- `src/app/settings/training-profile/page.tsx` - Training profile form
- `src/lib/ai/profile-context.ts` - Build AI context from profile
- `src/app/api/user/profile/route.ts` - API for profile CRUD

**DynamoDB Schema Update**:
```typescript
// Add to spotter-users table
{
  trainingProfile?: {
    manualPRs?: { [exercise: string]: number }
    goals?: string[]
    favoriteExercises?: string[]
    dislikedExercises?: string[]
    equipment?: string[]
    preferredDuration?: number
    trainingFrequency?: number
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
    trainingFocus?: string
    constraints?: string
    energyLevels?: 'morning' | 'evening' | 'flexible'
  }
  aiRequestsUsed?: number
  aiRequestsLimit?: number
}
```

---

### 6.3 AI Workout Generator

**User Story**: Paid users can ask AI to generate a custom workout based on their goals, available time, and equipment.

#### Features

- **Location**: `/add` page, new tab or section "Generate Workout"
- **Input form**:
  - Free-text prompt: "What kind of workout do you want?"
    - Example: "Upper body strength with dumbbells, 45 minutes"
    - Example: "Full body HIIT workout for fat loss"
    - Example: "Leg day focusing on quads"
  - Duration selector (30/45/60/90 minutes)
  - Difficulty slider (beginner/intermediate/advanced)

- **AI Processing**:
  1. Analyze user's training profile
  2. Review recent workout history (avoid duplicate muscle groups if recently trained)
  3. Check user's PRs and suggest appropriate weights
  4. Search online for exercise variations and best practices
  5. Generate complete workout with:
     - Warm-up routine
     - Main exercises (sets, reps, weights)
     - Cool-down/stretching
     - Estimated duration
     - Form cues and tips

- **Output**:
  - Generated workout in editable format
  - User can review and modify before saving
  - "Regenerate" button to try different variation

#### Technical Implementation

**Files to Create**:
- `src/app/add/generate/page.tsx` - AI workout generator UI
- `src/lib/ai/workout-generator.ts` - AI workout generation logic
- `src/app/api/ai/generate-workout/route.ts` - API endpoint
- `src/components/ai/workout-generator-form.tsx` - Form component

**AI Prompt Structure**:
```
Generate a workout based on:
- User profile: {goals, experience, equipment}
- Recent workouts: {last 7 days}
- Current PRs: {exercise PRs}
- Request: {user's free-text prompt}
- Duration: {target duration}

Output format: JSON with exercises, sets, reps, weights, form cues
```

**Feature Gating**:
- Free: No access (show upgrade prompt)
- Core: 5 AI-generated workouts/month
- Pro: 50 AI-generated workouts/month
- Elite: Unlimited

---

### 6.4 Workout of the Day (WOD)

**User Story**: All users see a daily workout suggestion. Free users get a generic WOD, paid users get personalized WODs.

#### Features

**Location**: Home page (`/dashboard`) - new "Workout of the Day" section

- **For All Users**:
  - Single daily workout (same for everyone)
  - Available in 3 durations: 30 min, 45 min, 60 min
  - Different exercises/sets, but same workout structure
  - Resets at midnight UTC

- **For Free Users**:
  - Generic workout (not personalized)
  - "Coming Soon: Personalized WOD for Pro users"

- **For Paid Users** (Pro/Elite):
  - Personalized based on training profile
  - Adapts to recent workout history (avoid overtraining)
  - Uses user's PRs for weight recommendations
  - Considers user's goals and preferences

#### Technical Implementation

**Files to Create**:
- `src/components/wod/workout-of-day.tsx` - WOD display component
- `src/app/api/wod/route.ts` - API endpoint for WOD
- `src/lib/ai/wod-generator.ts` - WOD generation logic

**Generation Strategy**:

**Option 1: n8n Automation (Preferred)**
- n8n workflow runs daily at midnight UTC
- Generates WOD using Claude/GPT-4
- Stores in DynamoDB table: `spotter-wod`
- Frontend fetches pre-generated WOD

**Option 2: On-Demand Generation**
- API endpoint generates WOD when requested
- Caches result for 24 hours (Redis or DynamoDB)
- Regenerates after midnight

**DynamoDB WOD Table**:
```typescript
{
  date: string                    // Partition key (YYYY-MM-DD)
  duration: number                // Sort key (30, 45, 60)
  workout: {
    title: string
    description: string
    exercises: Exercise[]
    difficulty: string
    targetMuscles: string[]
  }
  createdAt: string
}
```

**n8n Workflow** (if using Option 1):
- Trigger: Schedule (daily at midnight UTC)
- Node 1: HTTP Request to OpenAI/Bedrock
  - Prompt: "Generate workout for today"
  - Return 3 versions (30/45/60 min)
- Node 2: DynamoDB Put Item (save WOD)
- Node 3: (Optional) Send push notification to users

---

### 6.5 AI Trainer / Coach (Future Phase)

**User Story**: AI coach provides personalized guidance, motivation, and daily workout suggestions via push notifications.

#### Features (Planned for Phase 7+)

- **Daily Check-ins**:
  - Morning: "Good morning! Ready for today's workout?"
  - Evening: "Did you complete your workout today?"

- **Personalized WOD**:
  - Generated based on user's training profile
  - Considers recovery needs
  - Adapts to user's schedule

- **Nutrition Guidance**:
  - Macros recommendations
  - Meal timing suggestions
  - Hydration reminders

- **Progress Tracking**:
  - Weekly summary of workouts
  - PR congratulations
  - Encouragement during plateaus

- **Recovery Optimization**:
  - Rest day recommendations
  - Sleep tracking integration
  - Fatigue monitoring

#### Technical Implementation (Future)

**Files to Create** (Phase 7):
- `src/lib/ai/coach.ts` - AI coach logic
- `src/lib/notifications/push-service.ts` - Push notification service
- `src/app/api/coach/route.ts` - AI coach API
- `src/components/coach/chat-interface.tsx` - Chat UI with AI coach

**Technologies**:
- Amazon SNS for push notifications
- Amazon Bedrock for conversational AI
- DynamoDB for conversation history
- EventBridge for scheduled check-ins

**Feature Gating**:
- Free: No access
- Core: No access
- Pro: No access
- Elite: Full AI coach access

---

## 🏗️ Database Schema Updates

### Users Table (`spotter-users`)

```typescript
{
  // Existing fields...

  // AI-related fields (new)
  aiRequestsUsed?: number          // Current period AI requests
  aiRequestsLimit?: number         // Tier-based limit
  lastAiRequestReset?: string      // ISO date of last reset

  // Training profile (new)
  trainingProfile?: {
    manualPRs?: { [exercise: string]: number }
    goals?: string[]
    favoriteExercises?: string[]
    dislikedExercises?: string[]
    equipment?: string[]
    preferredDuration?: number
    trainingFrequency?: number
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
    trainingFocus?: string
    constraints?: string
    energyLevels?: 'morning' | 'evening' | 'flexible'
  }
}
```

### New Table: Workout of the Day (`spotter-wod`)

```typescript
{
  date: string                      // Partition key (YYYY-MM-DD)
  duration: number                  // Sort key (30, 45, 60)
  workout: {
    title: string
    description: string
    exercises: {
      name: string
      sets: number
      reps: string
      weight?: string
      restSeconds?: number
      notes?: string
      formCues?: string[]
    }[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    targetMuscles: string[]
    estimatedDuration: number
    equipment: string[]
  }
  createdAt: string
  expiresAt: number                 // TTL for auto-deletion after 7 days
}
```

---

## 🔐 Environment Variables

```bash
# AI Services (Required for Phase 6)
AWS_BEDROCK_REGION=us-east-1
AWS_BEDROCK_MODEL=claude-sonnet-4-5

# Alternative: Direct Anthropic API
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5

# n8n Integration (for WOD generation)
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/generate-wod
N8N_API_KEY=...
```

---

## 📋 Implementation Checklist

### 6.1 Smart Workout Parser (Est: 6-8 hours)
- [ ] Set up Amazon Bedrock client
- [ ] Create workout enhancement API endpoint
- [ ] Build AI prompt for workout parsing
- [ ] Add "Enhance with AI" button to `/add` page
- [ ] Implement token/quota tracking
- [ ] Test with various OCR results
- [ ] Add loading states and error handling

### 6.2 User Training Profile (Est: 4-6 hours)
- [ ] Design profile form UI
- [ ] Create API endpoints (GET, POST, PATCH)
- [ ] Update DynamoDB schema
- [ ] Add profile section to Settings page
- [ ] Implement form validation
- [ ] Add profile completion progress indicator

### 6.3 AI Workout Generator (Est: 8-10 hours)
- [ ] Create workout generator UI page
- [ ] Build AI prompt for workout generation
- [ ] Implement free-text input with context
- [ ] Add workout preview and regenerate
- [ ] Integrate with user profile and PRs
- [ ] Add feature gating and quota enforcement
- [ ] Test various workout generation scenarios

### 6.4 Workout of the Day (Est: 6-8 hours)
- [ ] Create WOD DynamoDB table
- [ ] Build WOD display component
- [ ] Create WOD API endpoint
- [ ] Implement caching strategy
- [ ] Set up n8n workflow (or scheduled Lambda)
- [ ] Add WOD section to dashboard
- [ ] Test 30/45/60 minute variations

### 6.5 AI Coach (Future - Est: 20-30 hours)
- [ ] Design conversational AI architecture
- [ ] Set up Amazon SNS push notifications
- [ ] Build chat interface
- [ ] Implement conversation history
- [ ] Create daily check-in system
- [ ] Add nutrition and recovery modules
- [ ] Elite tier gating

---

## 💰 Subscription Tier Updates

| Feature | Free | Core ($7.99) | Pro ($14.99) | Elite ($34.99) |
|---------|------|---------|-----|-------|
| AI Workout Enhancement | ❌ | 10/month | 30/month | 100/month |
| AI Workout Generator | ❌ | 10/month | 30/month | 100/month |
| Training Profile | ✅ | ✅ | ✅ | ✅ |
| Workout of the Day | ✅ Generic | ✅ Generic | ✅ Personalized | ✅ Personalized |
| AI Coach | ❌ | ❌ | ❌ | ✅ (20 messages/day) |

**Update to**:
- `src/lib/stripe.ts` - Add AI request limits
- `src/lib/feature-gating.tsx` - Add AI feature checks

---

## 🚀 Deployment Strategy

### Phase 6.1 & 6.2 (First Release)
1. Smart Workout Parser + Training Profile
2. Deploy as minor update (v1.6)
3. Monitor AI token usage and costs
4. Gather user feedback

### Phase 6.3 (Second Release)
1. AI Workout Generator
2. Deploy as minor update (v1.7)
3. Monitor quota usage and feature adoption

### Phase 6.4 (Third Release)
1. Workout of the Day
2. Deploy as minor update (v1.8)
3. Set up n8n automation

### Phase 6.5 (Future - Phase 7)
1. AI Coach
2. Major feature release (v2.0)
3. Marketing push for Elite tier

---

## 📊 Success Metrics

- **AI Usage**:
  - AI enhancement requests per day
  - AI-generated workouts per day
  - Average user satisfaction (thumbs up/down)

- **Conversion**:
  - Free-to-Core conversion from AI feature exposure
  - Core-to-Pro upgrade for more AI requests

- **Engagement**:
  - WOD completion rate
  - Training profile completion rate
  - Time spent on AI-generated workouts

---

## 🐛 Known Considerations

1. **AI Costs**: Monitor OpenAI/Bedrock costs closely
   - Set budget alerts
   - Implement aggressive rate limiting
   - Consider caching similar requests

2. **Quality Control**: AI-generated workouts need validation
   - Add user feedback (thumbs up/down)
   - Monitor for safety issues (too heavy weights)
   - A/B test different prompt variations

3. **Token Limits**: Ensure AI prompts fit within model limits
   - Claude: 200k tokens
   - GPT-4: 128k tokens
   - Optimize context size

4. **Privacy**: User training profile contains sensitive data
   - Don't store AI prompts with PII
   - Allow users to opt-out of AI features
   - Clear data retention policy

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Status**: Planning Phase
**Next Step**: Begin 6.1 - Smart Workout Parser
