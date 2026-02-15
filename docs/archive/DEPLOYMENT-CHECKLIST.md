# 🚀 Complete Deployment Checklist

## Pre-Deployment: Stripe Setup (10 minutes)

### 1. Create Stripe Products
- [ ] Go to https://dashboard.stripe.com/test/products
- [ ] Create "Kinex Fit Core" with two prices:
  - [ ] Monthly: $8.99/month
  - [ ] Annual: $69.99/year
- [ ] Create "Kinex Fit Pro" with two prices:
  - [ ] Monthly: $13.99/month
  - [ ] Annual: $109.99/year
- [ ] Create "Kinex Fit Elite" with two prices:
  - [ ] Monthly: $24.99/month
  - [ ] Annual: $199.99/year
- [ ] **IMPORTANT:** Copy the PRICE IDs (start with `price_`), NOT product IDs (start with `prod_`)

### 2. Update Local Environment
- [ ] Open `.env.local`
- [ ] Replace these 12 lines with your PRICE IDs from Stripe:
  ```env
  # Monthly prices
  STRIPE_PRICE_CORE=price_xxxxx
  STRIPE_PRICE_PRO=price_xxxxx
  STRIPE_PRICE_ELITE=price_xxxxx
  NEXT_PUBLIC_STRIPE_PRICE_CORE=price_xxxxx
  NEXT_PUBLIC_STRIPE_PRICE_PRO=price_xxxxx
  NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_xxxxx

  # Annual prices
  STRIPE_PRICE_CORE_ANNUAL=price_xxxxx
  STRIPE_PRICE_PRO_ANNUAL=price_xxxxx
  STRIPE_PRICE_ELITE_ANNUAL=price_xxxxx
  NEXT_PUBLIC_STRIPE_PRICE_CORE_ANNUAL=price_xxxxx
  NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=price_xxxxx
  NEXT_PUBLIC_STRIPE_PRICE_ELITE_ANNUAL=price_xxxxx
  ```

### 3. Setup Stripe Webhook for Production
- [ ] Go to https://dashboard.stripe.com/test/webhooks
- [ ] Click "+ Add endpoint"
- [ ] Endpoint URL: `https://kinexfit.com/api/stripe/webhook`
- [ ] Select these 6 events:
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.created`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
  - ✅ `invoice.payment_succeeded`
  - ✅ `invoice.payment_failed`
- [ ] Click "Add endpoint"
- [ ] Copy the "Signing secret" (starts with `whsec_`)
- [ ] Update `.env.local`:
  ```env
  STRIPE_WEBHOOK_SECRET=whsec_xxxxx
  ```

### 4. Verify Configuration
```bash
# Verify Stripe connection and price IDs
npx tsx scripts/verify-stripe-prices.ts

# Should show ✅ for all three tiers
```

## AWS Deployment Steps

### 5. Update AWS SSM Parameters
```bash
# Windows (PowerShell):
.\scripts\update-aws-stripe-params.ps1

# Mac/Linux:
bash scripts/update-aws-stripe-params.sh
```

This uploads your Stripe keys and price IDs to AWS Systems Manager.

### 6. Build and Push Docker Image
```bash
# Build the image
docker build -t spotter-app .

# Tag it for ECR
docker tag spotter-app:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

### 7. Update ECS Service
```bash
# Force new deployment with updated image
aws ecs update-service \
  --cluster spotter-cluster \
  --service spotter-service \
  --force-new-deployment \
  --region us-east-1
```

### 8. Monitor Deployment
```bash
# Watch the deployment
aws ecs describe-services \
  --cluster spotter-cluster \
  --services spotter-service \
  --region us-east-1

# Check logs
aws logs tail /ecs/spotter-app --follow --region us-east-1
```

## Post-Deployment Testing

### 9. Test the Application
- [ ] Visit https://kinexfit.com
- [ ] Sign up with Google or Facebook
- [ ] Navigate to `/subscription`
- [ ] Toggle between Monthly and Annual billing
- [ ] Click "Upgrade" on Core tier (annual recommended)
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete checkout
- [ ] Verify you're redirected back to /subscription with success message
- [ ] Check that your tier updated (should show "Current Plan" badge)

### 10. Verify Webhook
- [ ] Go to https://dashboard.stripe.com/test/webhooks
- [ ] Click on your webhook endpoint
- [ ] Click "Send test webhook"
- [ ] Select "checkout.session.completed"
- [ ] Verify response is 200 OK
- [ ] Check that webhook logs show success

### 11. Test Subscription Flow
- [ ] Test upgrading from Core to Pro
- [ ] Test switching between monthly and annual billing
- [ ] Test accessing billing portal from "Manage Subscription" button
- [ ] Test canceling subscription
- [ ] Verify Instagram import quotas match subscription tier

## Troubleshooting

### Issue: "No such price" error
```bash
# Verify price IDs are correct
npx tsx scripts/list-all-stripe-products.ts

# Should show your 3 products with their price IDs
# Copy the correct price_ IDs and update .env.local
```

### Issue: Webhook not receiving events
1. Check webhook URL is correct: `https://kinexfit.com/api/stripe/webhook`
2. Verify webhook secret in AWS SSM matches Stripe Dashboard
3. Check app logs: `aws logs tail /ecs/spotter-app --follow`

### Issue: Subscription not updating in app
1. Check webhook logs in Stripe Dashboard
2. Look for `[Webhook]` prefixed messages in app logs
3. Verify `STRIPE_WEBHOOK_SECRET` is correct in AWS
4. Force session refresh by logging out and back in

### Issue: User details reverting to "test test"
This was fixed! But if it happens:
1. Clear browser cookies
2. Log out and log back in
3. Check that user data exists in DynamoDB

## Quick Commands Reference

```bash
# Verify Stripe setup
npx tsx scripts/test-stripe-connection.ts
npx tsx scripts/verify-stripe-prices.ts

# List all products/prices
npx tsx scripts/list-all-stripe-products.ts

# Update AWS parameters
.\scripts\update-aws-stripe-params.ps1  # Windows
bash scripts/update-aws-stripe-params.sh  # Mac/Linux

# Deploy to AWS
docker build -t spotter-app .
docker tag spotter-app:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
aws ecs update-service --cluster spotter-cluster --service spotter-service --force-new-deployment --region us-east-1

# Monitor
aws logs tail /ecs/spotter-app --follow --region us-east-1
```

## Production Checklist (When Ready for Real Payments)

- [ ] Switch Stripe to Live mode (toggle in dashboard)
- [ ] Create same 3 products in Live mode
- [ ] Get new Live price IDs and webhook secret
- [ ] Update production env vars with `sk_live_` keys
- [ ] Create new webhook for production domain
- [ ] Test with real card in live mode
- [ ] Enable Stripe Radar for fraud prevention
- [ ] Setup billing alerts in Stripe

---

**Important URLs:**
- App: https://kinexfit.com
- Stripe Dashboard: https://dashboard.stripe.com/test
- AWS Console: https://console.aws.amazon.com/ecs

**Support:**
- Stripe Docs: https://stripe.com/docs
- Next.js Docs: https://nextjs.org/docs
- AWS ECS Docs: https://docs.aws.amazon.com/ecs
