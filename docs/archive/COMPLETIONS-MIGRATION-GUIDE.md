# Workout Completions Migration Guide

## Overview

This guide walks you through migrating workout completions from localStorage to DynamoDB and testing the new completions API.

## What Changed

### Before (localStorage-only)
- ❌ No cross-device sync
- ❌ Data lost if browser cleared
- ❌ Limited to 5-10MB storage
- ✅ Fast offline access

### After (DynamoDB + localStorage)
- ✅ Full cross-device sync
- ✅ Persistent cloud storage
- ✅ Unlimited storage
- ✅ Still has offline fallback
- ✅ Advanced querying (date ranges, stats)

## Architecture

```
User Action (Complete Workout)
        ↓
    Session Page
        ↓
   ┌────┴────┐
   ↓         ↓
localStorage  DynamoDB API
(offline)    (cloud sync)
   ↓            ↓
Cache     Completions Table
(fallback)   (source of truth)
```

## Files Created/Modified

### New Files
- `src/lib/cache-utils.ts` - Cache utilities with TTL support
- `src/app/api/workouts/completions/route.ts` - List/create completions
- `src/app/api/workouts/completions/stats/route.ts` - Get stats
- `src/app/api/workouts/[id]/completions/route.ts` - Workout-specific completions
- `scripts/create-completions-table.mjs` - Create DynamoDB table
- `scripts/test-completions-api.mjs` - API test script
- `public/admin/migrate-completions.html` - Migration tool

### Modified Files
- `src/lib/dynamodb.ts` - Added `dynamoDBWorkoutCompletions` operations
- `src/lib/timer-utils.ts` - Now uses cache-utils with TTL
- `src/app/page.tsx` - Fetches stats from DynamoDB
- `src/app/library/page.tsx` - Fetches completion counts from DynamoDB
- `src/app/workout/[id]/session/page.tsx` - Saves to both localStorage and DynamoDB

## Testing & Migration

### Step 1: Check Your Data

1. Open your browser's Developer Tools (F12)
2. Go to **Application** → **Local Storage** → `http://localhost:3000` (or your domain)
3. Look for the key: `completedWorkouts`
4. Note how many entries you have

### Step 2: Start Dev Server (if testing locally)

```bash
npm run dev
```

Wait for the server to start at http://localhost:3000

### Step 3: Run Migration Tool

**Option A: Browser-Based Migration (Recommended)**

1. Navigate to: http://localhost:3000/admin/migrate-completions.html
2. Click **"1. Test API Connection"** - should show ✅
3. Click **"2. Analyze Data"** - shows localStorage completions count
4. Click **"3. Start Migration"** - migrates all data to DynamoDB

**Option B: Command-Line API Test**

```bash
# Make sure dev server is running first!
node scripts/test-completions-api.mjs
```

### Step 4: Verify Migration

1. **Check DynamoDB Table:**
   ```bash
   aws dynamodb scan \
     --table-name spotter-workout-completions \
     --select COUNT
   ```

2. **Check via API:**
   - Go to http://localhost:3000
   - Check your stats (should match your localStorage data)

3. **Check in App:**
   - Your workout streak should be preserved
   - Library page should show completion counts
   - Stats on home page should be accurate

## API Endpoints

### `POST /api/workouts/completions`
Create a new workout completion record.

**Request:**
```json
{
  "workoutId": "workout-123",
  "completedAt": "2025-01-15T14:30:00.000Z",
  "completedDate": "2025-01-15",
  "durationSeconds": 1800,
  "durationMinutes": 30,
  "notes": "Great workout!"
}
```

**Response:**
```json
{
  "success": true,
  "completion": {
    "userId": "user-456",
    "completionId": "1736952600000-abc123",
    "workoutId": "workout-123",
    "completedAt": "2025-01-15T14:30:00.000Z",
    "completedDate": "2025-01-15",
    "durationSeconds": 1800,
    "durationMinutes": 30,
    "notes": "Great workout!",
    "createdAt": "2025-01-15T14:30:00.000Z"
  }
}
```

