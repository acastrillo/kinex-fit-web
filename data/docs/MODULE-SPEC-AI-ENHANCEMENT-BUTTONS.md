# Module Specification: AI Enhancement Buttons Integration

**Version**: 1.0
**Date**: January 2025
**Status**: Ready for Implementation
**Estimated Time**: 3-4 hours

---

## 1. Overview

### Purpose
Add "Enhance with AI" buttons to the OCR and Instagram import workflows, allowing users to improve workout data quality using AI after initial text extraction.

### Context
The backend AI enhancement system is **already deployed and working** in production. This module only needs to add the frontend UI integration.

**What's Already Done**:
- ✅ AWS Bedrock client (`src/lib/ai/bedrock-client.ts`)
- ✅ Workout enhancer logic (`src/lib/ai/workout-enhancer.ts`)
- ✅ API endpoint (`POST /api/ai/enhance-workout`) - deployed and tested
- ✅ Rate limiting with Upstash Redis
- ✅ Subscription tier quota checking
- ✅ Cost tracking and usage logging

**What This Module Adds**:
- UI button component for triggering AI enhancement
- Integration into OCR results page
- Integration into Instagram import page
- Display of enhancement results (changes and suggestions)

---

## 2. Technical Requirements

### Tech Stack
- **Language**: TypeScript
- **Framework**: Next.js 15.5.1 (App Router)
- **UI**: React 19 + Tailwind CSS
- **Components**: shadcn/ui style
- **Icons**: Lucide React
- **State**: React hooks (useState, useEffect)

### Dependencies (Already Installed)
```json
{
  "react": "19.0.0",
  "next": "15.5.1",
  "typescript": "5.7.2",
  "lucide-react": "^0.263.1",
  "tailwindcss": "^3.4.1"
}
```

---

## 3. Module Architecture

### Component Structure

```
src/components/ai/
├── workout-enhancer-button.tsx  (ALREADY EXISTS - reuse this)
└── enhancement-results-display.tsx  (NEW - to be created)

src/app/add/
└── edit/page.tsx  (MODIFY - add AI button and results display)

src/app/api/instagram-fetch/
└── route.ts  (MODIFY - add enhanceable flag to response)
```

### Data Flow

```
User uploads image/pastes Instagram URL
    ↓
OCR/Instagram API extracts text
    ↓
Page shows extracted text in editable field
    ↓
User clicks "✨ Enhance with AI" button
    ↓
Frontend calls POST /api/ai/enhance-workout
    ↓
Backend AI processes text (Claude Sonnet 4.5)
    ↓
API returns: { enhancedWorkout, changes[], suggestions[], cost, quotaRemaining }
    ↓
Frontend displays:
  1. Enhanced workout data (replaces table content)
  2. Changes made (e.g., "Standardized 'bp' to 'Bench Press'")
  3. Suggestions (e.g., "Consider adding warm-up sets")
  4. Cost and quota remaining
```

---

## 4. API Reference

### Existing API Endpoint (Already Deployed)

**Endpoint**: `POST /api/ai/enhance-workout`

**Request Body**:
```typescript
{
  rawText: string;           // Raw OCR or Instagram text
  enhancementType?: 'full' | 'format' | 'details' | 'optimize';  // Default: 'full'
}
```

**Response** (Success - 200):
```typescript
{
  success: true;
  enhancedWorkout: {
    workoutId: string;
    title: string;
    description?: string;
    exercises: Array<{
      id: string;
      name: string;
      sets: number;
      reps: string | number;
      weight?: string;
      restSeconds?: number;
      notes?: string;
      duration?: number;
    }>;
    workoutType?: 'standard' | 'emom' | 'amrap' | 'rounds' | 'ladder' | 'tabata';
    structure?: {
      rounds?: number;
      timePerRound?: number;
      timeLimit?: number;
      totalTime?: number;
      pattern?: string;
    };
    tags?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    aiEnhanced: true;
    aiNotes: string;
    createdAt: string;
    updatedAt: string;
  };
  changes: string[];         // e.g., ["Standardized 'bp' to 'Bench Press'", "Added rest periods"]
  suggestions: string[];     // e.g., ["Consider adding warm-up sets"]
  cost: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;   // In dollars (e.g., 0.0123)
  };
  quotaRemaining: number;    // AI enhancements remaining this month
}
```

**Response** (Error - 403):
```typescript
{
  success: false;
  error: "AI enhancement quota exceeded";
  quotaRemaining: 0;
  upgradeUrl: "/settings/subscription";
}
```

**Response** (Error - 429):
```typescript
{
  success: false;
  error: "Rate limit exceeded. Please try again in a few minutes.";
}
```

