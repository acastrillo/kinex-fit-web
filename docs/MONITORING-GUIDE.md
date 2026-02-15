# Production Monitoring Guide

This guide explains how to monitor and debug the Spot Buddy production application running on AWS ECS.

## Table of Contents
- [Quick Reference](#quick-reference)
- [Log Groups](#log-groups)
- [Common Debugging Scenarios](#common-debugging-scenarios)
- [Stripe Event Tracking](#stripe-event-tracking)
- [Auth Flow Debugging](#auth-flow-debugging)
- [DynamoDB Queries](#dynamodb-queries)

---

## Quick Reference

### Tail Production Logs (Live)
```bash
# Last 15 minutes, following new logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 15m --follow --format short

# Last hour
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 1h --format short

# Last 24 hours (last 100 lines)
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 24h --format short | tail -100
```

### Filter Logs by Pattern
```bash
# Show only webhook events
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 1h --filter-pattern "Webhook" --format short

# Show only auth-related logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 1h --filter-pattern "Auth" --format short

# Show only errors
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 1h --filter-pattern "ERROR" --format short
```

---

## Log Groups

The production application uses the following CloudWatch log groups:

### Primary Log Group
- **Name**: `/ecs/spotter-app`
- **Contents**: All application logs (auth, webhooks, API calls)
- **Use for**: General debugging, monitoring user activity

### Other Available Groups
- `spotter-app-logs` - Older logs (historical data)
- `SpotterAppStack-SpotterServiceTaskDefwebLogGroup136949C0-yKgG1maMqfZO` - CDK-generated (usually empty)

---

## Common Debugging Scenarios

### 1. User Can't Sign In

**Check auth flow logs:**
```bash
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 30m --filter-pattern "Auth:JWT" --format short
```

**Look for:**
- `[Auth:JWT] Initial sign-in via google for user <userId>` - Successful initial sign-in
- `[Auth:JWT] ✗ Failed to sync user <userId> to DynamoDB` - DynamoDB write failure
- `[Auth:JWT] Email changed for user <userId>` - Email unexpectedly changed
- `[Auth:JWT] Google returned empty email` - Provider returned empty email

**Verify user exists in DynamoDB:**
```bash
# By email (requires GSI)
MSYS_NO_PATHCONV=1 aws dynamodb query \
  --table-name spotter-users \
  --index-name email-index \
  --key-condition-expression "email = :e" \
  --expression-attribute-values '{":e":{"S":"user@example.com"}}' \
  --region us-east-1

# By user ID
MSYS_NO_PATHCONV=1 aws dynamodb get-item \
  --table-name spotter-users \
  --key '{"id":{"S":"<userId>"}}' \
  --region us-east-1
```

### 2. Subscription Not Updating After Stripe Checkout

**Check webhook processing:**
```bash
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 1h --filter-pattern "Webhook" --format short | grep -E "(checkout.session.completed|subscription)"
```

**Look for:**
- `[Webhook] Event received: checkout.session.completed (ID: <eventId>)` - Event received
- `[Webhook:<eventId>] User verified: <email> (current tier: <tier>)` - User found
- `[Webhook:<eventId>] ✓ SUCCESS: User <userId> upgraded to <tier>` - Success!
- `[Webhook:<eventId>] ERROR: User <userId> not found in DynamoDB` - **Problem**: User doesn't exist
- `[Webhook:<eventId>] CRITICAL ERROR: Missing userId or tier in metadata` - **Problem**: Metadata not passed correctly

**Check Stripe Event Dashboard:**
1. Go to https://dashboard.stripe.com/test/events (or /live/events for production)
2. Find the `checkout.session.completed` event
3. Check `metadata` field contains:
   - `userId`: The authenticated user's ID
   - `tier`: The subscription tier (core/pro/elite)

### 3. Subscription Tier Not Reflecting in UI

**Check if tier was updated in DynamoDB:**
```bash
# Get user's current subscription tier
MSYS_NO_PATHCONV=1 aws dynamodb get-item \
  --table-name spotter-users \
  --key '{"id":{"S":"<userId>"}}' \
  --projection-expression "subscriptionTier,subscriptionStatus,stripeSubscriptionId" \
  --region us-east-1
```

**Check session refresh:**
```bash
# User should see updated tier on next page load (session refresh)
# Check logs for token refresh:
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 30m --filter-pattern "Auth:JWT" --format short | grep "tier:"
```

**Expected output:**
```
[Auth:JWT] User <userId> tier: pro/active
```

### 4. Email Unexpectedly Changed or Overwritten

**Check auth logs for email changes:**
```bash
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 24h --filter-pattern "Email changed" --format short
```

**Check for empty/null emails from providers:**
```bash
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 24h --filter-pattern "empty email" --format short
```

**Protection implemented:**
- Email only updates if provider returns a non-empty, trimmed value
- Warnings logged when provider returns empty/null email
- Previous email preserved in these cases

---

## Stripe Event Tracking

### Webhook Event Flow

1. **Checkout Completed**: `checkout.session.completed`
   - Triggered when user completes Stripe checkout
   - Updates user to paid tier in DynamoDB
   - Sets `stripeCustomerId` and `stripeSubscriptionId`

2. **Subscription Created/Updated**: `customer.subscription.created`, `customer.subscription.updated`
   - Triggered when subscription changes
   - Updates subscription status (active, trialing, past_due, etc.)
   - Usually fires AFTER checkout.session.completed

3. **Subscription Canceled**: `customer.subscription.deleted`
   - Triggered when subscription is canceled
   - Resets user to free tier

4. **Payment Events**: `invoice.payment_succeeded`, `invoice.payment_failed`
   - Tracks recurring payment status
   - Updates subscription status accordingly

### Trace a Specific Stripe Event

```bash
# Find event by ID (from Stripe Dashboard or logs)
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 3h --filter-pattern "<eventId>" --format short
```

### Common Webhook Issues

#### Missing Metadata
**Log**: `[Webhook:<eventId>] CRITICAL ERROR: Missing userId or tier in metadata`

**Fix**: Ensure checkout session is created with metadata:
```typescript
const session = await stripe.checkout.sessions.create({
  metadata: {
    userId: session.user.id,  // REQUIRED
    tier: 'pro',              // REQUIRED
  },
  // ... other fields
});
```

#### User Not Found
**Log**: `[Webhook:<eventId>] ERROR: User <userId> not found in DynamoDB`

**Cause**: User signed in but was never synced to DynamoDB, or user was deleted.

**Fix**: Check auth logs for sync failures. Ensure user exists before checkout:
```bash
MSYS_NO_PATHCONV=1 aws dynamodb get-item \
  --table-name spotter-users \
  --key '{"id":{"S":"<userId>"}}' \
  --region us-east-1
```

---

## Auth Flow Debugging

### Normal Auth Flow Logs

**Initial Sign-In (Google):**
```
[Auth:JWT] Initial sign-in via google for user cmxyz123
[Auth:JWT] ✓ User cmxyz123 synced to DynamoDB (user@example.com)
[Auth:JWT] User cmxyz123 tier: free/active
[Auth] JWT token size: 487 bytes
```

**Token Refresh (Subsequent Requests):**
```
[Auth:JWT] User cmxyz123 tier: pro/active
[Auth] JWT token size: 512 bytes
```

### Auth Warnings to Watch For

**User Not Found During Refresh:**
```
[Auth:JWT] Token refresh: user cmxyz123 (user@example.com) not found in DynamoDB.
```
**Action**: Check if user was accidentally deleted. Verify DynamoDB access.

**Email Changed Unexpectedly:**
```
[Auth:JWT] Email changed for user cmxyz123: old@example.com → new@example.com
```
**Action**: Investigate why email changed. Could be intentional (user updated profile) or a bug.

**Provider Returned Empty Email:**
```
[Auth:JWT] Google returned empty email - keeping existing: user@example.com
```
**Action**: Normal - protection is working. Email is preserved.

---

## DynamoDB Queries

### List All Users
```bash
MSYS_NO_PATHCONV=1 aws dynamodb scan \
  --table-name spotter-users \
  --projection-expression "id,email,subscriptionTier,subscriptionStatus" \
  --region us-east-1 \
  --output json
```

### Find User by Email
```bash
# Using GSI (fast)
MSYS_NO_PATHCONV=1 aws dynamodb query \
  --table-name spotter-users \
  --index-name email-index \
  --key-condition-expression "email = :e" \
  --expression-attribute-values '{":e":{"S":"user@example.com"}}' \
  --region us-east-1
```

### Get User by ID
```bash
MSYS_NO_PATHCONV=1 aws dynamodb get-item \
  --table-name spotter-users \
  --key '{"id":{"S":"<userId>"}}' \
  --region us-east-1
```

### Update User Subscription Manually (Emergency)
```bash
# Upgrade to pro
MSYS_NO_PATHCONV=1 aws dynamodb update-item \
  --table-name spotter-users \
  --key '{"id":{"S":"<userId>"}}' \
  --update-expression "SET subscriptionTier = :tier, subscriptionStatus = :status" \
  --expression-attribute-values '{":tier":{"S":"pro"},":status":{"S":"active"}}' \
  --region us-east-1
```

### Count Users by Tier
```bash
# Free tier
MSYS_NO_PATHCONV=1 aws dynamodb scan \
  --table-name spotter-users \
  --filter-expression "subscriptionTier = :tier" \
  --expression-attribute-values '{":tier":{"S":"free"}}' \
  --select COUNT \
  --region us-east-1

# Pro tier
MSYS_NO_PATHCONV=1 aws dynamodb scan \
  --table-name spotter-users \
  --filter-expression "subscriptionTier = :tier" \
  --expression-attribute-values '{":tier":{"S":"pro"}}' \
  --select COUNT \
  --region us-east-1
```

### Delete Test Users
```bash
# Query by email first to get ID
MSYS_NO_PATHCONV=1 aws dynamodb query \
  --table-name spotter-users \
  --index-name email-index \
  --key-condition-expression "email = :e" \
  --expression-attribute-values '{":e":{"S":"test@example.com"}}' \
  --projection-expression "id" \
  --region us-east-1

# Then delete by ID
MSYS_NO_PATHCONV=1 aws dynamodb delete-item \
  --table-name spotter-users \
  --key '{"id":{"S":"<userId>"}}' \
  --region us-east-1
```

---

## Logging Standards

### Log Prefixes
- `[Auth:JWT]` - JWT callback (sign-in, token refresh)
- `[Auth]` - General auth operations
- `[Webhook:<eventId>]` - Stripe webhook events (includes event ID for tracing)
- `[Dev Login]` - Development login flow

### Success Indicators
- `✓` - Operation succeeded
- `✗` - Operation failed

### Log Levels
- **Info**: Normal operations (e.g., sign-in, subscription update)
- **Warn**: Non-critical issues (e.g., missing metadata, user not found in non-critical flow)
- **Error**: Critical failures (e.g., DynamoDB unavailable, missing required data)

---

## Troubleshooting Checklist

### User Reports Subscription Issues

1. ✅ Verify user exists in DynamoDB
2. ✅ Check current subscription tier in DynamoDB
3. ✅ Search logs for webhook processing (last 24h)
4. ✅ Check Stripe Dashboard for event status
5. ✅ Verify metadata was passed correctly in checkout session
6. ✅ Check if session refresh occurred (users must reload page)

### Webhook Not Processing

1. ✅ Verify webhook endpoint is accessible (check ECS task health)
2. ✅ Check Stripe webhook secret is configured correctly
3. ✅ Search logs for signature verification failures
4. ✅ Verify event is being sent by Stripe (Dashboard → Developers → Events)
5. ✅ Check if user ID in metadata matches existing user

### Auth Issues

1. ✅ Verify Google OAuth credentials are correct
2. ✅ Check if user is being synced to DynamoDB on sign-in
3. ✅ Verify email is not being overwritten with empty values
4. ✅ Check JWT token size (should be < 4096 bytes)
5. ✅ Verify DynamoDB GSI (email-index) is active and working

---

## Production Health Checks

### Daily Checks
```bash
# Check for errors in last 24h
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 24h --filter-pattern "ERROR" --format short

# Check for auth failures
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 24h --filter-pattern "Failed to sync" --format short

# Check webhook processing
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 24h --filter-pattern "Webhook" --format short | grep -c "SUCCESS"
```

### Weekly Checks
- Review Stripe Dashboard for failed payments
- Check DynamoDB table size and read/write capacity
- Monitor CloudWatch metrics for ECS task health
- Review user count and subscription distribution

---

## Environment Variables to Verify

### Production Must Have
- ✅ `NODE_ENV=production` (disables dev login)
- ✅ `STRIPE_WEBHOOK_SECRET` (from Stripe Dashboard, not CLI)
- ✅ `AUTH_SECRET` (secure, not default)
- ✅ `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- ✅ `AWS_REGION=us-east-1`
- ✅ `DYNAMODB_USERS_TABLE=spotter-users`

### Development Only
- ❌ `DEV_LOGIN_USER_ID` - Should NOT be in production
- ❌ Dev-only credentials or test API keys

---

## Contact & Support

For urgent production issues:
1. Check this guide first
2. Review recent CloudWatch logs
3. Check Stripe Dashboard for webhook delivery status
4. Verify DynamoDB table health

**Remember**: Most issues can be diagnosed from logs. Use the log prefix filters to narrow down the problem area quickly.
