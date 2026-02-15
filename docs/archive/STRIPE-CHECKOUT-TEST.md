# Stripe Checkout Testing Guide

## The Problem Identified by Opus

**Root Cause:** User session mismatch during checkout
- You started checkout with user `cmigk5d3n0003lo018zvamhqh` (alejo@cannashieldct.com)
- But you were logged in as user `ece4e8c9-d2eb-4850-9d25-d6ff5beef11f` (test@localhost.dev)
- Webhook correctly updated the checkout user, but your logged-in session remained "free"

**Solution:** Test with a consistent user session from start to finish.

---

## Pre-Test Checklist

✅ **Deployment is complete** (1 running task in ECS)
✅ **App is accessible** at kinexfit.com
✅ **Webhook is configured** in Stripe Dashboard
✅ **Enhanced logging is deployed** to track webhook events

---

## Step-by-Step Test Procedure

### Step 1: Check Your Current User Status (BEFORE Test)

Run this command to see your current DynamoDB user data:

```bash
node scripts/check-user-status.mjs alejo@cannashieldct.com
```

**Expected Output:**
```
✅ User found:
────────────────────────────────────────────────────────────
   User ID: <your-user-id>
   Email: alejo@cannashieldct.com
   Name: <your-name>
────────────────────────────────────────────────────────────
   Subscription Tier: free (or current tier)
   Subscription Status: none
────────────────────────────────────────────────────────────
   Stripe Customer ID: ❌ not set (or existing ID)
   Stripe Subscription ID: ❌ not set
────────────────────────────────────────────────────────────
```

**Copy the User ID** - you'll need this to verify the webhook updates the correct user.

---

### Step 2: Clear Your Browser Session

This is **CRITICAL** to avoid session mismatch:

**Option A: Use Incognito/Private Mode**
1. Open an Incognito/Private window
2. Go to **kinexfit.com**

**Option B: Clear Browser Storage**
1. Open DevTools (F12) → Application tab
2. Click "Clear site data" button
3. Refresh the page

---

### Step 3: Log In with Your Test Email

1. Sign in to **kinexfit.com**
2. **Use the same email you checked in Step 1** (e.g., alejo@cannashieldct.com)
3. **Do NOT switch browsers or tabs**

---

### Step 4: Start Monitoring Logs (New Terminal)

Open a **separate terminal** and run this command to monitor webhook events in real-time:

```bash
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --follow --format short | grep -E "\[Webhook|\[resolve"
```

**Keep this running!** You'll see webhook logs as they happen.

---

### Step 5: Initiate Checkout

1. In your browser (still logged in from Step 3), go to the **Subscription/Settings page**
2. Click **"Upgrade to Pro"** (or your desired tier)
3. **Complete the Stripe checkout** with the same email
4. After payment, you'll be redirected back to the app

---

### Step 6: Watch the Webhook Logs

In your monitoring terminal (from Step 4), you should see logs like this:

```
[Webhook:evt_xxx] checkout.session.completed
[Webhook:evt_xxx] Event type: checkout.session.completed
[Webhook:evt_xxx] Metadata: { userId: "your-user-id", tier: "pro" }
[Webhook:evt_xxx] Updating user your-user-id to tier=pro, status=active
[Webhook:evt_xxx] Successfully updated user your-user-id subscription
```

**Good Signs:**
- ✅ `userId` matches the ID from Step 1
- ✅ `tier` matches what you selected
- ✅ "Successfully updated user..." message appears

**Bad Signs:**
- ❌ `userId` doesn't match your user ID → **Session mismatch!**
- ❌ "User not found" errors → **Webhook can't resolve user**
- ❌ No webhook logs at all → **Webhook not reaching server**

---

### Step 7: Check UI Updates

After the webhook fires (within 5-10 seconds):

1. **Refresh the page** (or it may auto-refresh with `session_refresh=true`)
2. Check if the UI shows your new subscription tier
3. You may need to **sign out and sign back in** to force session refresh

---

### Step 8: Verify Database (AFTER Test)

Run the same command from Step 1 again:

```bash
node scripts/check-user-status.mjs alejo@cannashieldct.com
```