**Response** (Error - 500):
```typescript
{
  success: false;
  error: "AI enhancement failed: [error message]";
}
```

---

## 5. Implementation Tasks

### Task 1: Create Enhancement Results Display Component (1 hour)

**File**: `src/components/ai/enhancement-results-display.tsx`

**Requirements**:
- Display changes made by AI (collapsible list)
- Display suggestions (collapsible list)
- Show cost and quota remaining
- Visual design: Use cyan/purple theme (match app style)
- Icons: CheckCircle2 for changes, Lightbulb for suggestions, DollarSign for cost

**Component API**:
```typescript
interface EnhancementResultsDisplayProps {
  changes: string[];
  suggestions: string[];
  cost: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  quotaRemaining: number;
  onDismiss?: () => void;
}

export function EnhancementResultsDisplay(props: EnhancementResultsDisplayProps) {
  // Implementation
}
```

**Design**:
- Card with border (border-primary/20)
- Background: bg-primary/10
- Sections: Changes, Suggestions, Cost/Quota
- Collapsible sections (start expanded)
- Dismiss button (X icon in top-right)

---

### Task 2: Integrate into Edit Page (1-2 hours)

**File**: `src/app/add/edit/page.tsx` (ALREADY EXISTS)

**Current State**:
- Page already has `WorkoutEnhancerButton` imported and integrated
- Button calls `handleAIEnhancement()` which updates exercises directly
- Page displays workout structure metadata

**What to Add**:
1. **State Management**:
   ```typescript
   const [enhancementResults, setEnhancementResults] = useState<{
     changes: string[];
     suggestions: string[];
     cost: any;
     quotaRemaining: number;
   } | null>(null);
   ```

2. **Update `handleAIEnhancement` Function**:
   ```typescript
   const handleAIEnhancement = (enhancedWorkout: any, results: any) => {
     // Update exercises (ALREADY DONE)
     setExercises(enhancedWorkout.exercises.map(...));

     // Update title, description, workoutType, structure (ALREADY DONE)
     setWorkoutTitle(enhancedWorkout.title);
     setWorkoutDescription(enhancedWorkout.description);
     setWorkoutType(enhancedWorkout.workoutType);
     setWorkoutStructure(enhancedWorkout.structure);

     // NEW: Store results for display
     setEnhancementResults({
       changes: results.changes,
       suggestions: results.suggestions,
       cost: results.cost,
       quotaRemaining: results.quotaRemaining,
     });
   };
   ```

3. **Update `WorkoutEnhancerButton` Integration**:
   ```typescript
   // Change from:
   <WorkoutEnhancerButton
     rawText={workoutData.content}
     onEnhanced={handleAIEnhancement}
     size="sm"
     variant="outline"
   />

   // To:
   <WorkoutEnhancerButton
     rawText={workoutData.content}
     onEnhanced={(enhancedWorkout, results) =>
       handleAIEnhancement(enhancedWorkout, results)
     }
     size="sm"
     variant="outline"
   />
   ```

4. **Add Results Display**:
   ```tsx
   {enhancementResults && (
     <EnhancementResultsDisplay
       changes={enhancementResults.changes}
       suggestions={enhancementResults.suggestions}
       cost={enhancementResults.cost}
       quotaRemaining={enhancementResults.quotaRemaining}
       onDismiss={() => setEnhancementResults(null)}
     />
   )}
   ```

---

### Task 3: Update WorkoutEnhancerButton Component (30 min)

**File**: `src/components/ai/workout-enhancer-button.tsx` (ALREADY EXISTS)

**Current Callback Signature**:
```typescript
onEnhanced: (enhancedWorkout: any) => void
```

**New Callback Signature**:
```typescript
onEnhanced: (enhancedWorkout: any, results: {
  changes: string[];
  suggestions: string[];
  cost: any;
  quotaRemaining: number;
}) => void
```

**Changes Needed**:
```typescript
// In the API call success handler:
if (data.success) {
  // OLD:
  onEnhanced(data.enhancedWorkout);

  // NEW:
  onEnhanced(data.enhancedWorkout, {
    changes: data.changes || [],
    suggestions: data.suggestions || [],
    cost: data.cost,
    quotaRemaining: data.quotaRemaining,
  });
}
```

---

### Task 4: Add Enhancement Flag to Instagram API (30 min)

**File**: `src/app/api/instagram-fetch/route.ts`

**Current Response** (approximate):
```typescript
return NextResponse.json({
  success: true,
  workout: parsedWorkout,
  source: 'instagram',
});
```

**New Response**:
```typescript
return NextResponse.json({
  success: true,
  workout: parsedWorkout,
  source: 'instagram',
  // NEW: Add enhancement metadata
  enhanceable: true,
  rawText: parsedWorkout.content || parsedWorkout.description,
  estimatedCost: 0.01,  // Approximate AI enhancement cost
});
```

