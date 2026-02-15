# Stripe Live Mode Setup Guide

## Current Issue

Your production site is using **TEST mode** Stripe keys (`sk_test_...`), which means:
- Purchases create test subscriptions (not real charges)
- Database updates may fail or not work correctly
- Users can't actually subscribe

## Solution: Switch to Live Mode

### Step 1: Get Live Stripe Keys

1. Go to https://dashboard.stripe.com/apikeys
2. **Toggle to "Live mode"** (switch in top right corner - should be red/orange)
3. Copy these keys:
   - **Secret key** (`sk_live_...`)
   - **Publishable key** (`pk_live_...`)

### Step 2: Create or Verify Live Mode Products

1. Go to https://dashboard.stripe.com/products (make sure you're in Live mode)
  2. Check if your products exist. If not, create them:
    - **Core**: $8.99/month
    - **Pro**: $13.99/month
    - **Elite**: $24.99/month
3. Copy the **Price IDs** for each product (starts with `price_...`)

### Step 3: Configure Live Webhook

1. Go to https://dashboard.stripe.com/webhooks (Live mode)
2. Click **+ Add endpoint**
3. Enter endpoint URL: `https://kinexfit.com/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the webhook signing secret** (`whsec_...`)

### Step 4: Update AWS with Live Keys

1. Open [scripts/update-stripe-to-live.ps1](scripts/update-stripe-to-live.ps1)
2. Replace the placeholder values with your actual LIVE keys:
   ```powershell
   $STRIPE_SECRET_KEY = "sk_live_YOUR_ACTUAL_KEY"
   $STRIPE_PUBLISHABLE_KEY = "pk_live_YOUR_ACTUAL_KEY"
   $STRIPE_WEBHOOK_SECRET = "whsec_YOUR_WEBHOOK_SECRET"
   $STRIPE_PRICE_CORE = "price_YOUR_CORE_ID"
   $STRIPE_PRICE_PRO = "price_YOUR_PRO_ID"
   $STRIPE_PRICE_ELITE = "price_YOUR_ELITE_ID"
   ```
3. Run the script:
   ```powershell
   .\scripts\update-stripe-to-live.ps1
   ```

### Step 5: Restart Production Service

```bash
MSYS_NO_PATHCONV=1 aws ecs update-service --cluster SpotterCluster --service spotter-app --force-new-deployment --region us-east-1
```

This will:
- Pull the new environment variables from SSM
- Restart the service with live Stripe keys
- Start accepting real payments

### Step 6: Test

1. Wait ~2 minutes for service to restart
2. Go to your production site
3. Make a test purchase with a real card (or use Stripe test card `4242 4242 4242 4242` in test mode first)
4. Check webhook logs:
   ```bash
   MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --follow --format short
   ```

## Verification Checklist

- [ ] Stripe dashboard shows "Live" mode (red indicator)
- [ ] Copied live secret key (`sk_live_...`)
- [ ] Copied live publishable key (`pk_live_...`)
- [ ] Created/verified live mode products
- [ ] Copied live price IDs
- [ ] Created live webhook endpoint
- [ ] Copied webhook signing secret (`whsec_...`)
- [ ] Updated script with all values
- [ ] Ran update script
- [ ] Restarted ECS service
- [ ] Tested checkout flow

## Important Notes

### Test vs Live Mode

- **Test mode** (`sk_test_`): Fake transactions, test cards only
- **Live mode** (`sk_live_`): Real transactions, real credit cards

### Local Testing

To test webhooks locally with Stripe CLI:

```bash
# Use test keys in .env.local for local development
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

The CLI secret shown when you run this command should match your local `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Cost Consideration

- Stripe charges **2.9% + $0.30 per transaction** for live payments
- Your first $1M in revenue has no platform fees
- Test as much as possible in test mode before going live