### `GET /api/workouts/completions`
List all completions for the user.

**Query Parameters:**
- `limit` (optional): Max results (default: unlimited)
- `workoutId` (optional): Filter by specific workout
- `startDate` (optional): Filter by date range start (YYYY-MM-DD)
- `endDate` (optional): Filter by date range end (YYYY-MM-DD)

**Example:**
```
GET /api/workouts/completions?limit=10
GET /api/workouts/completions?workoutId=workout-123
GET /api/workouts/completions?startDate=2025-01-01&endDate=2025-01-31
```

### `GET /api/workouts/completions/stats`
Get workout statistics.

**Response:**
```json
{
  "stats": {
    "thisWeek": 5,
    "total": 42,
    "streak": 7,
    "hoursTrained": 31.5
  }
}
```

### `GET /api/workouts/[id]/completions`
Get all completions for a specific workout.

**Response:**
```json
{
  "workoutId": "workout-123",
  "count": 3,
  "completions": [...]
}
```

## DynamoDB Table Schema

**Table Name:** `spotter-workout-completions`

**Keys:**
- Partition Key: `userId` (String)
- Sort Key: `completionId` (String, timestamp-based)

**Attributes:**
- `workoutId` - Reference to the workout
- `completedAt` - ISO timestamp when completed
- `completedDate` - ISO date (YYYY-MM-DD)
- `durationSeconds` - Duration in seconds
- `durationMinutes` - Duration in minutes
- `notes` - Optional notes
- `createdAt` - Record creation timestamp

## Troubleshooting

### Migration Tool Shows "0 completions in localStorage"

**Cause:** No data to migrate, or you're on a different domain.

**Solution:** Check if you have `completedWorkouts` in localStorage for your domain.

### API Returns 401 Unauthorized

**Cause:** Not logged in.

**Solution:** Sign in to your account first, then run the migration.

### Migration Fails with 500 Error

**Cause:** DynamoDB table doesn't exist or permissions issue.

**Solution:**
1. Verify table exists: `aws dynamodb describe-table --table-name spotter-workout-completions`
2. Check IAM permissions for SpotterTaskRole

### Stats Show Zero After Migration

**Cause:** Migration didn't complete or data not saved.

**Solution:**
1. Check migration log for errors
2. Verify DynamoDB has data: `aws dynamodb scan --table-name spotter-workout-completions --select COUNT`
3. Check browser console for API errors

## Deployment Checklist

Before deploying to production:

- [x] DynamoDB table created
- [x] IAM permissions updated
- [ ] Environment variable set (if using custom table name)
- [ ] ECS task definition updated (if needed)
- [ ] Test in production with one completion
- [ ] Run migration for your account
- [ ] Verify stats are correct

## Cache Behavior

### Timer State
- **TTL:** 24 hours
- **Purpose:** Resume workouts the next day
- **Invalidation:** Automatic on expiry

### Workout Data
- **Source:** DynamoDB (primary), localStorage (fallback)
- **Refresh:** On every page load
- **TTL:** Not currently implemented (fetches fresh data)

### Completions
- **Source:** DynamoDB (primary), localStorage (fallback)
- **When saved:** Immediately on workout completion
- **Sync:** Automatic (both localStorage + DynamoDB)

## Future Enhancements

Potential improvements for the completions system:

1. **Performance Metrics:** Track more detailed workout metrics (sets completed, weight lifted, etc.)
2. **Completion Notes:** Allow users to add detailed notes per completion
3. **Photos:** Attach progress photos to completions
4. **Analytics Dashboard:** Advanced stats and trends
5. **Social Features:** Share completions, compare with friends
6. **Achievements:** Unlock badges based on completion milestones

## Questions?

Check the main documentation or create an issue on GitHub.