**Note**: This is optional. The edit page already has the enhancement button, so Instagram imports will automatically have access to it. This just adds metadata for future UI improvements.

---

## 6. Testing Checklist

### Manual Testing

**Test Case 1: OCR Enhancement**
1. Go to `/add`
2. Upload a workout screenshot (e.g., HYROX EMOM workout)
3. Wait for OCR to complete
4. Click "Review & Edit"
5. Click "✨ Enhance with AI" button
6. Verify:
   - Loading state shows spinner
   - Button is disabled during enhancement
   - Enhanced workout populates table
   - Changes and suggestions are displayed
   - Cost and quota are shown
   - Workout structure is detected (e.g., "EMOM - 5 Rounds")

**Test Case 2: Instagram Enhancement**
1. Go to `/add`
2. Paste Instagram URL with workout caption
3. Click "Fetch Workout"
4. Wait for Instagram fetch to complete
5. Click "Review & Edit"
6. Click "✨ Enhance with AI" button
7. Verify same results as Test Case 1

**Test Case 3: Quota Exceeded**
1. Exhaust AI enhancement quota (use multiple times)
2. Click "✨ Enhance with AI" button
3. Verify:
   - Error message displays: "AI enhancement quota exceeded"
   - Upgrade prompt is shown
   - Link to `/settings/subscription` is provided

**Test Case 4: Rate Limit**
1. Click "✨ Enhance with AI" button 30+ times rapidly
2. Verify:
   - Error message displays: "Rate limit exceeded"
   - Button is re-enabled after dismissing error

**Test Case 5: AI Enhancement Improves Data**
1. Use messy OCR text (e.g., "bp 3x10 @ 185" instead of "Bench Press - 3 sets x 10 reps @ 185 lbs")
2. Click "✨ Enhance with AI" button
3. Verify:
   - Exercise names are standardized
   - Sets/reps are properly formatted
   - Weights include units
   - Changes list shows what was improved

---

## 7. Code Examples

### Example: EnhancementResultsDisplay Component

```typescript
'use client'

import { useState } from 'react'
import { CheckCircle2, Lightbulb, DollarSign, ChevronDown, ChevronUp, X } from 'lucide-react'

interface EnhancementResultsDisplayProps {
  changes: string[]
  suggestions: string[]
  cost: {
    inputTokens: number
    outputTokens: number
    estimatedCost: number
  }
  quotaRemaining: number
  onDismiss?: () => void
}

export function EnhancementResultsDisplay({
  changes,
  suggestions,
  cost,
  quotaRemaining,
  onDismiss,
}: EnhancementResultsDisplayProps) {
  const [changesExpanded, setChangesExpanded] = useState(true)
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true)

  return (
    <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg relative">
      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-text-secondary hover:text-text-primary"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Title */}
      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        AI Enhancement Complete
      </h3>

      {/* Changes Section */}
      {changes.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setChangesExpanded(!changesExpanded)}
            className="flex items-center gap-2 text-xs font-medium text-text-primary mb-2 hover:text-primary"
          >
            {changesExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Changes Made ({changes.length})
          </button>
          {changesExpanded && (
            <ul className="space-y-1 text-xs text-text-secondary">
              {changes.map((change, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
            className="flex items-center gap-2 text-xs font-medium text-text-primary mb-2 hover:text-secondary"
          >
            {suggestionsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Suggestions ({suggestions.length})
          </button>
          {suggestionsExpanded && (
            <ul className="space-y-1 text-xs text-text-secondary">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Lightbulb className="h-3 w-3 text-secondary mt-0.5 flex-shrink-0" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Cost & Quota Section */}
      <div className="flex items-center gap-4 text-xs text-text-secondary border-t border-primary/20 pt-2">
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          <span>Cost: ${cost.estimatedCost.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Quota: {quotaRemaining} remaining</span>
        </div>
      </div>
    </div>
  )
}
```

---

### Example: Updated handleAIEnhancement in Edit Page

