# Stripe Quick Start - 5 Minute Setup

Your Stripe account is connected ✅ but you need to create products. Follow these exact steps:

## Step 1: Create Products (3 minutes)

Go to: https://dashboard.stripe.com/test/products

Click **"+ Add product"** and create these 3 products:

### Product 1: Kinex Fit Core
```
Name: Kinex Fit Core
Description: (optional) Perfect for individuals starting their fitness journey
Price: $7.99
Billing: Monthly
```
**After saving, click on the product → copy the PRICE ID (starts with `price_`)**

### Product 2: Kinex Fit Pro
```
Name: Kinex Fit Pro
Description: (optional) Advanced features for serious athletes
Price: $14.99
Billing: Monthly
```
**Copy the PRICE ID**

### Product 3: Kinex Fit Elite
```
Name: Kinex Fit Elite
Description: (optional) Complete fitness platform with AI and priority support
Price: $34.99
Billing: Monthly
```
**Copy the PRICE ID**

## Step 2: Update .env.local (1 minute)

Replace BOTH sets of IDs in your `.env.local`:

```env
# Stripe Price IDs (Test Mode) - REPLACE WITH YOUR PRICE IDs
STRIPE_PRICE_CORE=price_YOUR_CORE_ID_HERE
STRIPE_PRICE_PRO=price_YOUR_PRO_ID_HERE
STRIPE_PRICE_ELITE=price_YOUR_ELITE_ID_HERE

# Client-side accessible (SAME IDs as above)
NEXT_PUBLIC_STRIPE_PRICE_CORE=price_YOUR_CORE_ID_HERE
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_YOUR_PRO_ID_HERE
NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_YOUR_ELITE_ID_HERE
```

## Step 3: Setup Production Webhook (1 minute)

Go to: https://dashboard.stripe.com/test/webhooks

1. Click **"+ Add endpoint"**
2. **Endpoint URL:** `https://kinexfit.com/api/stripe/webhook`
3. **Select events:**
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
4. Click **Add endpoint**
5. **Copy the "Signing secret"** (starts with `whsec_`)
6. Update `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SIGNING_SECRET_HERE
   ```

## Step 4: Test Locally (Optional)

```bash
# Restart dev server
npm run dev

# In browser:
# 1. Sign up or dev login
# 2. Go to /subscription
# 3. Click Subscribe to Core
# 4. Use test card: 4242 4242 4242 4242
```

## Step 5: Deploy to AWS

Your app needs these environment variables in AWS:

### Required Stripe Environment Variables:
```
STRIPE_SECRET_KEY=sk_test_[YOUR_STRIPE_SECRET_KEY]
STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR_STRIPE_PUBLISHABLE_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_PRODUCTION_WEBHOOK_SECRET]
STRIPE_PRICE_CORE=price_[YOUR_CORE_PRICE_ID]
STRIPE_PRICE_PRO=price_[YOUR_PRO_PRICE_ID]
STRIPE_PRICE_ELITE=price_[YOUR_ELITE_PRICE_ID]
NEXT_PUBLIC_STRIPE_PRICE_CORE=price_[YOUR_CORE_PRICE_ID]
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_[YOUR_PRO_PRICE_ID]
NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_[YOUR_ELITE_PRICE_ID]
```

## Verification Commands

After setup, run these to verify:

```bash
# Test Stripe connection
npx tsx scripts/test-stripe-connection.ts

# List all products
npx tsx scripts/list-all-stripe-products.ts

# Verify price IDs
npx tsx scripts/verify-stripe-prices.ts
```

## Quick Test Checklist

- [ ] Created 3 products in Stripe Dashboard
- [ ] Copied price IDs to .env.local (6 places total)
- [ ] Created webhook endpoint for kinexfit.com
- [ ] Copied webhook signing secret to .env.local
- [ ] Restarted dev server (if testing locally)
- [ ] Added all Stripe env vars to AWS deployment

## Test Cards

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Auth required:** `4000 0025 0000 3155`

Any expiry date in the future, any CVC, any ZIP.

---

**Production Note:** When you're ready for real payments, create these same products in **Live mode** (toggle in Stripe Dashboard top-right), and update your production env vars with `sk_live_` keys and live price IDs.