**Expected Output (if successful):**
```
✅ User found:
────────────────────────────────────────────────────────────
   User ID: <your-user-id>
   Email: alejo@cannashieldct.com
   Name: <your-name>
────────────────────────────────────────────────────────────
   Subscription Tier: pro ← UPDATED!
   Subscription Status: active ← UPDATED!
────────────────────────────────────────────────────────────
   Stripe Customer ID: cus_xxx ← UPDATED!
   Stripe Subscription ID: sub_xxx ← UPDATED!
────────────────────────────────────────────────────────────
   Subscription Start: <timestamp>
   Subscription End: <timestamp>
────────────────────────────────────────────────────────────
```

---

## Troubleshooting

### Problem A: Webhook Shows Wrong User ID

**Symptom:** Logs show `userId: abc123` but you're logged in as `xyz789`

**Cause:** Stale checkout session from previous login

**Fix:**
1. Sign out completely
2. Clear all browser storage (cookies, local storage, session storage)
3. Close ALL tabs of the app
4. Open fresh Incognito window
5. Sign in and try again

---

### Problem B: "User not found" in Webhook Logs

**Symptom:** Webhook logs show "User not found by any method"

**Cause:** Email mismatch between Stripe and DynamoDB

**Fix:**
```bash
# Check what email is in Stripe
stripe customers retrieve cus_xxx

# Check what email is in DynamoDB
node scripts/check-user-status.mjs your-user-id

# They must match!
```

---

### Problem C: No Webhook Logs at All

**Symptom:** No `[Webhook:...]` logs appear

**Possible Causes:**
1. Webhook not configured in Stripe Dashboard
2. Webhook signing secret mismatch
3. Network/firewall blocking webhook

**Check Stripe Dashboard:**
1. Go to **Developers → Webhooks**
2. Click your webhook endpoint
3. Check recent events - any 4xx/5xx errors?

**Verify Signing Secret:**
```bash
# Check AWS SSM parameter
MSYS_NO_PATHCONV=1 aws ssm get-parameter --name "/spotter/stripe/webhook-secret" --with-decryption --region us-east-1 --query 'Parameter.Value' --output text

# Compare with Stripe Dashboard → Developers → Webhooks → Signing secret
```

---

### Problem D: Database Updated but UI Still Shows "Free"

**Symptom:** DynamoDB shows `tier: pro` but UI shows "Free"

**Cause:** Next-Auth session caching

**Fix:**
1. **Sign out completely**
2. **Sign back in** - this forces a fresh session
3. Or wait 24 hours for session to expire naturally

**Alternative:** Add force refresh logic to the checkout success page (we can implement this if needed).

---

## Quick Debug Commands

### Check current user in database
```bash
node scripts/check-user-status.mjs <email-or-userid>
```

### Watch webhook logs live
```bash
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --follow --format short | grep -E "\[Webhook|\[resolve"
```

### Check recent Stripe events
```bash
stripe events list --limit 10
```

### Check Stripe webhook deliveries
```bash
stripe webhook-endpoints list
```

### Manually trigger webhook test
```bash
stripe trigger checkout.session.completed
```

---

## Success Criteria

✅ Webhook logs show correct user ID (matches your logged-in user)
✅ Webhook logs show "Successfully updated user..." message
✅ DynamoDB shows updated tier, status, and Stripe IDs
✅ UI updates to show new subscription tier (after refresh/re-login)

---

## If All Else Fails: Manual Update

If webhooks aren't working but Stripe has the subscription, you can manually sync:

```bash
# Get Stripe subscription details
stripe subscriptions list --customer cus_xxx

# Manually update DynamoDB (replace with your values)
MSYS_NO_PATHCONV=1 aws dynamodb update-item \
  --table-name spotter-users \
  --key '{"id":{"S":"your-user-id"}}' \
  --update-expression "SET subscriptionTier = :tier, subscriptionStatus = :status, stripeCustomerId = :custId, stripeSubscriptionId = :subId" \
  --expression-attribute-values '{
    ":tier":{"S":"pro"},
    ":status":{"S":"active"},
    ":custId":{"S":"cus_xxx"},
    ":subId":{"S":"sub_xxx"}
  }' \
  --region us-east-1
```

Then sign out and back in to refresh the session.