```typescript
const handleAIEnhancement = (
  enhancedWorkout: any,
  results: {
    changes: string[];
    suggestions: string[];
    cost: any;
    quotaRemaining: number;
  }
) => {
  // Update exercises
  if (enhancedWorkout.exercises && enhancedWorkout.exercises.length > 0) {
    setExercises(
      enhancedWorkout.exercises.map((exercise: any) => ({
        id: exercise.id || `ex-${Date.now()}-${Math.random()}`,
        name: exercise.name || '',
        sets: exercise.sets || 1,
        reps: exercise.reps || '',
        weight: exercise.weight || '',
        restSeconds: exercise.restSeconds || null,
        notes: exercise.notes || '',
        duration: exercise.duration || null,
      }))
    )
  }

  // Update title and description
  if (enhancedWorkout.title) {
    setWorkoutTitle(enhancedWorkout.title)
  }
  if (enhancedWorkout.description) {
    setWorkoutDescription(enhancedWorkout.description)
  }

  // Update workout type and structure
  if (enhancedWorkout.workoutType) {
    setWorkoutType(enhancedWorkout.workoutType)
  }
  if (enhancedWorkout.structure) {
    setWorkoutStructure(enhancedWorkout.structure)
  }

  // Store results for display
  setEnhancementResults({
    changes: results.changes,
    suggestions: results.suggestions,
    cost: results.cost,
    quotaRemaining: results.quotaRemaining,
  })
}
```

---

## 8. Environment & Configuration

### Environment Variables (Already Configured)
```bash
# AWS Bedrock (for AI)
AWS_REGION=us-east-1
AWS_BEDROCK_REGION=us-east-1  # Optional, defaults to AWS_REGION

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# DynamoDB
DYNAMODB_USERS_TABLE=spotter-users
DYNAMODB_WORKOUTS_TABLE=spotter-workouts
```

**Note**: All environment variables are already configured in AWS Parameter Store and injected into the ECS task. No additional configuration needed.

---

## 9. Deployment

### Deployment Process
1. Make code changes locally
2. Test thoroughly (see Testing Checklist)
3. Commit to git
4. Build and push Docker image:
   ```bash
   npm run build
   docker build -t spotter-app .
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
   docker tag spotter-app:latest <account>.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
   docker push <account>.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
   ```
5. Force new ECS deployment:
   ```bash
   aws ecs update-service --cluster spotter-cluster --service spotter-service --force-new-deployment
   ```
6. Monitor logs:
   ```bash
   aws logs tail /ecs/spotter-app --region us-east-1 --follow
   ```

### Post-Deployment Verification
1. Go to https://kinexfit.com/add
2. Upload a workout screenshot
3. Click "Review & Edit"
4. Click "✨ Enhance with AI" button
5. Verify enhancement works and results display correctly

---

## 10. Success Criteria

This module is complete when:
- ✅ "Enhance with AI" button works on OCR results page
- ✅ "Enhance with AI" button works on Instagram import page
- ✅ Enhancement results (changes, suggestions, cost, quota) are displayed
- ✅ Quota exceeded shows upgrade prompt
- ✅ Rate limiting shows appropriate error message
- ✅ All manual tests pass
- ✅ Deployed to production and verified working

---

## 11. Additional Context

### Project Structure
```
spot-buddy-web/
├── src/
│   ├── app/
│   │   ├── add/
│   │   │   └── edit/page.tsx       # Edit page (modify this)
│   │   └── api/
│   │       ├── ai/
│   │       │   └── enhance-workout/route.ts  # API endpoint (already deployed)
│   │       └── instagram-fetch/route.ts      # Instagram API (optional modify)
│   ├── components/
│   │   └── ai/
│   │       ├── workout-enhancer-button.tsx   # Button component (modify callback)
│   │       └── enhancement-results-display.tsx  # New component (create this)
│   └── lib/
│       └── ai/
│           ├── bedrock-client.ts     # Bedrock client (already deployed)
│           └── workout-enhancer.ts   # Enhancement logic (already deployed)
```

### Color Theme
- **Primary (Cyan)**: `bg-primary`, `text-primary`, `border-primary`
- **Secondary (Purple)**: `bg-secondary`, `text-secondary`, `border-secondary`
- **Background**: `bg-background` (dark navy)
- **Text**: `text-text-primary`, `text-text-secondary`

### Icons (Lucide React)
- **Changes**: `CheckCircle2`
- **Suggestions**: `Lightbulb`
- **Cost**: `DollarSign`
- **Expand/Collapse**: `ChevronDown`, `ChevronUp`
- **Dismiss**: `X`
- **AI/Sparkles**: `Sparkles`

---

## 12. Questions & Clarifications

If you have questions while implementing, refer to:
1. **[CLAUDE.md](CLAUDE.md)** - Project instructions for AI assistants
2. **[STATUS.md](STATUS.md)** - Current project status
3. **[PHASE-6-PROGRESS.md](PHASE-6-PROGRESS.md)** - AI features implementation details
4. Existing component: `src/components/ai/workout-enhancer-button.tsx` for reference

---

**Document Version**: 1.0
**Ready for Implementation**: ✅ Yes
**Estimated Time**: 3-4 hours total
**Priority**: Medium (optional for v1.5, high impact for v1.6)
