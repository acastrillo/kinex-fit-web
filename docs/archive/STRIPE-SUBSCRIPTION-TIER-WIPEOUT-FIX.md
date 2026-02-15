# Stripe Subscription Tier Wipeout Bug - Root Cause & Fix

**Date**: November 30, 2025
**Severity**: Critical - User subscription data loss
**Status**: ✅ Fixed

## Issue Summary

Users were being downgraded from paid subscription tiers (Core, Pro, Elite) to "free" tier every time they signed in via OAuth (Google/Facebook), despite successful Stripe checkout and webhook confirmation.

## Symptoms

1. User completes Stripe checkout successfully
2. Stripe webhook fires and updates user to paid tier (verified in logs)
3. User signs in via Google OAuth in incognito mode
4. User's subscription tier shows "free" instead of paid tier
5. DynamoDB shows user record was recreated with fresh `createdAt` timestamp
6. Subscription data (tier, Stripe customer ID, etc.) completely wiped out

## Root Cause

**Two critical bugs in NextAuth.js callbacks:**

### Bug #1: JWT Callback (Primary Issue)
**Location**: `src/lib/auth-options.ts:454-459` (before fix)

The `jwt` callback runs on **every JWT token refresh** (every 5 minutes and on every sign-in). It was calling `dynamoDBUsers.upsert()` with only 4 fields:

```typescript
// BEFORE (BROKEN)
await dynamoDBUsers.upsert({
  id: token.id as string,
  email: token.email as string,
  firstName: (token.firstName as string | null) ?? null,
  lastName: (token.lastName as string | null) ?? null,
  // ❌ NO SUBSCRIPTION DATA - defaults to "free"!
});
```

### Bug #2: SignIn Callback (Secondary Issue)
**Location**: `src/lib/auth-options.ts:303-325` (before fix)

The `signIn` callback runs once on initial OAuth sign-in. It was also calling `upsert()` without preserving subscription data.

### Why This Caused Data Loss

The `upsert()` function in `src/lib/dynamodb.ts` uses DynamoDB's `PutCommand`, which **replaces the entire item**. Any fields not included in the upsert call get set to their default values:

```typescript
// src/lib/dynamodb.ts:192
subscriptionTier: user.subscriptionTier || "free"  // ❌ Defaults to "free"!
```

### Execution Flow

1. **Stripe Checkout** → Webhook sets user to "elite" ✅
2. **User Signs In** → signIn callback wipes subscription to "free" ❌
3. **JWT Refresh** → jwt callback wipes subscription to "free" again ❌
4. **Every 5 minutes** → jwt callback keeps wiping subscription to "free" ❌

## The Fix

Modified both callbacks to **fetch existing user data first** and **preserve all subscription fields** when calling upsert.

### Fixed JWT Callback
**Location**: `src/lib/auth-options.ts:415-466`

```typescript
// AFTER (FIXED)
// Fetch existing user first to preserve subscription data
const existingUserForJWT = await dynamoDBUsers.get(token.id as string).catch(() => null);

if (existingUserForJWT) {
  // User exists - preserve ALL subscription and usage data
  await dynamoDBUsers.upsert({
    id: token.id as string,
    email: token.email as string,
    firstName: (token.firstName as string | null) ?? null,
    lastName: (token.lastName as string | null) ?? null,
    // ✅ Preserve existing subscription data
    subscriptionTier: existingUserForJWT.subscriptionTier,
    subscriptionStatus: existingUserForJWT.subscriptionStatus,
    subscriptionStartDate: existingUserForJWT.subscriptionStartDate,
    subscriptionEndDate: existingUserForJWT.subscriptionEndDate,
    trialEndsAt: existingUserForJWT.trialEndsAt,
    stripeCustomerId: existingUserForJWT.stripeCustomerId,
    stripeSubscriptionId: existingUserForJWT.stripeSubscriptionId,
    // ✅ Preserve usage tracking
    ocrQuotaUsed: existingUserForJWT.ocrQuotaUsed,
    ocrQuotaLimit: existingUserForJWT.ocrQuotaLimit,
    ocrQuotaResetDate: existingUserForJWT.ocrQuotaResetDate,
    workoutsSaved: existingUserForJWT.workoutsSaved,
    aiRequestsUsed: existingUserForJWT.aiRequestsUsed,
    aiRequestsLimit: existingUserForJWT.aiRequestsLimit,
    lastAiRequestReset: existingUserForJWT.lastAiRequestReset,
    trainingProfile: existingUserForJWT.trainingProfile,
  });
}
```

### Fixed SignIn Callback
**Location**: `src/lib/auth-options.ts:301-325`

Same pattern - fetch existing user, preserve all subscription fields:

```typescript
// AFTER (FIXED)
if (existingUser) {
  // Update with latest profile info from OAuth provider
  // CRITICAL: Preserve subscription data to prevent wiping out paid tier!
  await dynamoDBUsers.upsert({
    id: existingUser.id,
    email: user.email,
    firstName: (user as any).firstName || existingUser.firstName || null,
    lastName: (user as any).lastName || existingUser.lastName || null,
    // ✅ Preserve existing subscription data
    subscriptionTier: existingUser.subscriptionTier,
    subscriptionStatus: existingUser.subscriptionStatus,
    // ... (all subscription fields)
  });
}
```

## Files Modified

1. `src/lib/auth-options.ts` - Fixed both signIn and jwt callbacks
2. Deployed to production via Docker build → ECR → ECS

## Verification

✅ User tested with another account - subscription tier preserved after sign-in
✅ Original account (acastrillo87@gmail.com) confirmed at Elite tier
✅ No more "createdAt" timestamp changes on sign-in
✅ Subscription data persists across sign-ins

## Prevention

### Code Review Checklist

When working with `dynamoDBUsers.upsert()`:

- [ ] Are you passing ALL critical fields that should be preserved?
- [ ] Remember: `PutCommand` REPLACES the entire item
- [ ] If updating profile data, fetch existing user first
- [ ] Preserve: subscription tier, status, Stripe IDs, usage quotas, dates
- [ ] Test sign-in flow after ANY changes to auth callbacks

### Testing Procedure

1. Set user to paid tier in DynamoDB
2. Sign out completely
3. Open incognito window
4. Sign in via OAuth
5. Verify tier is preserved (not reset to "free")
6. Check DynamoDB - `createdAt` should NOT change

## Related Issues

This same pattern affects any field that should persist across sign-ins:
- Training profiles
- Usage quotas
- PR records
- User preferences

**Rule**: Never call `upsert()` in auth callbacks without preserving critical user data.

## Additional Notes

- The jwt callback runs silently every 5 minutes, making this bug hard to detect
- Stripe webhooks were working correctly - the issue was purely in auth flow
- This explains previous reports of "duplicate user" issues - users were being recreated on sign-in
