# Pre-Test Verification Report
## Generated: 2025-11-28

## ✅ Components Verified

### 1. Auth System - READY ✅

**File:** [src/lib/auth-options.ts](src/lib/auth-options.ts)

**Duplicate User Fix Deployed:**
- ✅ PrismaAdapter removed (was causing duplicates)
- ✅ signIn callback added (lines 242-291)
- ✅ Checks DynamoDB by email BEFORE creating user
- ✅ Reuses existing user ID if found
- ✅ Only creates new UUID for truly new users
- ✅ Deployed to production (ECS deployment completed 14:28:40)

**Log messages to watch for:**
- `[Auth:SignIn] ✓ Existing user found for <email> - ID: <uuid>`
- `[Auth:SignIn] ✓ Creating new user for <email> - ID: <uuid>`
- `[Auth:JWT] Initial sign-in via google for user <uuid>`

### 2. DynamoDB Setup - NEEDS ATTENTION ⚠️

**Table:** spotter-users
- ✅ Primary key: `id` (HASH)
- ✅ GSI: `email-index` (ACTIVE)
- ❌ **MISSING GSI: `stripeCustomerId-index`** (CRITICAL for webhooks)

**Impact:**
- Webhooks will fall back to email lookup (slower but functional)
- Auto-linking of stripeCustomerId won't work optimally
- Performance degradation for subscription events

**Fix Available:**
```bash
node scripts/create-stripe-customer-gsi.mjs
```
**Time:** 5-10 minutes (table remains usable during creation)

**Current State:**
- ✅ No users in database (clean slate for testing)

### 3. Stripe Integration - READY ✅

**Checkout API:** [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts)
- ✅ Gets authenticated userId (line 24)
- ✅ Creates Stripe customer with `metadata: { userId }` (line 45)
- ✅ Saves stripeCustomerId to DynamoDB (line 49)
- ✅ Passes userId + tier in checkout metadata (line 59)
- ✅ Sets client_reference_id (line 70)
- ✅ Includes metadata in subscription_data (line 74-76)

**Webhook Handler:** [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)
- ✅ Signature verification (line 15)
- ✅ checkout.session.completed handler (line 52-90)
- ✅ subscription.created/updated handler (line 92-133)
- ✅ invoice.payment.succeeded/failed handlers (line 153-182)
- ✅ User resolution with multiple fallbacks:
  1. stripeCustomerId lookup (line 309) - **Requires missing GSI**
  2. Email lookup (line 325) - **Works with existing email-index**
  3. Fetch customer from Stripe (line 343) - **Ultimate fallback**
- ✅ Auto-linking stripeCustomerId to user (line 329-332)

**Environment Variables (SSM):**
- ✅ STRIPE_SECRET_KEY (updated 2025-11-26)
- ✅ STRIPE_WEBHOOK_SECRET (updated 2025-11-26)
- ✅ STRIPE_PUBLISHABLE_KEY (updated 2025-11-26)
- ✅ STRIPE_PRICE_CORE (updated 2025-11-26)
- ✅ STRIPE_PRICE_PRO (updated 2025-11-26)
- ✅ STRIPE_PRICE_ELITE (updated 2025-11-26)

**Return URLs:**
- Success: `https://kinexfit.com/settings?session_id={CHECKOUT_SESSION_ID}&success=true&refresh_session=true`
- Cancel: `https://kinexfit.com/settings?canceled=true`

### 4. Session Refresh - READY ✅

**File:** [src/app/settings/page.tsx](src/app/settings/page.tsx)
- ✅ Detects `refresh_session=true` parameter
- ✅ Aggressive refresh: 1s, 2s, 3s delays
- ✅ Page reload after 3 seconds
- ✅ Uses `updateSession()` from useSession hook

