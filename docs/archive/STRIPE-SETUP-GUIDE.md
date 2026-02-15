# Stripe Setup Guide - Create Products & Prices

Your Stripe account has NO active prices configured. Follow these steps to set up your subscription products:

## Step 1: Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Click **"+ Add Product"** button

### Create 3 Products:

#### Product 1: Kinex Fit Core
- **Name:** Kinex Fit Core
- **Description:** 3 OCR scans/week, 5 Instagram saves/week, unlimited workouts, 10 AI requests/month
- **Pricing:**
  - Type: **Recurring**
  - Price: **$7.99**
  - Billing period: **Monthly**
  - Currency: **USD**
- Click **Save product**
- **COPY THE PRICE ID** (starts with `price_`)

#### Product 2: Kinex Fit Pro
- **Name:** Kinex Fit Pro
- **Description:** 5 OCR scans/week, 7 Instagram saves/week, unlimited workouts, 30 AI requests/month, advanced analytics
- **Pricing:**
  - Type: **Recurring**
  - Price: **$14.99**
  - Billing period: **Monthly**
  - Currency: **USD**
- Click **Save product**
- **COPY THE PRICE ID** (starts with `price_`)

#### Product 3: Kinex Fit Elite
- **Name:** Kinex Fit Elite
- **Description:** 10 OCR scans/week, 12 Instagram saves/week, unlimited workouts, 100 AI requests/month, priority support
- **Pricing:**
  - Type: **Recurring**
  - Price: **$34.99**
  - Billing period: **Monthly**
  - Currency: **USD**
- Click **Save product**
- **COPY THE PRICE ID** (starts with `price_`)

## Step 2: Update .env.local

After creating the products, update your `.env.local` file with the NEW price IDs:

```env
# Stripe Price IDs (Test Mode) - UPDATE THESE WITH YOUR NEW PRICE IDs
STRIPE_PRICE_CORE=price_YOUR_CORE_PRICE_ID_HERE
STRIPE_PRICE_PRO=price_YOUR_PRO_PRICE_ID_HERE
STRIPE_PRICE_ELITE=price_YOUR_ELITE_PRICE_ID_HERE

# Client-side accessible Stripe price IDs (required for browser)
NEXT_PUBLIC_STRIPE_PRICE_CORE=price_YOUR_CORE_PRICE_ID_HERE
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_YOUR_PRO_PRICE_ID_HERE
NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_YOUR_ELITE_PRICE_ID_HERE
```

## Step 3: Setup Webhook (for local testing)

### Option A: Using Stripe CLI (Recommended for Development)

```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local dev server
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

The CLI will give you a webhook secret like `whsec_xxxxx`. Update your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_CLI_SECRET_HERE
```

### Option B: Create Webhook Endpoint (for Production)

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"+ Add endpoint"**
3. **Endpoint URL:** `https://your-domain.com/api/stripe/webhook`
4. **Select events to listen to:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** and update `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

## Step 4: Restart Your Dev Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 5: Test the Integration

1. Sign up with a new account (or use dev login)
2. Navigate to `/subscription`
3. Click "Subscribe to Core"
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
5. Complete checkout
6. Verify your subscription tier updates in the app

## Step 6: Verify Everything Works

Run the verification script:

```bash
npx tsx scripts/verify-stripe-prices.ts
```

You should see ✅ for all three tiers!

## Common Test Cards

- **Success:** `4242 4242 4242 4242`
- **Payment fails:** `4000 0000 0000 0341`
- **Requires authentication:** `4000 0025 0000 3155`

## Troubleshooting

### Issue: "No such price" error
**Solution:** The price IDs in .env.local don't match Stripe. Double-check you copied the correct price IDs from Stripe Dashboard.

### Issue: Webhook not receiving events
**Solution:**
- For local dev: Make sure `stripe listen` is running
- For production: Verify webhook URL is correct and accessible
- Check webhook logs in Stripe Dashboard

### Issue: Subscription not updating in app
**Solution:**
1. Check webhook is receiving events (Stripe Dashboard → Webhooks)
2. Check your server logs for webhook errors
3. Verify STRIPE_WEBHOOK_SECRET is correct
4. Try logging out and back in to refresh session

## Production Deployment

When ready for production:

1. Switch to **Live mode** in Stripe Dashboard (toggle in top right)
2. Create the same 3 products in Live mode
3. Copy the LIVE price IDs
4. Update production environment variables with `sk_live_`, `pk_live_`, and live price IDs
5. Create a new webhook endpoint for your production domain
6. Update production STRIPE_WEBHOOK_SECRET

---

Need help? The full Stripe docs are at: https://stripe.com/docs