**JWT Callback:** [src/lib/auth-options.ts:377-400](src/lib/auth-options.ts#L377-L400)
- ✅ Fetches subscription tier from DynamoDB on every token refresh
- ✅ Updates token with: subscriptionTier, subscriptionStatus, ocrQuota
- ✅ Token size monitoring (warns at 3500 bytes, limit is 4096)

### 5. Testing Scripts - READY ✅

**Available Scripts:**
- ✅ `list-all-users.mjs` - Shows all users grouped by email
- ✅ `delete-all-users.mjs` - Removes all users (requires --confirm)
- ✅ `delete-all-users-by-email.mjs` - Removes specific email's users
- ✅ `verify-single-user.mjs` - **NEW** - Verifies no duplicates exist
- ✅ `check-user-status.mjs` - Shows specific user's subscription
- ✅ `create-stripe-customer-gsi.mjs` - **NEW** - Creates missing GSI

**Test Guide:**
- ✅ [test-duplicate-user-fix.md](scripts/test-duplicate-user-fix.md) - Complete testing procedure

## ⚠️ Pre-Test Requirements

### CRITICAL - Before Testing:

1. **Create Missing GSI** (5-10 minutes):
   ```bash
   node scripts/create-stripe-customer-gsi.mjs
   ```
   **Why:** Webhook performance and reliability

2. **Verify Stripe Webhook Endpoint Configured:**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Check endpoint: `https://kinexfit.com/api/stripe/webhook`
   - Required events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Clear Browser State:**
   - Sign out from https://kinexfit.com
   - Clear cookies for cannashieldct.com domain
   - Close all browser tabs

### RECOMMENDED - For Best Results:

4. **Monitor Logs During Testing:**
   ```bash
   MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --follow --format short --filter-pattern "Auth:SignIn OR Auth:JWT OR Webhook"
   ```

5. **Have Stripe Test Card Ready:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

## 📊 Test Flow

### Phase 1: Single User Verification

1. Sign in with OAuth (Google or Facebook)
2. Verify ONLY ONE user created:
   ```bash
   node scripts/verify-single-user.mjs
   ```
3. Sign out and sign in again
4. Verify SAME user ID (no new user):
   ```bash
   node scripts/verify-single-user.mjs
   ```

**Expected:** Same user ID, no duplicates

### Phase 2: Subscription Upgrade Test

1. Go to Settings while signed in
2. Click "Upgrade to Pro" or "Upgrade to Elite"
3. Complete Stripe checkout with test card
4. Wait for redirect + 5 seconds
5. Verify tier shows upgraded in UI
6. Verify database shows correct tier:
   ```bash
   node scripts/verify-single-user.mjs your-email@example.com
   ```

**Expected:** Single user, upgraded tier, UI matches database

### Phase 3: Webhook Verification

Check CloudWatch logs for successful webhook processing:
```bash
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 5m --format short --filter-pattern "Webhook:evt_"
```

**Expected logs:**
- `[Webhook:evt_xxx] checkout.session.completed:`
- `[Webhook:evt_xxx] Successfully updated user <uuid> subscription`
- No errors about "User not found"

## 🔍 Known Issues & Workarounds

### Issue 1: Missing stripeCustomerId-index GSI

**Impact:** Slower webhook processing, relies on email fallback

**Workaround:** Webhook has 3-layer fallback (stripeCustomerId → email → Stripe API)

**Fix:** Run `node scripts/create-stripe-customer-gsi.mjs` (5-10 min)

### Issue 2: Prisma DATABASE_URL Warning

**Impact:** None (we use DynamoDB, not Prisma)

**Log:** `[Warning] Prisma client not initialized`

**Workaround:** Ignore - Prisma is deprecated, DynamoDB is source of truth

## ✅ Success Criteria

After all tests complete, you should see:

- ✅ Only ONE user per email in DynamoDB
- ✅ Same user ID across sign-in/sign-out cycles
- ✅ Subscription upgrade sticks to single user
- ✅ UI reflects correct tier immediately (or after 5s)
- ✅ Logs show `[Auth:SignIn] ✓ Existing user found` on repeat logins
- ✅ Webhooks show `Successfully updated user <uuid> subscription`
- ✅ No "User not found" errors in logs

## 🚨 Failure Indicators

If you see ANY of these, the fix didn't work:

- ❌ Multiple users with same email in database
- ❌ New UUID created on every sign-in
- ❌ Logs show `[Auth:SignIn] ✓ Creating new user` on repeat logins
- ❌ Subscription upgrade goes to different user ID
- ❌ UI stuck on "free" after successful checkout
- ❌ Webhook errors: "User <uuid> not found in DynamoDB"

## 📝 Next Steps After Verification

Once all tests pass:
1. ✅ Duplicate user bug confirmed fixed
2. 📱 Create mobile backend API endpoints
3. 🧪 Test mobile checkout flow
4. 🎯 Deploy to production (already deployed!)

## 🛠️ Tools Summary

| Tool | Purpose | Command |
|------|---------|---------|
| Verify no duplicates | Check single user per email | `node scripts/verify-single-user.mjs [email]` |
| List all users | See all users grouped by email | `node scripts/list-all-users.mjs` |
| Delete all users | Clean database | `node scripts/delete-all-users.mjs --confirm` |
| Check user status | View specific user subscription | `node scripts/check-user-status.mjs <userId>` |
| Create GSI | Add stripeCustomerId index | `node scripts/create-stripe-customer-gsi.mjs` |
| Monitor logs | Watch auth/webhook events | `aws logs tail /ecs/spotter-app --follow` |

## 🎯 Ready to Test?

**Current Status:**
- ✅ Code deployed to production
- ✅ Database clean (no users)
- ✅ Stripe configuration verified
- ⚠️ Missing stripeCustomerId-index GSI (recommended to create)
- ✅ Testing scripts ready

**Recommended order:**
1. Create stripeCustomerId-index GSI (5-10 min)
2. Clear browser state (sign out, clear cookies)
3. Run Phase 1: Single User Verification
4. Run Phase 2: Subscription Upgrade Test
5. Run Phase 3: Webhook Verification
